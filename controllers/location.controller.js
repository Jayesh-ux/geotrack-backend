// controllers/location.controller.js
// UPDATED: Session state + movement validation + false travel detection

import { pool } from "../db.js";
import { getPincodeFromCoordinates } from "../services/geocoding.service.js";
import {
  SESSION_STATES,
  TRACKING_CONFIG,
  haversineDistance,
  calculateSpeed,
  isValidMovement,
  validateSessionActive,
  validateTrainMode,
  checkIdleTimeout,
  shouldSkipApiCall,
  getTransportModeFromRequest,
  updateLastValidLocation,
  getLastValidLocation,
  isIdle,
  stopTracking,
  resumeTracking,
  getTrackingState,
  validateBatteryData,
  validateLocationLog,
  getLocationConfidence,
  getValidationStatus,
  resumeTrackingFromPause,
  isTrackingPausedState,
  logValidationDebug
} from "../services/tracking.service.js";

let lastLogTimestamp = null;
let lastLogLat = null;
let lastLogLng = null;
let sessionState = SESSION_STATES.NOT_STARTED;

export const createLocationLog = async (req, res) => {
  const { latitude, longitude, accuracy, activity, notes, battery, markActivity, markNotes, sessionState: clientSessionState, timestamp: clientTimestamp } = req.body;

  const finalActivity = activity || markActivity;
  const finalNotes = notes || markNotes;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: "LocationRequired" });
  }

  const validationResult = await validateLocationLog(
    req.user.id,
    req.companyId,
    latitude,
    longitude,
    accuracy,
    battery,
    clientTimestamp,
    finalActivity
  );

  if (!validationResult.valid) {
    const error = validationResult.errors[0];
    
    const idleStateFlag = error.error === "IdleState" || error.error === "TrackingPaused";
    
    const result = await pool.query(
      `INSERT INTO location_logs 
       (user_id, latitude, longitude, accuracy, activity, notes, pincode, battery, company_id, 
        distance_delta, speed_kmh, validated, validation_reason, transport_mode, battery_stale,
        location_confidence, is_initial, rejection_reason, idle_state_flag)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       RETURNING *`,
      [
        req.user.id, latitude, longitude, accuracy ?? null, finalActivity || null,
        finalNotes || null, pincode, battery ?? null, req.companyId,
        null, null, false, error.error, transportMode, batteryData.batteryStale || false,
        getLocationConfidence(accuracy), validationResult.isInitial || false, error.error, idleStateFlag
      ]
    );
    
    return res.status(403).json({
      error: error.error,
      message: error.message,
      requiresResume: validationResult.requiresResume || false,
      resumeOnMovement: validationResult.resumeOnMovement || false
    });
  }

  // AUTO-CREATE SESSION if CLOCK_IN and no active session
  if (finalActivity === "CLOCK_IN") {
    try {
      const existingSession = await pool.query(
        `SELECT id FROM user_tracking_sessions 
         WHERE user_id = $1 AND company_id = $2 AND session_state = 'ACTIVE'`,
        [req.user.id, req.companyId]
      );
      
      if (existingSession.rows.length === 0) {
        await pool.query(
          `INSERT INTO user_tracking_sessions (user_id, company_id, session_state, started_at, clock_in_location)
           VALUES ($1, $2, $3, NOW(), $4)`,
          [req.user.id, req.companyId, SESSION_STATES.ACTIVE, JSON.stringify({ lat: latitude, lng: longitude, pincode })]
        );
        await pool.query(
          `UPDATE users SET current_session_id = (SELECT id FROM user_tracking_sessions WHERE user_id = $1 AND company_id = $2 ORDER BY started_at DESC LIMIT 1), session_state = $3 WHERE id = $1`,
          [req.user.id, req.companyId, SESSION_STATES.ACTIVE]
        );
        console.log(`✅ AUTO-CREATED SESSION for user ${req.user.id} on CLOCK_IN`);
      }
    } catch (e) {
      console.error(`❌ Failed to create session on CLOCK_IN: ${e.message}`);
    }
  }

  const now = new Date();
  let distanceDelta = null;
  let speedKmh = null;
  let validated = true;
  let validationReason = null;
  let isInitial = validationResult.isInitial || false;

  const lastValid = getLastValidLocation();
  
  if (lastValid && finalActivity !== "CLOCK_IN") {
    const timeDiffMs = now - lastValidTimestamp;
    const movementCheck = isValidMovement(latitude, longitude, lastValid.lat, lastValid.lng, timeDiffMs, accuracy);

    if (!movementCheck.valid) {
      validated = false;
      validationReason = movementCheck.reason;
      console.log(`⚠️ Invalid movement rejected: ${movementCheck.reason}, distance: ${movementCheck.distance?.toFixed(1)}m, speed: ${movementCheck.speed?.toFixed(1)} km/h`);
    } else {
      distanceDelta = isInitial ? null : movementCheck.distance;
      speedKmh = isInitial ? null : movementCheck.speed;
      updateLastValidLocation(latitude, longitude, now);
    }
  } else {
    isInitial = true;
    updateLastValidLocation(latitude, longitude, now);
  }

  const batteryData = validateBatteryData(battery, clientTimestamp);
  const batteryStale = batteryData.batteryStale || false;
  const locationConfidence = getLocationConfidence(accuracy);
  const validationStatus = getValidationStatus({ valid: validated }, accuracy);

  let pincode = null;
  const eventsNeedingGeocode = ["CLOCK_IN", "CLOCK_OUT", "MEETING_START", "MEETING_END"];

  if (eventsNeedingGeocode.includes(finalActivity)) {
    try {
      pincode = await getPincodeFromCoordinates(latitude, longitude);
    } catch (e) {
      console.warn("Geocoding failed, continuing without pincode");
    }
  }

  const transportMode = getTransportModeFromRequest(req.body);
  const idleStateFlag = isIdle() && finalActivity !== "CLOCK_IN";

  const result = await pool.query(
    `INSERT INTO location_logs 
     (user_id, latitude, longitude, accuracy, activity, notes, pincode, battery, company_id, 
      distance_delta, speed_kmh, validated, validation_reason, transport_mode, battery_stale,
      location_confidence, is_initial, rejection_reason, idle_state_flag)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
     RETURNING *`,
    [
      req.user.id, latitude, longitude, accuracy ?? null, finalActivity || null,
      finalNotes || null, pincode, battery ?? null, req.companyId,
      distanceDelta, speedKmh, validated, validationReason, transportMode, batteryStale,
      locationConfidence, isInitial, validationReason, idleStateFlag
    ]
  );

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

  lastLogTimestamp = now;
  lastLogLat = latitude;
  lastLogLng = longitude;

  const log = result.rows[0];
  const response = {
    id: log.id,
    userId: log.user_id,
    latitude: log.latitude,
    longitude: log.longitude,
    accuracy: log.accuracy,
    battery: log.battery,
    batteryStale: log.battery_stale,
    activity: log.activity,
    notes: log.notes,
    markActivity: log.activity,
    markNotes: log.notes,
    pincode: log.pincode,
    timestamp: log.timestamp,
    distanceDelta: log.distance_delta,
    speedKmh: log.speed_kmh,
    validated: log.validated,
    validationReason: log.validation_reason,
    locationConfidence: log.location_confidence,
    isInitial: log.is_initial,
    rejectionReason: log.rejection_reason,
    idleStateFlag: log.idle_state_flag
  };

  logValidationDebug({
    lat: log.latitude,
    lng: log.longitude,
    distanceDelta: log.distance_delta,
    speed: log.speed_kmh,
    accuracy: log.accuracy,
    battery: log.battery,
    batteryStale: log.battery_stale,
    sessionState: sessionState,
    validated: log.validated,
    validationReason: log.validation_reason,
    locationConfidence: log.location_confidence,
    isInitial: log.is_initial,
    idleStateFlag: log.idle_state_flag
  });

  const responseObj = {
    message: "LocationLogged",
    log: response
  };

  if (validationResult.warnings && validationResult.warnings.length > 0) {
    responseObj.warnings = validationResult.warnings;
  }

  res.status(201).json(responseObj);
};

