// controllers/expenses.controller.js
// MERGED: Multi-leg expenses + Company filtering + Trial user support
// UPDATED: Session validation + journey validation + train validation

import { pool } from "../db.js";
import {
  SESSION_STATES,
  TRACKING_CONFIG,
  haversineDistance,
  validateSessionActive,
  validateExpenseFull,
  buildMultiLegChaining
} from "../services/tracking.service.js";

// ============================================
// TRANSFORMATION HELPERS
// ============================================

const transformExpenseRow = (row) => ({
  id: row.id,
  user_id: row.user_id,
  agentEmail: row.agentEmail, // ✅ Added for super admin visibility
  agentName: row.agentName, // ✅ Added for super admin visibility
  companyName: row.companyName, // ✅ Added for super admin visibility
  trip_name: row.trip_name,
  is_multi_leg: row.is_multi_leg || false,
  start_location: row.start_location,
  end_location: row.end_location,
  travel_date: row.travel_date,
  distance_km: row.distance_km,
  transport_mode: row.transport_mode,
  amount_spent: row.amount_spent,
  currency: row.currency,
  notes: row.notes,
  receipt_images: row.receipt_images || [],
  client_id: row.client_id,
  created_at: row.created_at,
  updated_at: row.updated_at,
  legs: [] // Will be populated separately if multi-leg
});

const transformLegRow = (row) => ({
  id: row.id,
  expense_id: row.expense_id,
  leg_number: row.leg_number,
  start_location: row.start_location,
  end_location: row.end_location,
  distance_km: row.distance_km,
  transport_mode: row.transport_mode,
  amount_spent: row.amount_spent,
  notes: row.notes,
  created_at: row.created_at
});

// ============================================
// CREATE EXPENSE (BACKWARD COMPATIBLE)
// ============================================

