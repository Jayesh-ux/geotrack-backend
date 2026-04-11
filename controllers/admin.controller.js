// controllers/admin.controller.js - PART 1
// UPDATED: All queries now filter by company_id
// Super admins can view all companies, regular admins only their company

import { pool } from "../db.js";
import bcrypt from "bcryptjs";

export const getAllClients = async (req, res) => {
  const { status, search, page = 1, limit = 1000 } = req.query;
  const offset = (page - 1) * limit;

  // ✅ UPDATED: Add company_id filter (unless super admin)
  let query = "SELECT * FROM clients WHERE 1=1";
  const params = [];
  let paramCount = 0;

  // Super admin can view all companies, regular admin only their company
  if (!req.isSuperAdmin) {
    paramCount++;
    query += ` AND company_id = $${paramCount}`;
    params.push(req.companyId);
  }

  if (status) {
    paramCount++;
    query += ` AND status = $${paramCount}`;
    params.push(status);
  }

  if (search) {
    paramCount++;
    query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
    params.push(`%${search}%`);
  }

  query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(parseInt(limit), parseInt(offset));

  const result = await pool.query(query, params);
  
  // ✅ UPDATED: Add company_id filter to count query
  let countQuery = "SELECT COUNT(*) FROM clients WHERE 1=1";
  const countParams = [];
  let countParamCount = 0;

  if (!req.isSuperAdmin) {
    countParamCount++;
    countQuery += ` AND company_id = $${countParamCount}`;
    countParams.push(req.companyId);
  }

  if (status) {
    countParamCount++;
    countQuery += ` AND status = $${countParamCount}`;
    countParams.push(status);
  }

  if (search) {
    countParamCount++;
    countQuery += ` AND (name ILIKE $${countParamCount} OR email ILIKE $${countParamCount})`;
    countParams.push(`%${search}%`);
  }

  const countResult = await pool.query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].count);

  console.log(`✅ Admin fetched ${result.rows.length} clients`);

  res.json({
    clients: result.rows,
    pagination: { 
      page: parseInt(page), 
      limit: parseInt(limit), 
      total, 
      totalPages: Math.ceil(total / limit) 
    }
  });
};