export const clockIn = async (req, res) => {
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: "LocationRequired" });
  }

  let pincode = null;
  try {
    pincode = await getPincodeFromCoordinates(latitude, longitude);
  } catch (e) {
    console.warn("Geocoding failed");
  }

  const sessionResult = await pool.query(
    `INSERT INTO user_tracking_sessions 
     (user_id, company_id, session_state, started_at, clock_in_location)
     VALUES ($1, $2, $3, NOW(), $4)
     RETURNING *`,
    [req.user.id, req.companyId, SESSION_STATES.ACTIVE, JSON.stringify({ lat: latitude, lng: longitude, pincode })]
  );

  const session = sessionResult.rows[0];

  await pool.query(
    `UPDATE users SET current_session_id = $1, session_state = $2 
     WHERE id = $3`,
    [session.id, SESSION_STATES.ACTIVE, req.user.id]
  );

  sessionState = SESSION_STATES.ACTIVE;

  res.status(201).json({
    message: "ClockedIn",
    session: {
      id: session.id,
      state: session.session_state,
      startedAt: session.started_at
    }
  });
};

export const clockOut = async (req, res) => {
  const { latitude, longitude } = req.body;

  const currentSession = await pool.query(
    `SELECT id FROM user_tracking_sessions 
     WHERE user_id = $1 AND company_id = $2 AND session_state = 'ACTIVE'
     ORDER BY started_at DESC LIMIT 1`,
    [req.user.id, req.companyId]
  );

  if (currentSession.rows.length === 0) {
    return res.status(400).json({ error: "NoActiveSession" });
  }

  await pool.query(
    `UPDATE user_tracking_sessions 
     SET session_state = $1, ended_at = NOW(), clock_out_location = $2
     WHERE id = $3`,
    [SESSION_STATES.ENDED, JSON.stringify({ lat: latitude, lng: longitude }), currentSession.rows[0].id]
  );

  await pool.query(
    `UPDATE users SET session_state = $1, current_session_id = NULL 
     WHERE id = $2`,
    [SESSION_STATES.ENDED, req.user.id]
  );

  sessionState = SESSION_STATES.ENDED;
  lastLogTimestamp = null;
  lastLogLat = null;
  lastLogLng = null;
  stopTracking();

  res.json({
    message: "ClockedOut",
    sessionState: SESSION_STATES.ENDED
  });
};

