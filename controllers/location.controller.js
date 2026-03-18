// controllers/location.controller.js
// UPDATED: All queries now filter by company_id

import { pool } from "../db.js";
import { getPincodeFromCoordinates } from "../services/geocoding.service.js";

export const createLocationLog = async (req, res) => {
  const { latitude, longitude, accuracy, activity, notes, battery } = req.body;

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
    [req.user.id, latitude, longitude, accuracy || null, activity || null, notes || null, pincode, battery || null, req.companyId]
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

  if (activity) {
    paramIdx++;
    userUpdateQuery += `, current_activity = $${paramIdx}`;
    userUpdateParams.push(activity);
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
  const { startDate, endDate, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  // ✅ UPDATED: Add company_id filter
  let query = "SELECT * FROM location_logs WHERE user_id = $1 AND company_id = $2";
  const params = [req.user.id, req.companyId];
  let paramCount = 2;

  if (startDate) {
    paramCount++;
    query += ` AND timestamp >= $${paramCount}`;
    params.push(startDate);
  }

  if (endDate) {
    paramCount++;
    query += ` AND timestamp <= $${paramCount}`;
    params.push(endDate);
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
  // ✅ UPDATED: Add company_id filter
  const result = await pool.query(
    `SELECT latitude, longitude, timestamp
     FROM location_logs
     WHERE user_id = $1
       AND company_id = $2
       AND DATE(timestamp) = CURRENT_DATE
     ORDER BY timestamp ASC
     LIMIT 1`,
    [req.user.id, req.companyId]
  );

  if (result.rows.length === 0) {
    return res.json({ clockIn: null });
  }

  res.json({ clockIn: result.rows[0] });
};