export const createExpense = async (req, res) => {
  console.log("📦 Received expense data:", JSON.stringify(req.body, null, 2));

  const {
    tripName,
    trip_name,
    start_location,
    startLocation,
    end_location,
    endLocation,
    travel_date,
    travelDate,
    distance_km,
    distanceKm,
    transport_mode,
    transportMode,
    amount_spent,
    amountSpent,
    currency = "₹",
    notes,
    receipt_images,
    receiptImages,
    client_id,
    clientId,
    legs // NEW: Array of trip legs
  } = req.body;

  // Handle both camelCase (from Android) and snake_case
  const finalTripName = tripName || trip_name || null;
  const finalStartLocation = start_location || startLocation;
  const finalEndLocation = end_location || endLocation;
  const finalTravelDate = travel_date || travelDate;
  const finalDistanceKm = distance_km || distanceKm;
  const finalTransportMode = transport_mode || transportMode;
  const finalAmountSpent = amount_spent || amountSpent;
  const finalReceiptImages = receipt_images || receiptImages || [];
  const finalClientId = client_id || clientId || null;

  // Validate required fields
  if (!finalStartLocation) {
    console.error("❌ Missing start_location");
    return res.status(400).json({ 
      error: "MissingField", 
      message: "start_location is required" 
    });
  }

  if (!finalTravelDate) {
    console.error("❌ Missing travel_date");
    return res.status(400).json({ 
      error: "MissingField", 
      message: "travel_date is required" 
    });
  }

  if (finalDistanceKm === undefined || finalDistanceKm === null) {
    console.error("❌ Missing distance_km");
    return res.status(400).json({ 
      error: "MissingField", 
      message: "distance_km is required" 
    });
  }

  if (!finalTransportMode) {
    console.error("❌ Missing transport_mode");
    return res.status(400).json({ 
      error: "MissingField", 
      message: "transport_mode is required" 
    });
  }

  if (finalAmountSpent === undefined || finalAmountSpent === null) {
    console.error("❌ Missing amount_spent");
    return res.status(400).json({ 
      error: "MissingField", 
      message: "amount_spent is required" 
    });
  }

  const sessionValidation = await validateSessionActive(req.user.id, req.companyId);
  if (!sessionValidation.valid) {
    console.error("❌ Session not active for expense submission");
    return res.status(403).json(sessionValidation);
  }

  const expenseValidation = await validateExpenseFull(req.user.id, req.companyId, finalTravelDate);
  if (!expenseValidation.valid) {
    console.error(`❌ Expense validation failed: ${expenseValidation.error}`);
    return res.status(400).json(expenseValidation);
  }
  console.log(`✅ Expense validation passed: ${expenseValidation.validLogs} valid logs, ${expenseValidation.totalDistance.toFixed(0)}m distance`);

  const distanceMeters = parseFloat(finalDistanceKm) * 1000;
  if (distanceMeters < TRACKING_CONFIG.MIN_EXPENSE_DISTANCE_METERS) {
    console.error(`❌ Distance too short: ${distanceMeters}m (min: ${TRACKING_CONFIG.MIN_EXPENSE_DISTANCE_METERS}m)`);
    return res.status(400).json({ 
      error: "DistanceTooShort",
      message: `Distance must be at least ${TRACKING_CONFIG.MIN_EXPENSE_DISTANCE_METERS} meters to submit expense`
    });
  }

  const transportModes = ["Car", "Bike", "Taxi", "Train", "Bus", "Flight"];
  if (finalTransportMode && !transportModes.includes(finalTransportMode)) {
    return res.status(400).json({ 
      error: "InvalidTransportMode",
      message: "Transport mode must be: Car, Bike, Taxi, Train, Bus, or Flight"
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const isMultiLeg = Array.isArray(legs) && legs.length > 0;
    console.log(`📊 Multi-leg trip: ${isMultiLeg}, Legs: ${legs?.length || 0}`);

    // ✅ DUPLICATE PREVENTION: Check if same trip exists today (only for non-multi-leg)
    if (!isMultiLeg) {
      const existingCheck = await client.query(
        `SELECT id FROM trip_expenses 
         WHERE user_id = $1 AND travel_date = $2 AND start_location = $3 
         AND status IN ('DRAFT', 'IN_PROGRESS', 'COMPLETED')
         LIMIT 1`,
        [req.user.id, finalTravelDate, finalStartLocation]
      );
      
      if (existingCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ 
          error: "DuplicateExpense", 
          message: "Expense already exists for this trip today. Please resume or update the existing draft.",
          existingExpenseId: existingCheck.rows[0].id
        });
      }
    }

    // Insert main expense record (✅ WITH company_id)
    const expenseResult = await client.query(
      `INSERT INTO trip_expenses
      (user_id, trip_name, is_multi_leg, start_location, end_location, travel_date, 
       distance_km, transport_mode, amount_spent, currency, notes, receipt_images, client_id, company_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        req.user.id,
        finalTripName,
        isMultiLeg,
        finalStartLocation,
        finalEndLocation,
        finalTravelDate,
        finalDistanceKm,
        finalTransportMode,
        finalAmountSpent,
        currency,
        notes,
        finalReceiptImages,
        finalClientId,
        req.user?.companyId || req.companyId // ✅ Added company_id
      ]
    );

    const expense = expenseResult.rows[0];
    console.log("✅ Expense created:", expense.id);

    let legsData = [];

    // If multi-leg, insert leg records
    if (isMultiLeg) {
      console.log("📄 Inserting legs...");
      const chainedLegs = buildMultiLegChaining(legs);
      
      for (let i = 0; i < chainedLegs.length; i++) {
        const leg = chainedLegs[i];
        const legResult = await client.query(
          `INSERT INTO trip_legs
          (expense_id, leg_number, start_location, end_location, 
           distance_km, transport_mode, amount_spent, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *`,
          [
            expense.id,
            i + 1,
            leg.start_location || leg.startLocation,
            leg.end_location || leg.endLocation,
            leg.distance_km || leg.distanceKm,
            leg.transport_mode || leg.transportMode,
            leg.amount_spent || leg.amountSpent,
            leg.notes || null
          ]
        );
        legsData.push(transformLegRow(legResult.rows[0]));
        console.log(`  ✅ Leg ${i + 1} inserted: ${leg.start_location || leg.startLocation} → ${leg.end_location || leg.endLocation}`);
      }
    }

    await client.query('COMMIT');

    const response = transformExpenseRow(expense);
    response.legs = legsData;

    console.log("🎉 Expense submission successful");

    res.status(201).json({
      expense: response
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating expense:', err);
    console.error('Stack trace:', err.stack);
    
    res.status(500).json({
      error: err.message || "Failed to create expense",
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  } finally {
    client.release();
  }
};

// ============================================
// GET MY EXPENSES (with legs)
// ============================================

export const getMyExpenses = async (req, res) => {
  const { startDate, endDate, transportMode, clientId, userId } = req.query;

  let query;
  let params;
  let count;

  const companyId = req.user?.companyId || req.companyId;

  if (userId === 'all' && (req.user.isAdmin || req.isSuperAdmin)) {
    // Admin/SuperAdmin fetching all expenses (company or all)
    if (req.isSuperAdmin) {
      query = `SELECT e.*, u.email as "agentEmail", p.full_name as "agentName", c.name as "companyName"
                FROM trip_expenses e
                LEFT JOIN users u ON e.user_id = u.id
                LEFT JOIN profiles p ON u.id = p.user_id
                LEFT JOIN companies c ON e.company_id = c.id
                WHERE 1=1`;
      params = [];
    } else {
      query = `SELECT e.*, u.email as "agentEmail", p.full_name as "agentName", c.name as "companyName"
                FROM trip_expenses e
                LEFT JOIN users u ON e.user_id = u.id
                LEFT JOIN profiles p ON u.id = p.user_id
                LEFT JOIN companies c ON e.company_id = c.id
                WHERE e.company_id = $1`;
      params = [companyId];
    }
    count = req.isSuperAdmin ? 0 : 1;
  } else {
    // Single user expenses (default or specific ID)
    let queryId = req.user.id;
    if (userId && (req.user.isAdmin || req.isSuperAdmin)) {
      queryId = userId;
    }
    if (req.isSuperAdmin) {
      query = `SELECT e.*, u.email as "agentEmail", p.full_name as "agentName", c.name as "companyName"
                FROM trip_expenses e
                LEFT JOIN users u ON e.user_id = u.id
                LEFT JOIN profiles p ON u.id = p.user_id
                LEFT JOIN companies c ON e.company_id = c.id
                WHERE e.user_id = $1`;
      params = [queryId];
      count = 1;
    } else {
      query = `SELECT e.*, u.email as "agentEmail", p.full_name as "agentName", c.name as "companyName"
                FROM trip_expenses e
                LEFT JOIN users u ON e.user_id = u.id
                LEFT JOIN profiles p ON u.id = p.user_id
                LEFT JOIN companies c ON e.company_id = c.id
                WHERE e.user_id = $1 AND e.company_id = $2`;
      params = [queryId, companyId];
      count = 2;
    }
  }

  if (startDate) {
    count++;
    query += ` AND travel_date >= $${count}`;
    params.push(startDate);
  }
  if (endDate) {
    count++;
    query += ` AND travel_date <= $${count}`;
    params.push(endDate);
  }
  if (transportMode) {
    count++;
    query += ` AND transport_mode = $${count}`;
    params.push(transportMode);
  }
  if (clientId) {
    count++;
    query += ` AND client_id = $${count}`;
    params.push(clientId);
  }

  query += ` ORDER BY travel_date DESC`;

  const result = await pool.query(query, params);
  const expenses = result.rows.map(transformExpenseRow);

  // Fetch legs for multi-leg expenses
  for (const expense of expenses) {
    if (expense.is_multi_leg) {
      const legsResult = await pool.query(
        `SELECT * FROM trip_legs WHERE expense_id = $1 ORDER BY leg_number`,
        [expense.id]
      );
      expense.legs = legsResult.rows.map(transformLegRow);
    }
  }

  res.json({
    expenses: expenses,
    total: expenses.length,
    totalAmount: expenses.reduce((sum, e) => sum + Number(e.amount_spent), 0)
  });
};

// ============================================
// GET EXPENSE BY ID (with legs)
// ============================================

export const getExpenseById = async (req, res) => {
  // ✅ Add company_id filter
  const result = await pool.query(
    `SELECT * FROM trip_expenses WHERE id = $1 AND user_id = $2 AND company_id = $3`,
    [req.params.id, req.user.id, req.companyId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "ExpenseNotFound" });
  }

  const expense = transformExpenseRow(result.rows[0]);

  // Fetch legs if multi-leg
  if (expense.is_multi_leg) {
    const legsResult = await pool.query(
      `SELECT * FROM trip_legs WHERE expense_id = $1 ORDER BY leg_number`,
      [expense.id]
    );
    expense.legs = legsResult.rows.map(transformLegRow);
  }

  res.json({ expense });
};

// ============================================
// UPDATE EXPENSE (with legs)
// ============================================

export const updateExpense = async (req, res) => {
  const {
    tripName,
    trip_name,
    start_location,
    startLocation,
    end_location,
    endLocation,
    travel_date,
    travelDate,
    distance_km,
    distanceKm,
    transport_mode,
    transportMode,
    amount_spent,
    amountSpent,
    currency = "₹",
    notes,
    receipt_images,
    receiptImages,
    client_id,
    clientId,
    legs
  } = req.body;

  const finalTripName = tripName || trip_name || null;
  const finalStartLocation = start_location || startLocation;
  const finalEndLocation = end_location || endLocation;
  const finalTravelDate = travel_date || travelDate;
  const finalDistanceKm = distance_km || distanceKm;
  const finalTransportMode = transport_mode || transportMode;
  const finalAmountSpent = amount_spent || amountSpent;
  const finalReceiptImages = receipt_images || receiptImages || [];
  const finalClientId = client_id || clientId || null;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const isMultiLeg = Array.isArray(legs) && legs.length > 0;

    // ✅ Update main expense (with company_id filter)
    const result = await client.query(
      `UPDATE trip_expenses
       SET trip_name = $1,
           is_multi_leg = $2,
           start_location = $3,
           end_location = $4,
           travel_date = $5,
           distance_km = $6,
           transport_mode = $7,
           amount_spent = $8,
           currency = $9,
           notes = $10,
           receipt_images = $11,
           client_id = $12,
           updated_at = NOW()
       WHERE id = $13 AND user_id = $14 AND company_id = $15
       RETURNING *`,
      [
        finalTripName,
        isMultiLeg,
        finalStartLocation,
        finalEndLocation,
        finalTravelDate,
        finalDistanceKm,
        finalTransportMode,
        finalAmountSpent,
        currency,
        notes,
        finalReceiptImages,
        finalClientId,
        req.params.id,
        req.user.id,
        req.companyId // ✅ Added company_id
      ]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "ExpenseNotFound" });
    }

    const expense = result.rows[0];
    let legsData = [];

    // Delete old legs and insert new ones
    if (isMultiLeg) {
      await client.query('DELETE FROM trip_legs WHERE expense_id = $1', [expense.id]);

      for (const leg of legs) {
        const legResult = await client.query(
          `INSERT INTO trip_legs
          (expense_id, leg_number, start_location, end_location, 
           distance_km, transport_mode, amount_spent, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *`,
          [
            expense.id,
            leg.leg_number || leg.legNumber,
            leg.start_location || leg.startLocation,
            leg.end_location || leg.endLocation,
            leg.distance_km || leg.distanceKm,
            leg.transport_mode || leg.transportMode,
            leg.amount_spent || leg.amountSpent,
            leg.notes || null
          ]
        );
        legsData.push(transformLegRow(legResult.rows[0]));
      }
    }

    await client.query('COMMIT');

    const response = transformExpenseRow(expense);
    response.legs = legsData;

    res.json({
      message: "Expense updated successfully",
      expense: response
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating expense:', err);
    throw err;
  } finally {
    client.release();
  }
};

// ============================================
// DELETE EXPENSE (cascades to legs automatically)
// ============================================

export const deleteExpense = async (req, res) => {
  // ✅ Add company_id filter
  const result = await pool.query(
    `DELETE FROM trip_expenses WHERE id = $1 AND user_id = $2 AND company_id = $3 RETURNING id`,
    [req.params.id, req.user.id, req.companyId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "ExpenseNotFound" });
  }

  res.status(204).send();
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

export const getMyTotal = async (req, res) => {
  // Validate role - admins cannot access personal expenses
  if (req.user.role === 'admin') {
    return res.status(403).json({ 
      error: "Forbidden", 
      message: "Admin users cannot access personal expense data" 
    });
  }
  
  // ✅ Add company_id filter
  const result = await pool.query(
    `SELECT COALESCE(SUM(amount_spent), 0) as total_amount
     FROM trip_expenses
     WHERE user_id = $1 AND company_id = $2`,
    [req.user.id, req.companyId]
  );

  res.json({
    totalAmount: parseFloat(result.rows[0].total_amount)
  });
};

export const uploadReceipt = async (req, res) => {
  const { imageData, fileName, expenseId } = req.body;

  if (!imageData) {
    return res.status(400).json({ error: "ImageRequired" });
  }

  // For now, store as base64 in trip_expenses.receipt_images
  // TODO: Integrate with cloud storage (S3/Cloudinary) for production
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Generate a simple file URL (in production, this would be cloud storage URL)
    const fileUrl = `/receipts/${Date.now()}-${fileName || 'receipt.jpg'}`;
    
    // If expenseId provided, update the expense record
    if (expenseId) {
      await client.query(
        `UPDATE trip_expenses 
         SET receipt_images = COALESCE(receipt_images, '{}') || $1,
             receipt_linked = true
         WHERE id = $2 AND company_id = $3`,
        [fileUrl, expenseId, req.companyId]
      );
    }

    // Also insert into trip_receipts table for better tracking
    await client.query(
      `INSERT INTO trip_receipts 
       (expense_id, file_url, file_name, uploaded_by, company_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [expenseId || null, fileUrl, fileName || 'receipt.jpg', req.user.id, req.companyId]
    );

    await client.query('COMMIT');

    res.json({ 
      fileUrl: fileUrl,
      fileName: fileName,
      expenseId: expenseId,
      message: "Receipt uploaded successfully"
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error uploading receipt:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// ============================================
// ACTIVE TRIP APIs (Trip Lifecycle)
// ============================================

export const startTrip = async (req, res) => {
  const { expenseId } = req.body;
  const { agentId } = req.params;

  if (!expenseId) {
    return res.status(400).json({ error: "ExpenseIdRequired" });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get current DRAFT trip
    const expenseResult = await client.query(
      `SELECT * FROM trip_expenses 
       WHERE id = $1 AND user_id = $2 AND (status = 'DRAFT' OR status IS NULL)
       RETURNING *`,
      [expenseId, agentId]
    );

    if (expenseResult.rows.length === 0) {
      return res.status(404).json({ error: "DraftTripNotFound" });
    }

    const expense = expenseResult.rows[0];

    // Get first leg if multi-leg
    let legs = [];
    if (expense.is_multi_leg) {
      const legsResult = await client.query(
        `SELECT * FROM trip_legs WHERE expense_id = $1 ORDER BY leg_number`,
        [expenseId]
      );
      legs = legsResult.rows;
    }

    // Update trip status to IN_PROGRESS
    await client.query(
      `UPDATE trip_expenses 
       SET status = 'IN_PROGRESS', current_leg_index = 0, start_time = NOW() 
       WHERE id = $1`,
      [expenseId]
    );

    // Update first leg status
    if (legs.length > 0) {
      await client.query(
        `UPDATE trip_legs 
         SET status = 'IN_PROGRESS', started_at = NOW() 
         WHERE id = $1`,
        [legs[0].id]
      );
    }

    await client.query('COMMIT');

    res.json({
      trip: {
        id: expense.id,
        status: 'IN_PROGRESS',
        currentLegIndex: 0,
        startLocation: expense.start_location,
        endLocation: expense.end_location,
        isMultiLeg: expense.is_multi_leg,
        legs: legs.map((l, i) => ({
          ...l,
          status: i === 0 ? 'IN_PROGRESS' : 'PENDING'
        }))
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error starting trip:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

export const completeLeg = async (req, res) => {
  const { expenseId, legId } = req.body;
  const { agentId } = req.params;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get current trip
    const expenseResult = await client.query(
      `SELECT * FROM trip_expenses 
       WHERE id = $1 AND user_id = $2 AND status = 'IN_PROGRESS'
       RETURNING *`,
      [expenseId, agentId]
    );

    if (expenseResult.rows.length === 0) {
      return res.status(404).json({ error: "ActiveTripNotFound" });
    }

    const expense = expenseResult.rows[0];
    const currentLegIndex = expense.current_leg_index || 0;

    // Complete current leg
    if (legId) {
      await client.query(
        `UPDATE trip_legs 
         SET status = 'COMPLETED', completed_at = NOW() 
         WHERE id = $1`,
        [legId]
      );
    }

    // Get next leg
    const nextLegResult = await client.query(
      `SELECT * FROM trip_legs 
       WHERE expense_id = $1 AND leg_number = $2
       RETURNING *`,
      [expenseId, currentLegIndex + 1]
    );

    if (nextLegResult.rows.length > 0) {
      // Start next leg
      const nextLeg = nextLegResult.rows[0];
      await client.query(
        `UPDATE trip_legs 
         SET status = 'IN_PROGRESS', started_at = NOW() 
         WHERE id = $1`,
        [nextLeg.id]
      );

      await client.query(
        `UPDATE trip_expenses 
         SET current_leg_index = $1 
         WHERE id = $2`,
        [currentLegIndex + 1, expenseId]
      );
    } else {
      // Trip complete
      await client.query(
        `UPDATE trip_expenses 
         SET status = 'COMPLETED', end_time = NOW() 
         WHERE id = $1`,
        [expenseId]
      );
    }

    await client.query('COMMIT');

    res.json({ success: true, message: "Leg completed" });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error completing leg:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

export const getActiveTrip = async (req, res) => {
  const { agentId } = req.params;

  // Find IN_PROGRESS trip, fall back to DRAFT
  const expenseResult = await pool.query(
    `SELECT * FROM trip_expenses 
     WHERE user_id = $1 AND status = 'IN_PROGRESS'
     ORDER BY start_time DESC NULLS LAST 
     LIMIT 1`,
    [agentId]
  );

  let expense = expenseResult.rows[0];

  // Fallback to DRAFT if no IN_PROGRESS
  if (!expense) {
    const draftResult = await pool.query(
      `SELECT * FROM trip_expenses 
       WHERE user_id = $1 AND (status = 'DRAFT' OR status IS NULL)
       ORDER BY created_at DESC 
       LIMIT 1`,
      [agentId]
    );
    expense = draftResult.rows[0];
  }

  if (!expense) {
    return res.status(404).json({ error: "NoActiveTrip" });
  }

  // Get legs
  const legs = expense.is_multi_leg 
    ? (await pool.query(
        `SELECT * FROM trip_legs WHERE expense_id = $1 ORDER BY leg_number`,
        [expense.id]
      )).rows
    : [];

  res.json({
    trip: {
      id: expense.id,
      status: expense.status || 'DRAFT',
      currentLegIndex: expense.current_leg_index || 0,
      startLocation: expense.start_location,
      endLocation: expense.end_location,
      transportMode: expense.transport_mode,
      isMultiLeg: expense.is_multi_leg,
      legs: legs,
      startTime: expense.start_time,
      endTime: expense.end_time
    }
  });
};

// ============================================
// RECEIPT APIs
// ============================================

export const getReceipts = async (req, res) => {
  const { expenseId, legId } = req.query;
  const companyId = req.companyId;

  let query = `SELECT * FROM trip_receipts WHERE company_id = $1`;
  const params = [companyId];

  if (expenseId) {
    params.push(expenseId);
    query += ` AND expense_id = $${params.length}`;
  }

  if (legId) {
    params.push(legId);
    query += ` AND leg_id = $${params.length}`;
  }

  query += ` ORDER BY created_at DESC`;

  const result = await pool.query(query, params);

  res.json({
    receipts: result.rows.map(r => ({
      id: r.id,
      expenseId: r.expense_id,
      legId: r.leg_id,
      fileUrl: r.file_url,
      fileName: r.file_name,
      fileType: r.file_type,
      fileSize: r.file_size,
      uploadedBy: r.uploaded_by,
      createdAt: r.created_at
    }))
  });
};

export const linkReceiptToLeg = async (req, res) => {
  const { receiptId, legId } = req.body;

  if (!receiptId) {
    return res.status(400).json({ error: "ReceiptIdRequired" });
  }

  const result = await pool.query(
    `UPDATE trip_receipts 
     SET leg_id = $1 
     WHERE id = $2 AND company_id = $3 
     RETURNING *`,
    [legId || null, receiptId, req.companyId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "ReceiptNotFound" });
  }

  res.json({ success: true, receipt: result.rows[0] });
};