export const getAllUsers = async (req, res) => {
  const { limit = 1000 } = req.query;
  
  // ✅ UPDATED: Add company_id filter (unless super admin)
  let query = `
    SELECT u.id, u.email, u.created_at, u.pincode, u.is_admin, u.is_super_admin, u.is_active,
           u.last_seen, u.battery_percentage, u.current_activity,
           p.full_name, p.department, p.work_hours_start, p.work_hours_end
    FROM users u
    LEFT JOIN profiles p ON u.id = p.user_id
  `;
  const params = [];
  
  if (!req.isSuperAdmin) {
    query += ` WHERE u.company_id = $1`;
    params.push(req.companyId);
  }
  
  query += ` ORDER BY u.created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);
  
  const result = await pool.query(query, params);

  console.log(`✅ Admin fetched ${result.rows.length} users`);

  res.json({ users: result.rows });
};

export const getAnalytics = async (req, res) => {
  // ✅ UPDATED: Add company_id filter to all analytics queries
  const companyFilter = req.isSuperAdmin ? '' : 'AND company_id = $1';
  const params = req.isSuperAdmin ? [] : [req.companyId];

  // Basic client stats
  const clientStats = await pool.query(`
    SELECT 
      COUNT(*) as total_clients,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_clients,
      COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as clients_with_location,
      COUNT(DISTINCT pincode) FILTER (WHERE pincode IS NOT NULL) as unique_pincodes
    FROM clients
    WHERE 1=1 ${companyFilter}
  `, params);

  const userStats = await pool.query(`
    SELECT COUNT(*) as total_users 
    FROM users 
    WHERE 1=1 ${companyFilter}
  `, params);

  const locationStats = await pool.query(`
    SELECT COUNT(*) as total_logs 
    FROM location_logs
    WHERE 1=1 ${companyFilter}
  `, params);

  // Calculate GPS coverage percentage
  const totalClients = parseInt(clientStats.rows[0].total_clients);
  const withCoords = parseInt(clientStats.rows[0].clients_with_location);
  const coveragePercent = totalClients > 0 ? ((withCoords / totalClients) * 100).toFixed(1) : 0;

  // Monthly trends (last 6 months)
  const trendsData = await pool.query(`
    SELECT 
      TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as month,
      COUNT(*) as clients,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
      COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as "withLocation"
    FROM clients
    WHERE created_at >= NOW() - INTERVAL '6 months'
    ${companyFilter}
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY DATE_TRUNC('month', created_at)
  `, params);

  // Top 5 areas by client count
  const topAreas = await pool.query(`
    SELECT 
      pincode as area,
      COUNT(*) as clients
    FROM clients
    WHERE pincode IS NOT NULL
    ${companyFilter}
    GROUP BY pincode
    ORDER BY clients DESC
    LIMIT 5
  `, params);

  // User leaderboard
  const userLeaderboard = await pool.query(`
    SELECT
      u.id,
      COALESCE(p.full_name, u.email) AS name,
      COUNT(DISTINCT c.id) AS clients_created,
      COUNT(DISTINCT m.id) AS meetings_held
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    LEFT JOIN clients c ON c.created_by = u.id ${!req.isSuperAdmin ? 'AND c.company_id = $1' : ''}
    LEFT JOIN meetings m ON m.user_id = u.id ${!req.isSuperAdmin ? 'AND m.company_id = $1' : ''}
    WHERE u.is_admin = false
    ${!req.isSuperAdmin ? 'AND u.company_id = $1' : ''}
    GROUP BY u.id, p.full_name, u.email
    ORDER BY meetings_held DESC, clients_created DESC
    LIMIT 5
  `, params);

  // Recent activity stats (last 30 days)
  const recentActivity = await pool.query(`
    SELECT
      (SELECT COUNT(*) 
       FROM meetings 
       WHERE created_at >= NOW() - INTERVAL '30 days'
       ${companyFilter}) AS meetings_last_month,

      (SELECT COUNT(*) 
       FROM trip_expenses 
       WHERE created_at >= NOW() - INTERVAL '30 days'
       ${companyFilter}) AS expenses_last_month,

      (SELECT COUNT(*) 
       FROM clients 
       WHERE created_at >= NOW() - INTERVAL '30 days'
       ${companyFilter}) AS new_clients_last_month
  `, params);

  // Inactive clients (no meetings in 30 days)
  const inactiveClients = await pool.query(`
    SELECT COUNT(*) as inactive_count
    FROM clients c
    WHERE c.status = 'active'
      ${companyFilter}
      AND NOT EXISTS (
        SELECT 1 FROM meetings m 
        WHERE m.client_id = c.id 
        AND m.created_at >= NOW() - INTERVAL '30 days'
      )
  `, params);

  console.log("✅ Admin analytics fetched successfully");

  res.json({
    stats: {
      totalClients: totalClients,
      activeClients: parseInt(clientStats.rows[0].active_clients),
      withCoordinates: withCoords,
      uniquePincodes: parseInt(clientStats.rows[0].unique_pincodes),
      totalUsers: parseInt(userStats.rows[0].total_users),
      totalLogs: parseInt(locationStats.rows[0].total_logs),
      coordinatesCoverage: parseFloat(coveragePercent),
      inactiveClients: parseInt(inactiveClients.rows[0].inactive_count),
      meetingsLastMonth: parseInt(recentActivity.rows[0].meetings_last_month || 0),
      expensesLastMonth: parseInt(recentActivity.rows[0].expenses_last_month || 0),
      newClientsLastMonth: parseInt(recentActivity.rows[0].new_clients_last_month || 0)
    },
    trends: trendsData.rows,
    distribution: topAreas.rows,
    leaderboard: userLeaderboard.rows
  });
};

export const getDashboardStats = async (req, res) => {
  const companyFilter = req.isSuperAdmin ? '' : 'AND company_id = $1';
  const params = req.isSuperAdmin ? [] : [req.companyId];

  try {
    const statsQuery = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE is_admin = false ${companyFilter}) as total_agents,
        (SELECT COUNT(*) FROM users WHERE is_admin = false AND last_seen > NOW() - INTERVAL '15 minutes' ${companyFilter}) as active_agents,
        (SELECT COUNT(*) FROM clients WHERE 1=1 ${companyFilter}) as total_clients,
        (SELECT COUNT(*) FROM clients WHERE latitude IS NOT NULL AND longitude IS NOT NULL ${companyFilter}) as gps_verified,
        (SELECT COUNT(DISTINCT client_id) FROM meetings WHERE 1=1 ${companyFilter}) as visited_clients,
        (SELECT COUNT(*) FROM clients WHERE (latitude IS NULL OR longitude IS NULL) ${companyFilter}) as hidden_clients
    `, params);

    const { active_agents, total_clients, gps_verified, visited_clients, hidden_clients } = statsQuery.rows[0];
    
    const total = parseInt(total_clients);
    const gpsVerifiedPercent = total > 0 ? Math.round((parseInt(gps_verified) / total) * 100) : 0;
    const coveragePercent = total > 0 ? Math.round((parseInt(visited_clients) / total) * 100) : 0;

    res.json({
      activeAgents: parseInt(active_agents),
      totalClients: total,
      gpsVerified: gpsVerifiedPercent,
      coverage: coveragePercent,
      hiddenClients: parseInt(hidden_clients)
    });
  } catch (err) {
    console.error("❌ Error fetching dashboard stats:", err);
    res.status(500).json({ error: "InternalServerError" });
  }
};

