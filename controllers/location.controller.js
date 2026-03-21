// controllers/location.controller.js
// UPDATED: All queries now filter by company_id

import { pool } from "../db.js";
import { getPincodeFromCoordinates } from "../services/geocoding.service.js";

export const createLocationLog = async (req, res) => {
  const { latitude, longitude, accuracy, activity, notes, battery, markActivity, markNotes } = req.body;

  // Use markActivity/markNotes as fallback for Android compatibility
  const finalActivity = activity || markActivity;
  const finalNotes = notes || markNotes;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: "LocationRequired" });
  }

  console.log(`📍 Logging location for user ${req.user.id}: ${latitude}, ${longitude}`);

  const pincode = await getPincodeFromCoordinates(latitude, longitude);

  // ✅ UPDATED: Include company_id in INSERT
  const result = await pool.query(
    `INSERT INTO location_logs (user_id, latitude, longitude, accuracy, activity, notes, pincode, battery, company_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [req.user.id, latitude, longitude, accuracy || null, finalActivity || null, finalNotes || null, pincode, battery || null, req.companyId]
  );

  // ✅ UPDATED: Update user real-time status (pincode, last_seen, battery, activity)
  let userUpdateQuery = "UPDATE users SET last_seen = NOW()";
  const userUpdateParams = [];
  let paramIdx = 0;

  if (pincode) {
    paramIdx++;
    userUpdateQuery += `, pincode = $${paramIdx}`;
    userUpdateParams.push(pincode);
  }

  if (battery !== undefined && battery !== null) {
    paramIdx++;
    userUpdateQuery += `, battery_percentage = $${paramIdx}`;
    userUpdateParams.push(battery);
  }

  if (finalActivity) {
    paramIdx++;
    userUpdateQuery += `, current_activity = $${paramIdx}`;
    userUpdateParams.push(finalActivity);
  }

  paramIdx++;
  userUpdateQuery += ` WHERE id = $${paramIdx}`;
  userUpdateParams.push(req.user.id);

  await pool.query(userUpdateQuery, userUpdateParams);
  console.log(`📌 Updated user ${req.user.id} status (Pincode: ${pincode}, Battery: ${battery}%)`);

  const log = result.rows[0];
  const mappedLog = {
    id: log.id,
    userId: log.user_id,
    latitude: log.latitude,
    longitude: log.longitude,
    accuracy: log.accuracy,
    battery: log.battery,
    activity: log.activity,
    notes: log.notes,
    markActivity: log.activity, // Added for Android App compatibility
    markNotes: log.notes, // Added for Android App compatibility
    pincode: log.pincode,
    timestamp: log.timestamp
  };

  console.log(`🔋 Battery: ${battery}% | ✅ Location logged with pincode: ${pincode}`);

  res.status(201).json({
    message: "LocationLogged",
    log: mappedLog
  });
};

export const getLocationLogs = async (req, res) => {
  const { startDate, endDate, page = 1, limit = 50, userId } = req.query;
  const offset = (page - 1) * limit;

  let queryId = req.user.id;
  if (userId && (req.user.isAdmin || req.isSuperAdmin)) {
    queryId = userId;
  }

  // ✅ UPDATED: Add company_id filter (skip for super admin)
  let query = "SELECT * FROM location_logs WHERE user_id = $1";
  const params = [queryId];
  let paramCount = 1;

  if (!req.isSuperAdmin && req.companyId) {
    paramCount++;
    query += ` AND company_id = $${paramCount}`;
    params.push(req.companyId);
  }

  if (startDate) {
    paramCount++;
    query += ` AND timestamp >= $${paramCount}`;
    params.push(startDate);
  }

  if (endDate) {
    paramCount++;
    query += ` AND timestamp <= $${paramCount}`;
    // If it's just "YYYY-MM-DD", make it end of day to include all logs
    const parsedEndDate = endDate.includes('T') ? endDate : `${endDate} 23:59:59.999`;
    params.push(parsedEndDate);
  }

  query += ` ORDER BY timestamp DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(parseInt(limit), parseInt(offset));

  const result = await pool.query(query, params);

  const mappedLogs = result.rows.map(log => ({
    id: log.id,
    userId: log.user_id,
    latitude: log.latitude,
    longitude: log.longitude,
    accuracy: log.accuracy,
    battery: log.battery,
    activity: log.activity,
    notes: log.notes,
    markActivity: log.activity, // Added for Android App compatibility
    markNotes: log.notes, // Added for Android App compatibility
    pincode: log.pincode,
    timestamp: log.timestamp
  }));

  res.json({
    logs: mappedLogs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
    },
  });
};