export const pauseSession = async (req, res) => {
  const currentSession = await pool.query(
    `SELECT id FROM user_tracking_sessions 
     WHERE user_id = $1 AND company_id = $2 AND session_state = 'ACTIVE'
     ORDER BY started_at DESC LIMIT 1`,
    [req.user.id, req.companyId]
  );

  if (currentSession.rows.length === 0) {
    return res.status(400).json({ error: "NoActiveSession" });
  }

  await pool.query(
    `UPDATE user_tracking_sessions 
     SET session_state = $1, paused_at = NOW()
     WHERE id = $2`,
    [SESSION_STATES.PAUSED, currentSession.rows[0].id]
  );

  await pool.query(
    `UPDATE users SET session_state = $1 WHERE id = $2`,
    [SESSION_STATES.PAUSED, req.user.id]
  );

  sessionState = SESSION_STATES.PAUSED;

  res.json({ message: "SessionPaused", sessionState: SESSION_STATES.PAUSED });
};

export const resumeSession = async (req, res) => {
  const currentSession = await pool.query(
    `SELECT id FROM user_tracking_sessions 
     WHERE user_id = $1 AND company_id = $2 AND session_state = 'PAUSED'
     ORDER BY paused_at DESC LIMIT 1`,
    [req.user.id, req.companyId]
  );

  if (currentSession.rows.length === 0) {
    return res.status(400).json({ error: "NoPausedSession" });
  }

  await pool.query(
    `UPDATE user_tracking_sessions 
     SET session_state = $1, resumed_at = NOW()
     WHERE id = $2`,
    [SESSION_STATES.ACTIVE, currentSession.rows[0].id]
  );

  await pool.query(
    `UPDATE users SET session_state = $1 WHERE id = $2`,
    [SESSION_STATES.ACTIVE, req.user.id]
  );

  sessionState = SESSION_STATES.ACTIVE;

  res.json({ message: "SessionResumed", sessionState: SESSION_STATES.ACTIVE });
};