export const getUserLocationLogs = async (req, res) => {
  const { page = 1, limit = 200 } = req.query;
  const offset = (page - 1) * limit;
  const userId = req.params.userId;

  console.log(`📊 Fetching logs for user ${userId}, admin company: ${req.companyId}, isSuperAdmin: ${req.isSuperAdmin}`);

  // ✅ Verify user belongs to admin's company (unless super admin)
  if (!req.isSuperAdmin) {
    const userCheck = await pool.query(
      "SELECT id FROM users WHERE id = $1 AND company_id = $2",
      [userId, req.companyId]
    );
    
    if (userCheck.rows.length === 0) {
      console.log(`❌ User ${userId} not found in company ${req.companyId}`);
      return res.status(404).json({ error: "UserNotFound" });
    }
  }

  // ✅ Support "all" users for aggregate admin view
  let query, params, countQuery, countParams;
  const isAggregate = userId === "all";
  
  if (req.isSuperAdmin) {
    // Super admin: No company filter
    query = `SELECT m.id, m.latitude, m.longitude, m.accuracy, m.activity, m.battery, m.notes, m.pincode, m.timestamp,
                    p.full_name as "agentName"
             FROM location_logs m
             LEFT JOIN profiles p ON m.user_id = p.user_id
             WHERE 1=1 ${isAggregate ? '' : 'AND m.user_id = $1'}
             ORDER BY m.timestamp DESC
             LIMIT $${isAggregate ? 1 : 2} OFFSET $${isAggregate ? 2 : 3}`;
    params = isAggregate ? [parseInt(limit), parseInt(offset)] : [userId, parseInt(limit), parseInt(offset)];
    
    countQuery = `SELECT COUNT(*) FROM location_logs WHERE 1=1 ${isAggregate ? '' : 'AND user_id = $1'}`;
    countParams = isAggregate ? [] : [userId];
    
  } else {
    // Regular admin: Include company filter
    query = `SELECT m.id, m.latitude, m.longitude, m.accuracy, m.activity, m.battery, m.notes, m.pincode, m.timestamp,
                    p.full_name as "agentName"
             FROM location_logs m
             LEFT JOIN profiles p ON m.user_id = p.user_id
             WHERE m.company_id = $1 ${isAggregate ? '' : 'AND m.user_id = $2'}
             ORDER BY m.timestamp DESC
             LIMIT $${isAggregate ? 2 : 3} OFFSET $${isAggregate ? 3 : 4}`;
    params = isAggregate ? [req.companyId, parseInt(limit), parseInt(offset)] : [req.companyId, userId, parseInt(limit), parseInt(offset)];
    
    countQuery = `SELECT COUNT(*) FROM location_logs WHERE company_id = $1 ${isAggregate ? '' : 'AND user_id = $2'}`;
    countParams = isAggregate ? [req.companyId] : [req.companyId, userId];
  }

  console.log(`🔍 Query params:`, params);

  const result = await pool.query(query, params);
  const countResult = await pool.query(countQuery, countParams);

  console.log(`✅ Fetched ${result.rows.length} logs for user ${userId}`);

  res.json({
    logs: result.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(countResult.rows[0].count / limit),
    }
  });
};
export const getClockStatus = async (req, res) => {
  const { userId } = req.params;

  // ✅ UPDATED: Verify user belongs to admin's company (unless super admin)
  if (!req.isSuperAdmin) {
    const userCheck = await pool.query(
      "SELECT id FROM users WHERE id = $1 AND company_id = $2",
      [userId, req.companyId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: "UserNotFound" });
    }
  }

  // ✅ UPDATED: Add company_id filter
  const companyFilter = req.isSuperAdmin ? '' : 'AND company_id = $2';
  const params = [userId];
  if (!req.isSuperAdmin) {
    params.push(req.companyId);
  }

  const result = await pool.query(`
    SELECT timestamp
    FROM location_logs
    WHERE user_id = $1
    ${companyFilter}
    ORDER BY timestamp DESC
    LIMIT 1
  `, params);

  if (result.rows.length === 0) {
    return res.json({ clocked_in: false, last_seen: null });
  }

  const lastSeen = new Date(result.rows[0].timestamp);
  const now = new Date();
  const diffMinutes = (now - lastSeen) / (1000 * 60);
  
  const isActive = diffMinutes <= 5;

  res.json({
    clocked_in: isActive,
    last_seen: lastSeen.toISOString()
  });
};

export const getExpensesSummary = async (req, res) => {
  // ✅ UPDATED: Add company_id filter
  const companyFilter = req.isSuperAdmin ? '' : 'WHERE u.company_id = $1';
  const params = req.isSuperAdmin ? [] : [req.companyId];

  const result = await pool.query(`
    SELECT 
      u.id,
      COALESCE(SUM(e.amount_spent), 0) AS total_expense
    FROM users u
    LEFT JOIN trip_expenses e ON e.user_id = u.id ${!req.isSuperAdmin ? 'AND e.company_id = $1' : ''}
    ${companyFilter}
    GROUP BY u.id
    ORDER BY u.id
  `, params);

  console.log(`✅ Fetched expense summary for ${result.rows.length} users`);

  res.json({ summary: result.rows });
};
export const getUserMeetings = async (req, res) => {
  const userId = req.params.userId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  // ✅ UPDATED: Verify user belongs to admin's company (unless super admin)
  if (!req.isSuperAdmin) {
    const userCheck = await pool.query(
      "SELECT id FROM users WHERE id = $1 AND company_id = $2",
      [userId, req.companyId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: "UserNotFound" });
    }
  }

  // ✅ Support "all" users for aggregate admin view
  const isAggregate = userId === "all";
  let query, params, countQuery, countParams;

  if (req.isSuperAdmin) {
    // Super admin: No company filter
    query = `SELECT 
               m.id, m.user_id AS "userId", m.client_id AS "clientId",
               m.start_time AS "startTime", m.end_time AS "endTime",
               m.status, m.comments, m.attachments,
               c.name AS "clientName", c.address AS "clientAddress",
               p.full_name AS "agentName"
             FROM meetings m
             LEFT JOIN clients c ON m.client_id = c.id
             LEFT JOIN profiles p ON m.user_id = p.user_id
             WHERE 1=1 ${isAggregate ? '' : 'AND m.user_id = $1'}
             ORDER BY m.start_time DESC
             LIMIT $${isAggregate ? 1 : 2} OFFSET $${isAggregate ? 2 : 3}`;
    params = isAggregate ? [limit, offset] : [userId, limit, offset];
    
    countQuery = `SELECT COUNT(*) FROM meetings WHERE 1=1 ${isAggregate ? '' : 'AND user_id = $1'}`;
    countParams = isAggregate ? [] : [userId];
    
  } else {
    // Regular admin: Include company filter
    query = `SELECT 
               m.id, m.user_id AS "userId", m.client_id AS "clientId",
               m.start_time AS "startTime", m.end_time AS "endTime",
               m.status, m.comments, m.attachments,
               c.name AS "clientName", c.address AS "clientAddress",
               p.full_name AS "agentName"
             FROM meetings m
             LEFT JOIN clients c ON m.client_id = c.id
             LEFT JOIN profiles p ON m.user_id = p.user_id
             WHERE m.company_id = $1 ${isAggregate ? '' : 'AND m.user_id = $2'}
             ORDER BY m.start_time DESC
             LIMIT $${isAggregate ? 2 : 3} OFFSET $${isAggregate ? 3 : 4}`;
    params = isAggregate ? [req.companyId, limit, offset] : [req.companyId, userId, limit, offset];
    
    countQuery = `SELECT COUNT(*) FROM meetings WHERE company_id = $1 ${isAggregate ? '' : 'AND user_id = $2'}`;
    countParams = isAggregate ? [req.companyId] : [req.companyId, userId];
  }

  const result = await pool.query(query, params);
  const countResult = await pool.query(countQuery, countParams);
  const totalCount = parseInt(countResult.rows[0].count);

  console.log(`Fetched ${result.rows.length} meetings for user ${userId}`);

  res.json({
    meetings: result.rows,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  });
};