export const getClockIn = async (req, res) => {
  // ✅ UPDATED: Add company_id filter (skip for super admin)
  let clockQuery = `SELECT latitude, longitude, timestamp
     FROM location_logs
     WHERE user_id = $1
       AND DATE(timestamp) = CURRENT_DATE`;
  const clockParams = [req.user.id];
  let clockParamCount = 1;

  if (!req.isSuperAdmin && req.companyId) {
    clockParamCount++;
    clockQuery += ` AND company_id = $${clockParamCount}`;
    clockParams.push(req.companyId);
  }

  clockQuery += ` ORDER BY timestamp ASC LIMIT 1`;

  const result = await pool.query(clockQuery, clockParams);

  if (result.rows.length === 0) {
    return res.json({ clockIn: null });
  }

  res.json({ clockIn: result.rows[0] });
};

// ============================================================
// GET DAILY SUMMARY FOR AGENT (single endpoint, replaces 3 calls)
// ============================================================
export const getDailySummary = async (req, res) => {
  const { date } = req.query; // YYYY-MM-DD, defaults to today
  const userId = req.user.id;
  const companyId = req.companyId;
  const isSuperAdmin = req.isSuperAdmin;

  const targetDate = date || new Date().toISOString().slice(0, 10);
  const dayStart = `${targetDate} 00:00:00`;
  const dayEnd   = `${targetDate} 23:59:59.999`;

  // Build company filter dynamically
  const companyFilter = (!isSuperAdmin && companyId) ? 'AND company_id = $2' : '';
  const baseParams = (!isSuperAdmin && companyId) ? [userId, companyId] : [userId];
  const dateParamStart = baseParams.length + 1;

  // 1. Location logs for the day (for distance & GPS point count)
  const logsResult = await pool.query(
    `SELECT latitude, longitude, activity as "markActivity", notes as "markNotes", battery, accuracy, timestamp
     FROM location_logs
     WHERE user_id = $1 ${companyFilter}
       AND timestamp >= $${dateParamStart} AND timestamp <= $${dateParamStart + 1}
     ORDER BY timestamp ASC`,
    [...baseParams, dayStart, dayEnd]
  );

  // 2. Meetings for the day
  const meetingsResult = await pool.query(
    `SELECT id, client_id as "clientId", start_time as "startTime", end_time as "endTime",
            status, comments,
            c.name as "clientName"
     FROM meetings m
     LEFT JOIN clients c ON m.client_id = c.id
     WHERE m.user_id = $1 ${companyFilter ? companyFilter.replace('company_id', 'm.company_id') : ''}
       AND m.start_time >= $${dateParamStart} AND m.start_time <= $${dateParamStart + 1}
     ORDER BY m.start_time ASC`,
    [...baseParams, dayStart, dayEnd]
  );

  // 3. Expenses for the day
  const expenseCompanyFilter = (!isSuperAdmin && companyId) ? 'AND company_id = $2' : '';
  const expenseDateParam = baseParams.length + 1;
  const expensesResult = await pool.query(
    `SELECT id, trip_name as "tripName", start_location as "startLocation",
            end_location as "endLocation", distance_km as "distanceKm",
            transport_mode as "transportMode", amount_spent as "amountSpent", travel_date as "travelDate"
     FROM trip_expenses
     WHERE user_id = $1 ${expenseCompanyFilter}
       AND travel_date::date = $${expenseDateParam}::date
     ORDER BY created_at ASC`,
    [...baseParams, targetDate]
  );

  // Compute simple haversine distance from ordered location logs
  const logs = logsResult.rows;
  let totalDistanceKm = 0;
  for (let i = 0; i < logs.length - 1; i++) {
    const a = logs[i], b = logs[i + 1];
    const R = 6371;
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
    const lat1 = (a.latitude * Math.PI) / 180;
    const lat2 = (b.latitude * Math.PI) / 180;
    const c = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    totalDistanceKm += R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1-c));
  }

  // Duration = last log time - first log time
  let activeDurationMinutes = 0;
  if (logs.length >= 2) {
    activeDurationMinutes = Math.floor(
      (new Date(logs[logs.length - 1].timestamp) - new Date(logs[0].timestamp)) / 60000
    );
  }

  const meetings = meetingsResult.rows;
  const expenses = expensesResult.rows;
  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amountSpent || 0), 0);

  console.log(`✅ Daily summary for ${userId} on ${targetDate}: ${logs.length} logs, ${meetings.length} meetings, ₹${totalExpenses}`);

  res.json({
    date: targetDate,
    summary: {
      totalDistanceKm: parseFloat(totalDistanceKm.toFixed(2)),
      activeDurationMinutes,
      gpsPoints: logs.length,
      meetingsTotal: meetings.length,
      meetingsCompleted: meetings.filter(m => m.status === 'COMPLETED').length,
      meetingsInProgress: meetings.filter(m => m.status === 'IN_PROGRESS').length,
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      expenseCount: expenses.length
    },
    meetings,
    expenses,
    locationLogs: logs
  });
};