export const getLocationLogs = async (req, res) => {
  const { startDate, endDate, page = 1, limit = 50, userId } = req.query;
  const offset = (page - 1) * limit;

  // ✅ UPDATED: Add company_id filter (skip for super admin)
  let query;
  let params;
  let paramCount;

  if (userId === "all" && (req.user.isAdmin || req.isSuperAdmin)) {
    // Admin/SuperAdmin fetching logs for the entire company or all companies
    query = `SELECT l.*, u.email, p.full_name as "agentName", c.name as "companyName" 
             FROM location_logs l 
             JOIN users u ON l.user_id = u.id 
             LEFT JOIN profiles p ON u.id = p.user_id
             LEFT JOIN companies c ON l.company_id = c.id
             WHERE 1=1`;
    params = [];
    paramCount = 0;
  } else {
    // Single user logs
    let queryId = req.user.id;
    if (userId && (req.user.isAdmin || req.isSuperAdmin)) {
      queryId = userId;
    }
    query = `SELECT l.*, u.email, p.full_name as "agentName", c.name as "companyName" 
             FROM location_logs l 
             JOIN users u ON l.user_id = u.id 
             LEFT JOIN profiles p ON u.id = p.user_id
             LEFT JOIN companies c ON l.company_id = c.id
             WHERE l.user_id = $1`;
    params = [queryId];
    paramCount = 1;
  }

  if (!req.isSuperAdmin && req.companyId) {
    paramCount++;
    query += ` AND l.company_id = $${paramCount}`;
    params.push(req.companyId);
  }

  if (startDate) {
    paramCount++;
    query += ` AND l.timestamp >= $${paramCount}`;
    params.push(startDate);
  }

  if (endDate) {
    paramCount++;
    query += ` AND l.timestamp <= $${paramCount}`;
    // If it's just "YYYY-MM-DD", make it end of day to include all logs
    const parsedEndDate = endDate.includes('T') ? endDate : `${endDate} 23:59:59.999`;
    params.push(parsedEndDate);
  }

  query += ` ORDER BY l.timestamp DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(parseInt(limit), parseInt(offset));

  const result = await pool.query(query, params);

  const mappedLogs = result.rows.map(log => ({
    id: log.id,
    userId: log.user_id,
    email: log.email,
    agentName: log.agentName, // Added for admin clarity
    companyName: log.companyName, // ✅ Added for super admin visibility
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

export const getTrackingStateEndpoint = async (req, res) => {
  const trackingState = getTrackingState();
  const isPaused = isTrackingPausedState();
  
  res.json({
    isActive: trackingState.isActive,
    isPaused: isPaused,
    wasIdle: trackingState.wasIdle,
    lastValidLocation: trackingState.lastValidLocation ? {
      lat: trackingState.lastValidLocation.lat,
      lng: trackingState.lastValidLocation.lng,
      timestamp: trackingState.lastValidTimestamp
    } : null,
    consecutiveInvalid: trackingState.consecutiveInvalid
  });
};

export const resumeTrackingFromPauseEndpoint = async (req, res) => {
  const { latitude, longitude } = req.body;
  
  if (!latitude || !longitude) {
    return res.status(400).json({ error: "LocationRequired" });
  }
  
  const trackingState = getTrackingState();
  const wasPaused = isTrackingPausedState();
  
  if (!wasPaused) {
    return res.status(400).json({ error: "NotPaused", message: "Tracking is not currently paused" });
  }
  
  const lastValid = trackingState.lastValidLocation;
  if (lastValid) {
    const distance = haversineDistance(latitude, longitude, lastValid.lat, lastValid.lng);
    
    if (distance < TRACKING_CONFIG.MIN_DISTANCE_METERS) {
      return res.status(400).json({ 
        error: "InsufficientMovement", 
        message: `Need to move at least ${TRACKING_CONFIG.MIN_DISTANCE_METERS}m to resume. Current: ${distance.toFixed(0)}m`
      });
    }
  }
  
  resumeTrackingFromPause();
  
  res.json({
    message: "TrackingResumed",
    resumed: true
  });
};