// In controllers/admin.controller.js

export const getUserExpenses = async (req, res) => {
  const userId = req.params.userId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  // Verify user belongs to admin's company (unless super admin)
  if (!req.isSuperAdmin) {
    const userCheck = await pool.query(
      "SELECT id FROM users WHERE id = $1 AND company_id = $2",
      [userId, req.companyId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: "UserNotFound" });
    }
  }

  const companyFilter = req.isSuperAdmin ? '' : 'AND company_id = $2';

  const totalResult = await pool.query(
    `SELECT COUNT(*) FROM trip_expenses WHERE user_id = $1 ${companyFilter}`,
    req.isSuperAdmin ? [userId] : [userId, req.companyId]
  );
  const total = parseInt(totalResult.rows[0].count);

  const logsResult = await pool.query(
    `SELECT * FROM trip_expenses
     WHERE user_id = $1
     ${companyFilter}
     ORDER BY travel_date DESC
     LIMIT $${req.isSuperAdmin ? 2 : 3} OFFSET $${req.isSuperAdmin ? 3 : 4}`,
    req.isSuperAdmin ? [userId, limit, offset] : [userId, req.companyId, limit, offset]
  );

  // ✅ Transform and fetch legs
  const transformExpenseRow = (row) => ({
    id: row.id,
    userId: row.user_id,
    tripName: row.trip_name,
    isMultiLeg: row.is_multi_leg || false,
    startLocation: row.start_location,
    endLocation: row.end_location,
    travelDate: row.travel_date,
    distanceKm: row.distance_km,
    transportMode: row.transport_mode,
    amountSpent: row.amount_spent,
    currency: row.currency,
    notes: row.notes,
    receiptUrls: row.receipt_images || [],
    clientId: row.client_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    legs: []
  });

  const transformLegRow = (row) => ({
    id: row.id,
    expenseId: row.expense_id,
    legNumber: row.leg_number,
    startLocation: row.start_location,
    endLocation: row.end_location,
    distanceKm: row.distance_km,
    transportMode: row.transport_mode,
    amountSpent: row.amount_spent,
    notes: row.notes,
    createdAt: row.created_at
  });

  const expenses = logsResult.rows.map(transformExpenseRow);

  // Fetch legs for multi-leg expenses
  for (const expense of expenses) {
    if (expense.isMultiLeg) {
      const legsResult = await pool.query(
        `SELECT * FROM trip_legs WHERE expense_id = $1 ORDER BY leg_number`,
        [expense.id]
      );
      expense.legs = legsResult.rows.map(transformLegRow);
    }
  }

  res.json({
    expenses: expenses,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
};

export const checkAdminStatus = (req, res) => {
  res.json({ 
    isAdmin: req.user.isAdmin || false,
    isSuperAdmin: req.user.isSuperAdmin || false,
    userId: req.user.id,
    email: req.user.email,
    companyId: req.user.companyId
  });
};

// Get single user details
export const getUserDetails = async (req, res) => {
  const { userId } = req.params;

  // ✅ UPDATED: Add company_id filter (unless super admin)
  const companyFilter = req.isSuperAdmin ? '' : 'AND u.company_id = $2';
  const params = [userId];
  if (!req.isSuperAdmin) {
    params.push(req.companyId);
  }

  const result = await pool.query(
    `SELECT u.id, u.email, u.is_admin, u.is_super_admin, u.is_active, u.created_at, u.pincode, u.company_id,
            u.last_seen, u.battery_percentage, u.current_activity,
            p.full_name, p.department, p.work_hours_start, p.work_hours_end,
            c.name as company_name, c.subdomain as company_subdomain
     FROM users u
     LEFT JOIN profiles p ON u.id = p.user_id
     LEFT JOIN companies c ON u.company_id = c.id
     WHERE u.id = $1 ${companyFilter}`,
    params
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "UserNotFound" });
  }

  console.log(`✅ Admin fetched user details: ${userId}`);
  res.json({ user: result.rows[0] });
};

// Create user (admin version)
export const createUser = async (req, res) => {
  const { email, password, fullName, department, workHoursStart, workHoursEnd, isAdmin = false } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: "MissingFields" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "PasswordTooShort" });
  }

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: "EmailAlreadyExists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  
  // ✅ UPDATED: Assign new user to admin's company (super admin can override)
  const targetCompanyId = req.body.companyId || req.companyId;
  
  // ✅ UPDATED: Only super admin can assign to different company
  if (targetCompanyId !== req.companyId && !req.isSuperAdmin) {
    return res.status(403).json({ 
      error: "Forbidden",
      message: "Only super admins can assign users to different companies" 
    });
  }

  // ✅ UPDATED: Only super admin can create admins
  if (isAdmin && !req.isSuperAdmin) {
    return res.status(403).json({ 
      error: "Forbidden",
      message: "Only super admins can create admin users" 
    });
  }

  // ✅ UPDATED: Include company_id in INSERT
  const userResult = await pool.query(
    `INSERT INTO users (email, password, is_admin, company_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, is_admin, company_id, created_at`,
    [email, hashedPassword, isAdmin, targetCompanyId]
  );

  const user = userResult.rows[0];
  
  await pool.query(
    `INSERT INTO profiles (user_id, full_name, department, work_hours_start, work_hours_end)
     VALUES ($1, $2, $3, $4, $5)`,
    [user.id, fullName || null, department || null, workHoursStart || null, workHoursEnd || null]
  );

  console.log(`✅ Admin created user: ${email} (Admin: ${isAdmin})`);
  res.status(201).json({ 
    message: "UserCreated", 
    user: {
      ...user,
      full_name: fullName,
      department
    }
  });
};

// Update user (admin version)
export const updateUser = async (req, res) => {
  const { userId } = req.params;
  const { email, fullName, department, workHoursStart, workHoursEnd, isAdmin, isActive } = req.body;

  // ✅ UPDATED: Verify user belongs to admin's company (unless super admin)
  const companyFilter = req.isSuperAdmin ? '' : 'AND company_id = $2';
  const checkParams = [userId];
  if (!req.isSuperAdmin) {
    checkParams.push(req.companyId);
  }

  const userCheck = await pool.query(
    `SELECT id FROM users WHERE id = $1 ${companyFilter}`,
    checkParams
  );

  if (userCheck.rows.length === 0) {
    return res.status(404).json({ error: "UserNotFound" });
  }

  // ✅ UPDATED: Only super admin can change admin status
  if (isAdmin !== undefined && !req.isSuperAdmin) {
    return res.status(403).json({ 
      error: "Forbidden",
      message: "Only super admins can change admin status" 
    });
  }

  // ✅ FIXED: Update users table — handle ALL fields independently (not gated behind email/isAdmin)
  {
    let query = "UPDATE users SET";
    const params = [];
    let paramCount = 0;

    if (email !== undefined) {
      const emailCheck = await pool.query(
        "SELECT id FROM users WHERE email = $1 AND id != $2",
        [email, userId]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ error: "EmailAlreadyExists" });
      }

      paramCount++;
      query += ` email = $${paramCount}`;
      params.push(email);
    }

    if (isAdmin !== undefined) {
      if (paramCount > 0) query += ",";
      paramCount++;
      query += ` is_admin = $${paramCount}`;
      params.push(isAdmin);
    }

    if (isActive !== undefined) {
      if (paramCount > 0) query += ",";
      paramCount++;
      query += ` is_active = $${paramCount}`;
      params.push(isActive);
    }

    // Only run UPDATE if there are fields to update
    if (paramCount > 0) {
      paramCount++;
      query += ` WHERE id = $${paramCount} RETURNING id, email, is_admin, is_active`;
      params.push(userId);

      await pool.query(query, params);

      // ✅ If user is being disabled, force-logout by clearing all their sessions
      if (isActive === false) {
        await pool.query("DELETE FROM user_sessions WHERE user_id = $1", [userId]);
        console.log(`🔒 Disabled user ${userId} — cleared all sessions`);
      }
    }
  }

  // Update profiles table
  const profileResult = await pool.query(
    `UPDATE profiles 
     SET full_name = COALESCE($1, full_name),
         department = COALESCE($2, department),
         work_hours_start = COALESCE($3, work_hours_start),
         work_hours_end = COALESCE($4, work_hours_end)
     WHERE user_id = $5
     RETURNING *`,
    [fullName, department, workHoursStart, workHoursEnd, userId]
  );

  console.log(`✅ Admin updated user: ${userId}`);
  res.json({ 
    message: "UserUpdated", 
    user: {
      id: userId,
      email: email,
      ...profileResult.rows[0]
    }
  });
};

// Delete user (hard delete)
export const deleteUser = async (req, res) => {
  const { userId } = req.params;

  // ✅ UPDATED: Verify user belongs to admin's company (unless super admin)
  const companyFilter = req.isSuperAdmin ? '' : 'AND company_id = $2';
  const checkParams = [userId];
  if (!req.isSuperAdmin) {
    checkParams.push(req.companyId);
  }

  const userCheck = await pool.query(
    `SELECT id, email FROM users WHERE id = $1 ${companyFilter}`,
    checkParams
  );

  if (userCheck.rows.length === 0) {
    return res.status(404).json({ error: "UserNotFound" });
  }

  // Prevent self-deletion
  if (userId === req.user.id) {
    return res.status(400).json({ error: "CannotDeleteSelf" });
  }

  const userEmail = userCheck.rows[0].email;

  // Hard delete - CASCADE will handle related data
  await pool.query("DELETE FROM users WHERE id = $1", [userId]);

  console.log(`🗑️ Admin deleted user: ${userEmail} (${userId})`);
  res.json({ message: "UserDeleted", email: userEmail });
};

// Reset user password (admin function)
export const resetUserPassword = async (req, res) => {
  const { userId } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "PasswordTooShort" });
  }

  // ✅ UPDATED: Verify user belongs to admin's company (unless super admin)
  const companyFilter = req.isSuperAdmin ? '' : 'AND company_id = $2';
  const checkParams = [userId];
  if (!req.isSuperAdmin) {
    checkParams.push(req.companyId);
  }

  const userCheck = await pool.query(
    `SELECT id, email FROM users WHERE id = $1 ${companyFilter}`,
    checkParams
  );

  if (userCheck.rows.length === 0) {
    return res.status(404).json({ error: "UserNotFound" });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await pool.query(
    "UPDATE users SET password = $1 WHERE id = $2",
    [hashedPassword, userId]
  );

  // Invalidate all sessions for this user
  await pool.query("DELETE FROM user_sessions WHERE user_id = $1", [userId]);

  console.log(`🔑 Admin reset password for user: ${userCheck.rows[0].email}`);
  res.json({ message: "PasswordReset", email: userCheck.rows[0].email });
};

// ============================================
// TEAM LOCATIONS (For Android Map)
// ============================================
export const getTeamLocations = async (req, res) => {
  // Get all users in the admin's company with their latest location
  const locationQuery = `
    SELECT 
      u.id, 
      u.email, 
      p.full_name as "fullName",
      u.battery_percentage as battery,
      u.current_activity as activity,
      u.last_seen as timestamp,
      l.latitude,
      l.longitude,
      l.accuracy
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    LEFT JOIN LATERAL (
      SELECT latitude, longitude, accuracy 
      FROM location_logs 
      WHERE user_id = u.id 
      ORDER BY timestamp DESC LIMIT 1
    ) l ON true
    WHERE u.is_admin = false
    ${req.isSuperAdmin ? "" : "AND u.company_id = $1"}
    ORDER BY u.last_seen DESC NULLS LAST
  `;
  const locationParams = req.isSuperAdmin ? [] : [req.companyId];
  
  const locResult = await pool.query(locationQuery, locationParams);

  const agents = locResult.rows.map(row => {
    let isActive = false;
    if (row.timestamp) {
      const lastSeen = new Date(row.timestamp);
      const now = new Date();
      if ((now - lastSeen) / (1000 * 60) <= 5) {
        isActive = true;
      }
    }

    return {
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      latitude: row.latitude ? parseFloat(row.latitude) : null,
      longitude: row.longitude ? parseFloat(row.longitude) : null,
      accuracy: row.accuracy ? parseFloat(row.accuracy) : null,
      timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : null,
      activity: row.activity,
      battery: row.battery,
      isActive: true, // Android uses this to check if the account is banned/disabled!
      isOnline: isActive // We can pass the 5-minute online check here
    };
  });

  console.log(`✅ Admin fetched team locations for ${agents.length} agents`);
  res.json({ agents });
};

// ============================================
// CLIENT SERVICES (For Android Admin Panel)
// ============================================
export const getClientServices = async (req, res) => {
  res.json({ services: [] }); // Placeholder for now so the app doesn't crash on 404
};

// ============================================
// UNIFIED JOURNEY REPORT (For Dashboard)
// ============================================
export const getUnifiedJourney = async (req, res) => {
  const { userId } = req.params;
  const { startDate, endDate, page = 1, limit = 500 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Verify user belongs to admin's company (unless super admin)
  if (!req.isSuperAdmin) {
    const userCheck = await pool.query(
      "SELECT id FROM users WHERE id = $1 AND company_id = $2",
      [userId, req.companyId]
    );
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: "UserNotFound" });
    }
  }

  const companyFilter = req.isSuperAdmin ? '' : 'AND company_id = $2';
  const baseParams = req.isSuperAdmin ? [userId] : [userId, req.companyId];
  const dateFilterIdx = baseParams.length + 1;

  // Build date filter
  let dateFilter = '';
  const dateParams = [];
  if (startDate) {
    dateFilter += ` AND timestamp >= $${dateFilterIdx}::date`;
    dateParams.push(startDate);
  }
  if (endDate) {
    dateFilter += ` AND timestamp < ($${dateFilterIdx + dateParams.length}::date + interval '1 day')`;
    dateParams.push(endDate);
  }

  try {
    // 1. Location logs (paginated)
    const logsLimit = parseInt(limit);
    const logsResult = await pool.query(`
      SELECT id, latitude, longitude, accuracy, activity, battery, notes, pincode, timestamp,
             'location' as event_type
      FROM location_logs
      WHERE user_id = $1 ${companyFilter}
      ${dateFilter.replace(/timestamp/g, 'timestamp')}
      ORDER BY timestamp ASC
      LIMIT $${baseParams.length + dateParams.length + 1} OFFSET $${baseParams.length + dateParams.length + 2}
    `, [...baseParams, ...dateParams, logsLimit, offset]);

    // 2. Meetings (with actual status field)
    let meetingDateFilter = dateFilter.replace(/timestamp/g, 'start_time');
    const meetingsResult = await pool.query(`
      SELECT m.id, m.user_id, m.client_id,
             m.start_time, m.end_time,
             m.start_latitude, m.start_longitude, m.start_accuracy,
             m.end_latitude, m.end_longitude, m.end_accuracy,
             m.status, m.comments, m.attachments,
             m.created_at, m.updated_at,
             c.name as client_name, c.address as client_address,
             'meeting' as event_type
      FROM meetings m
      LEFT JOIN clients c ON m.client_id = c.id
      WHERE m.user_id = $1 ${companyFilter.replace('company_id', 'm.company_id')}
      ${meetingDateFilter}
      ORDER BY m.start_time ASC
    `, [...baseParams, ...dateParams]);

    // 3. Trip expenses + legs
    let expenseDateFilter = dateFilter.replace(/timestamp/g, 'travel_date');
    const expensesResult = await pool.query(`
      SELECT id, user_id, trip_name, is_multi_leg,
             start_location, end_location,
             travel_date, distance_km, transport_mode,
             amount_spent, currency, notes,
             receipt_images, client_id,
             created_at, updated_at,
             'expense' as event_type
      FROM trip_expenses
      WHERE user_id = $1 ${companyFilter}
      ${expenseDateFilter}
      ORDER BY travel_date ASC
    `, [...baseParams, ...dateParams]);

    // Fetch legs for multi-leg expenses
    const expensesWithLegs = [];
    for (const expense of expensesResult.rows) {
      const expenseObj = {
        ...expense,
        legs: []
      };
      if (expense.is_multi_leg) {
        const legsResult = await pool.query(
          `SELECT * FROM trip_legs WHERE expense_id = $1 ORDER BY leg_number`,
          [expense.id]
        );
        expenseObj.legs = legsResult.rows;
      }
      expensesWithLegs.push(expenseObj);
    }

    // Build unified timeline with spam filtering
    const timeline = [];
    const MIN_DISTANCE_METERS = 200; // Only keep logs >200m apart
    const MIN_TIME_MINUTES = 5; // Or >5 min apart
    let lastLocationLog = null;

    // Add location events with throttling
    for (const log of logsResult.rows) {
      // Skip duplicate TRAVELING logs - only keep first in a series
      if (log.activity === 'TRAVELING' && lastLocationLog && lastLocationLog.activity === 'TRAVELING') {
        // Check if within 5 min - skip as duplicate
        const timeDiff = new Date(log.timestamp) - new Date(lastLocationLog.timestamp);
        if (timeDiff < MIN_TIME_MINUTES * 60 * 1000) {
          continue; // Skip duplicate TRAVELING log
        }
      }

      // Check distance threshold for non-TRAVELING logs
      if (lastLocationLog && log.activity !== 'TRAVELING') {
        const lat1 = parseFloat(lastLocationLog.latitude);
        const lon1 = parseFloat(lastLocationLog.longitude);
        const lat2 = parseFloat(log.latitude);
        const lon2 = parseFloat(log.longitude);
        
        if (lat1 && lon1 && lat2 && lon2) {
          // ✅ CORRECT Haversine formula
          const R = 6371000; // Earth radius in meters
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const sinDLat2 = Math.sin(dLat / 2);
          const sinDLon2 = Math.sin(dLon / 2);
          const a = sinDLat2 * sinDLat2 + 
                   Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                   sinDLon2 * sinDLon2;
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distanceMeters = R * c;
          
          // Skip if less than 200m from last log AND within 5 min
          const timeDiff = new Date(log.timestamp) - new Date(lastLocationLog.timestamp);
          if (distanceMeters < MIN_DISTANCE_METERS && timeDiff < MIN_TIME_MINUTES * 60 * 1000) {
            continue;
          }
        }
      }

      timeline.push({
        type: 'location',
        timestamp: log.timestamp,
        latitude: parseFloat(log.latitude),
        longitude: parseFloat(log.longitude),
        accuracy: log.accuracy ? parseFloat(log.accuracy) : null,
        details: {
          activity: log.activity,
          battery: log.battery,
          pincode: log.pincode,
          notes: log.notes,
        }
      });
      lastLocationLog = log;
    }

    // Add meeting events (start + end as separate events)
    for (const meeting of meetingsResult.rows) {
      timeline.push({
        type: 'meeting_start',
        timestamp: meeting.start_time,
        latitude: meeting.start_latitude ? parseFloat(meeting.start_latitude) : null,
        longitude: meeting.start_longitude ? parseFloat(meeting.start_longitude) : null,
        accuracy: meeting.start_accuracy ? parseFloat(meeting.start_accuracy) : null,
        details: {
          meetingId: meeting.id,
          clientName: meeting.client_name,
          clientAddress: meeting.client_address,
          status: meeting.status,
          comments: meeting.comments,
        }
      });

      if (meeting.end_time) {
        timeline.push({
          type: 'meeting_end',
          timestamp: meeting.end_time,
          latitude: meeting.end_latitude ? parseFloat(meeting.end_latitude) : null,
          longitude: meeting.end_longitude ? parseFloat(meeting.end_longitude) : null,
          accuracy: meeting.end_accuracy ? parseFloat(meeting.end_accuracy) : null,
          details: {
            meetingId: meeting.id,
            clientName: meeting.client_name,
            status: meeting.status,
            durationMinutes: Math.round((new Date(meeting.end_time) - new Date(meeting.start_time)) / 60000),
          }
        });
      }
    }

    // Add expense events
    for (const expense of expensesWithLegs) {
      timeline.push({
        type: 'expense',
        timestamp: expense.travel_date || expense.created_at,
        latitude: null,
        longitude: null,
        details: {
          expenseId: expense.id,
          tripName: expense.trip_name,
          startLocation: expense.start_location,
          endLocation: expense.end_location,
          distanceKm: expense.distance_km,
          transportMode: expense.transport_mode,
          amountSpent: expense.amount_spent,
          currency: expense.currency,
          isMultiLeg: expense.is_multi_leg,
          legs: expense.legs.map(leg => ({
            legNumber: leg.leg_number,
            startLocation: leg.start_location,
            endLocation: leg.end_location,
            distanceKm: leg.distance_km,
            transportMode: leg.transport_mode,
            amountSpent: leg.amount_spent,
          })),
        }
      });
    }

    // Sort timeline by timestamp
    timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Calculate summary (distance in km)
    let totalDistance = 0;
    for (let i = 1; i < logsResult.rows.length; i++) {
      const prev = logsResult.rows[i - 1];
      const curr = logsResult.rows[i];
      const lat1 = parseFloat(prev.latitude), lon1 = parseFloat(prev.longitude);
      const lat2 = parseFloat(curr.latitude), lon2 = parseFloat(curr.longitude);
      if (lat1 && lon1 && lat2 && lon2) {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const sinDLat2 = Math.sin(dLat / 2);
        const sinDLon2 = Math.sin(dLon / 2);
        const a = sinDLat2 * sinDLat2 + 
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                sinDLon2 * sinDLon2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        totalDistance += R * c;
      }
    }

    const totalExpense = expensesWithLegs.reduce((sum, e) => sum + (parseFloat(e.amount_spent) || 0), 0);
    const meetingCount = meetingsResult.rows.length;
    const completedMeetings = meetingsResult.rows.filter(m => m.status === 'completed' || m.end_time).length;
    const inProgressMeetings = meetingsResult.rows.filter(m => !m.end_time && m.status !== 'cancelled').length;

    console.log(`✅ Unified journey: ${timeline.length} events, ${meetingCount} meetings, ${expensesWithLegs.length} expenses`);

    res.json({
      timeline,
      summary: {
        totalDistance: Math.round(totalDistance * 10) / 10,
        totalExpense,
        meetingCount,
        completedMeetings,
        inProgressMeetings,
        locationPoints: logsResult.rows.length,
        expenseCount: expensesWithLegs.length,
      },
      meetings: meetingsResult.rows,
      expenses: expensesWithLegs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalEvents: timeline.length
      }
    });

  } catch (err) {
    console.error("❌ Error fetching unified journey:", err);
    res.status(500).json({ error: "InternalServerError", message: err.message });
  }
};

// ============================================
// ADMIN DAILY SUMMARY (For Android Admin Dashboard)
// ============================================
export const getAdminDailySummary = async (req, res) => {
  const companyFilter = req.isSuperAdmin ? '' : 'AND company_id = $1';
  const params = req.isSuperAdmin ? [] : [req.companyId];

  try {
    const statsQuery = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE is_admin = false AND last_seen > NOW() - INTERVAL '30 minutes' ${companyFilter}) as active_agents,
        (SELECT COUNT(*) FROM users WHERE is_admin = false AND (last_seen <= NOW() - INTERVAL '30 minutes' OR last_seen IS NULL) ${companyFilter}) as idle_agents,
        (SELECT COUNT(*) FROM meetings WHERE DATE(start_time) = CURRENT_DATE ${companyFilter}) as total_meetings,
        (SELECT COUNT(*) FROM meetings WHERE DATE(start_time) = CURRENT_DATE AND status = 'COMPLETED' ${companyFilter}) as verified_meetings,
        (SELECT COALESCE(SUM(distance_km), 0) FROM trip_expenses WHERE travel_date = CURRENT_DATE ${companyFilter}) as total_distance
    `, params);

    const { active_agents, idle_agents, total_meetings, verified_meetings, total_distance } = statsQuery.rows[0];

    res.json({
      activeAgents: parseInt(active_agents),
      idleAgents: parseInt(idle_agents),
      totalMeetings: parseInt(total_meetings),
      verifiedMeetings: parseInt(verified_meetings),
      totalDistance: parseFloat(total_distance),
      alertsCount: 0
    });
  } catch (err) {
    console.error("❌ Error fetching admin daily summary:", err);
    res.status(500).json({ error: "InternalServerError" });
  }
};

// ============================================
// LIVE AGENTS ONLY (For Android Map)
// ============================================
export const getLiveAgents = async (req, res) => {
  try {
    const locationQuery = `
      SELECT 
        u.id, u.email, p.full_name as "fullName",
        u.battery_percentage as battery, u.current_activity as activity,
        u.last_seen as timestamp, l.latitude, l.longitude, l.accuracy
      FROM users u
      LEFT JOIN profiles p ON p.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT latitude, longitude, accuracy 
        FROM location_logs 
        WHERE user_id = u.id 
        ORDER BY timestamp DESC LIMIT 1
      ) l ON true
      WHERE u.is_admin = false AND u.last_seen > NOW() - INTERVAL '30 minutes'
      ${req.isSuperAdmin ? "" : "AND u.company_id = $1"}
      ORDER BY u.last_seen DESC NULLS LAST
    `;
    const locationParams = req.isSuperAdmin ? [] : [req.companyId];
    const locResult = await pool.query(locationQuery, locationParams);

    const agents = locResult.rows.map(row => ({
        id: row.id,
        email: row.email,
        fullName: row.fullName,
        battery: row.battery,
        activity: row.activity,
        timestamp: row.timestamp,
        latitude: row.latitude,
        longitude: row.longitude,
        accuracy: row.accuracy,
        isActive: true
    }));

    res.json({ agents });
  } catch (err) {
    console.error("❌ Error fetching live agents:", err);
    res.status(500).json({ error: "InternalServerError" });
  }
};

export const selfHealClients = async (req, res) => {
  let healedByLogs = 0;
  let healedByApi = 0;
  let failed = 0;

  try {
    const clientsResult = await pool.query(
      `SELECT id, address FROM clients
       WHERE latitude IS NULL OR longitude IS NULL`
    );
    const clients = clientsResult.rows;
    const total = clients.length;

    for (const client of clients) {
      try {
        const logsResult = await pool.query(
          `SELECT latitude, longitude
           FROM location_logs
           WHERE latitude IS NOT NULL AND longitude IS NOT NULL
           ORDER BY created_at DESC
           LIMIT 1`
        );

        if (logsResult.rows.length > 0) {
          const log = logsResult.rows[0];
          await pool.query(
            `UPDATE clients SET latitude = $1, longitude = $2 WHERE id = $3`,
            [log.latitude, log.longitude, client.id]
          );
          healedByLogs++;
          continue;
        }

        if (client.address) {
          try {
            const { default: axios } = await import('axios');
            const geoResponse = await axios.get(
              `https://maps.googleapis.com/maps/api/geocode/json`,
              {
                params: {
                  address: client.address,
                  key: process.env.GOOGLE_MAPS_API_KEY
                },
                timeout: 5000
              }
            );

            if (
              geoResponse.data.status === 'OK' &&
              geoResponse.data.results[0]
            ) {
              const { lat, lng } =
                geoResponse.data.results[0].geometry.location;
              await pool.query(
                `UPDATE clients SET latitude = $1, longitude = $2 WHERE id = $3`,
                [lat, lng, client.id]
              );
              healedByApi++;
            } else {
              failed++;
            }
          } catch (apiError) {
            console.error('Google API error for client', client.id, apiError.message);
            failed++;
          }
        } else {
          failed++;
        }
      } catch (clientError) {
        console.error('Recovery error for client', client.id, clientError.message);
        failed++;
      }
    }

    res.json({ total, healedByLogs, healedByApi, failed });

  } catch (error) {
    console.error('Self-heal fatal error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateClientLocation = async (req, res) => {
  const { id } = req.params;
  const { latitude, longitude } = req.body;
  if (!latitude || !longitude) {
    return res.status(400).json({ error: "latitude and longitude required" });
  }
  await pool.query(
    `UPDATE clients SET latitude = $1, longitude = $2 WHERE id = $3`,
    [latitude, longitude, id]
  );
  res.json({ success: true, id, latitude, longitude });
};