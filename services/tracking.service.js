import { pool } from "../db.js";

export const SESSION_STATES = {
  NOT_STARTED: "NOT_STARTED",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  ENDED: "ENDED"
};

export const TRACKING_CONFIG = {
  MIN_DISTANCE_METERS: 50,
  MIN_SPEED_KMH: 1,
  MAX_GPS_ACCURACY_METERS: 30,
  MIN_TIME_DIFF_SECONDS: 10,
  IDLE_TIMEOUT_MINUTES: 5,
  TRAIN_RADIUS_KM: 10,
  MIN_EXPENSE_DISTANCE_METERS: 100,
  IDLE_API_THROTTLE_MS: 10000,
  DEBOUNCE_MS: 2000,
  BATTERY_DATA_MAX_AGE_SECONDS: 60,
  MIN_VALID_LOGS_FOR_EXPENSE: 2,
  SPEED_SMOOTHING_WINDOW: 3,
  MAX_CONSECUTIVE_INVALID: 3,
  FAILSAFE_ACCURACY_METERS: 100
};

let lastValidLocation = null;
let isTrackingActive = false;
let lastValidTimestamp = null;
let wasIdle = false;
let speedHistory = [];
let consecutiveInvalidCount = 0;
let isTrackingPaused = false;

export function resetTrackingState() {
  lastValidLocation = null;
  isTrackingActive = false;
  lastValidTimestamp = null;
  wasIdle = false;
  speedHistory = [];
  consecutiveInvalidCount = 0;
  isTrackingPaused = false;
}

export function resetSpeedHistory() {
  speedHistory = [];
}

export function getLocationConfidence(accuracy) {
  if (accuracy === null || accuracy === undefined) {
    return "LOW";
  }
  if (accuracy <= 15) {
    return "HIGH";
  }
  if (accuracy <= 30) {
    return "MEDIUM";
  }
  return "LOW";
}

export function getValidationStatus(movementCheck, accuracy) {
  if (!movementCheck.valid) {
    return "REJECTED";
  }
  const confidence = getLocationConfidence(accuracy);
  if (confidence === "LOW") {
    return "LOW_CONFIDENCE";
  }
  return "VALID";
}

export function shouldPauseTracking(accuracy, isInvalid) {
  if (accuracy !== null && accuracy > TRACKING_CONFIG.FAILSAFE_ACCURACY_METERS) {
    console.log("⛔ FAILSAFE: Accuracy > 100m - pausing tracking");
    return true;
  }
  
  if (isInvalid) {
    consecutiveInvalidCount++;
    console.log(`⚠️ Consecutive invalid: ${consecutiveInvalidCount}/${TRACKING_CONFIG.MAX_CONSECUTIVE_INVALID}`);
    if (consecutiveInvalidCount >= TRACKING_CONFIG.MAX_CONSECUTIVE_INVALID) {
      console.log("⛔ FAILSAFE: 3 consecutive invalid - pausing tracking");
      return true;
    }
  } else {
    consecutiveInvalidCount = 0;
  }
  
  return false;
}

export function resumeTrackingFromPause() {
  isTrackingPaused = false;
  consecutiveInvalidCount = 0;
  console.log("▶️ Tracking resumed after valid movement");
}

export function isTrackingPausedState() {
  return isTrackingPaused;
}

export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function calculateSpeed(distanceMeters, timeDiffMs) {
  if (timeDiffMs <= 0) return 0;
  const hours = timeDiffMs / 3600000;
  return (distanceMeters / 1000) / hours;
}

export function calculateSmoothedSpeed(newSpeed) {
  if (newSpeed === null || newSpeed === undefined || isNaN(newSpeed)) return 0;
  
  speedHistory.push(newSpeed);
  if (speedHistory.length > TRACKING_CONFIG.SPEED_SMOOTHING_WINDOW) {
    speedHistory.shift();
  }
  
  const sum = speedHistory.reduce((acc, val) => acc + val, 0);
  return sum / speedHistory.length;
}

export function isValidMovement(currentLat, currentLon, previousLat, previousLon, timeDiffMs, accuracy = null) {
  if (previousLat === null || previousLon === null || timeDiffMs === null) {
    return { valid: true, distance: 0, speed: 0, timeDiffSeconds: 0, isFirstPoint: true };
  }
  
  const distance = haversineDistance(currentLat, currentLon, previousLat, previousLon);
  const timeDiffSeconds = timeDiffMs / 1000;
  
  if (timeDiffSeconds < TRACKING_CONFIG.MIN_TIME_DIFF_SECONDS) {
    return { valid: false, reason: "time_diff_below_threshold", distance: distance || 0, speed: 0, timeDiffSeconds };
  }

  if (accuracy !== null && accuracy !== undefined && accuracy > TRACKING_CONFIG.MAX_GPS_ACCURACY_METERS) {
    return { valid: false, reason: "gps_accuracy_too_high", distance: distance || 0, speed: 0, accuracy };
  }
  
  if (distance < TRACKING_CONFIG.MIN_DISTANCE_METERS) {
    return { valid: false, reason: "distance_below_threshold", distance: distance || 0, speed: 0, timeDiffSeconds };
  }

  const rawSpeed = calculateSpeed(distance, timeDiffMs);
  const speed = calculateSmoothedSpeed(rawSpeed);
  
  if (speed < TRACKING_CONFIG.MIN_SPEED_KMH) {
    return { valid: false, reason: "speed_below_threshold", distance: distance || 0, speed, timeDiffSeconds };
  }

  return { valid: true, distance, speed, timeDiffSeconds, accuracy, reason: null };
}

export async function getUserSessionState(userId, companyId) {
  const result = await pool.query(
    `SELECT session_state FROM user_tracking_sessions 
     WHERE user_id = $1 AND company_id = $2 AND session_state = 'ACTIVE'
     ORDER BY started_at DESC LIMIT 1`,
    [userId, companyId]
  );

  if (result.rows.length === 0) {
    return { state: SESSION_STATES.NOT_STARTED, sessionId: null };
  }

  return { state: result.rows[0].session_state, sessionId: result.rows[0].id };
}

export async function validateSessionActive(userId, companyId) {
  const sessionInfo = await getUserSessionState(userId, companyId);
  
  if (sessionInfo.state !== SESSION_STATES.ACTIVE) {
    return { 
      valid: false, 
      error: "SessionNotActive",
      message: "Tracking requires an active session. Please clock in first."
    };
  }

  return { valid: true, sessionId: sessionInfo.sessionId };
}

export async function validateJourneyRequired(userId, companyId, travelDate) {
  const journeyCheck = await pool.query(
    `SELECT id FROM location_logs 
     WHERE user_id = $1 AND company_id = $2 
     AND activity = 'JOURNEY_START'
     AND DATE(timestamp) = DATE($3)
     LIMIT 1`,
    [userId, companyId, travelDate || new Date()]
  );

  if (journeyCheck.rows.length === 0) {
    return {
      valid: false,
      error: "NoJourneyExists",
      message: "No journey found for today. Please start a journey before submitting expenses."
    };
  }

  return { valid: true, journeyId: journeyCheck.rows[0].id };
}

export function validateTrainMode(lat, lon, radiusKm = TRACKING_CONFIG.TRAIN_RADIUS_KM) {
  return {
    valid: true,
    message: "Train validation requires station proximity check via external API"
  };
}

export function getTransportModeFromRequest(body) {
  const modes = ["Car", "Bike", "Taxi", "Auto", "Train", "Bus", "Flight"];
  const mode = body.transport_mode || body.transportMode;
  
  if (mode && modes.includes(mode)) {
    return mode;
  }
  
  return null;
}

export function buildLogMetadata(req) {
  return {
    lat: req.body.latitude,
    lng: req.body.longitude,
    accuracy: req.body.accuracy,
    battery: req.body.battery,
    sessionState: req.body.sessionState,
    timestamp: new Date()
  };
}

export async function checkIdleTimeout(lastLogTimestamp) {
  if (!lastLogTimestamp) return true;
  
  const now = new Date();
  const diffMs = now - new Date(lastLogTimestamp);
  const diffMinutes = diffMs / 60000;
  
  return diffMinutes >= TRACKING_CONFIG.IDLE_TIMEOUT_MINUTES;
}

export function updateLastValidLocation(lat, lon, timestamp) {
  lastValidLocation = { lat, lon, timestamp };
  isTrackingActive = true;
  lastValidTimestamp = timestamp;
  wasIdle = false;
}

export function getLastValidLocation() {
  return lastValidLocation;
}

export function isIdle() {
  if (!lastValidTimestamp) return false;
  const now = new Date();
  const diffMs = now - lastValidTimestamp;
  const diffMinutes = diffMs / 60000;
  return diffMinutes >= TRACKING_CONFIG.IDLE_TIMEOUT_MINUTES;
}

export function checkAndResumeFromIdle(currentLat, currentLon) {
  if (!wasIdle || !lastValidLocation) return { resumed: false };
  
  const distance = haversineDistance(currentLat, currentLon, lastValidLocation.lat, lastValidLocation.lng);
  
  if (distance >= TRACKING_CONFIG.MIN_DISTANCE_METERS) {
    wasIdle = false;
    isTrackingActive = true;
    console.log(`▶️ RESUMED: Movement ${distance.toFixed(0)}m detected after idle`);
    return { resumed: true, distance };
  }
  
  return { resumed: false, distance };
}

export function stopTracking() {
  isTrackingActive = false;
  wasIdle = true;
  console.log("🛑 Tracking stopped due to idle timeout");
}

export function resumeTracking() {
  isTrackingActive = true;
  wasIdle = false;
  console.log("▶️ Tracking resumed after movement detected");
}

export function getTrackingState() {
  return { 
    isActive: isTrackingActive, 
    lastValidLocation, 
    lastValidTimestamp, 
    wasIdle,
    isPaused: isTrackingPaused,
    consecutiveInvalid: consecutiveInvalidCount
  };
}

export async function validateLocationLog(userId, companyId, latitude, longitude, accuracy, battery, timestamp, activity) {
  const errors = [];
  const warnings = [];
  let isInitial = false;
  
  if (isTrackingPaused) {
    return {
      valid: false,
      errors: [{ error: "TrackingPaused", message: "Tracking paused due to poor GPS signal. Move to clear area to resume." }],
      warnings,
      requiresResume: true
    };
  }
  
  // ALLOW CLOCK_IN and CLOCK_OUT without session validation - these CREATE/end sessions
  const isSessionActivity = activity === "CLOCK_IN" || activity === "CLOCK_OUT";
  
  if (!isSessionActivity) {
    const sessionValidation = await validateSessionActive(userId, companyId);
    if (!sessionValidation.valid) {
      errors.push({ error: sessionValidation.error, message: sessionValidation.message });
      return { valid: false, errors, warnings };
    }
  }
  
  const batteryValidation = validateBatteryData(battery, timestamp);
  if (!batteryValidation.valid) {
    errors.push({ error: "InvalidBatteryData", message: batteryValidation.reason });
  } else if (batteryValidation.batteryStale) {
    warnings.push({ warning: "BatteryStale", message: `Battery data is ${batteryValidation.ageSeconds?.toFixed(0)}s old` });
  }
  
  if (activity && activity !== "CLOCK_IN" && activity !== "CLOCK_OUT") {
    const lastValid = getLastValidLocation();
    
    if (!lastValid) {
      isInitial = true;
      warnings.push({ warning: "InitialPoint", message: "First tracking point - initializing" });
      updateLastValidLocation(latitude, longitude, new Date());
    } else {
      const timeDiffMs = Date.now() - lastValid.timestamp;
      const movementCheck = isValidMovement(latitude, longitude, lastValid.lat, lastValid.lng, timeDiffMs, accuracy);
      
      if (!movementCheck.valid) {
        warnings.push({ warning: movementCheck.reason, message: `Movement validation failed: ${movementCheck.reason}` });
        
        if (shouldPauseTracking(accuracy, true)) {
          isTrackingPaused = true;
          return {
            valid: false,
            errors: [{ error: "TrackingPaused", message: "Too many invalid readings. Move to clear area." }],
            warnings,
            requiresResume: true
          };
        }
      } else {
        if (shouldPauseTracking(accuracy, false)) {
          isTrackingPaused = true;
          return {
            valid: false,
            errors: [{ error: "TrackingPaused", message: "GPS accuracy too poor. Move to clear area." }],
            warnings,
            requiresResume: true
          };
        }
      }
      
      const resumeCheck = checkAndResumeFromIdle(latitude, longitude);
      if (resumeCheck.resumed) {
        warnings.push({ warning: "TrackingResumed", message: `Tracking resumed after ${resumeCheck.distance.toFixed(0)}m movement` });
      }
    }
  }
  
  if (isIdle() && activity !== "CLOCK_IN") {
    const lastValid = getLastValidLocation();
    if (lastValid) {
      const distance = haversineDistance(latitude, longitude, lastValid.lat, lastValid.lng);
      if (distance < TRACKING_CONFIG.MIN_DISTANCE_METERS) {
        return { 
          valid: false, 
          errors: [{ error: "IdleState", message: "Tracking paused - no valid movement for 5 minutes" }],
          warnings,
          resumeOnMovement: true
        };
      } else {
        wasIdle = false;
        isTrackingActive = true;
        warnings.push({ warning: "TrackingResumed", message: `Tracking resumed after ${distance.toFixed(0)}m movement` });
      }
    }
  }
  
  return { valid: true, errors, warnings, isInitial };
}

export function shouldSkipApiCall(lastLogTimestamp, sessionActive) {
  if (!sessionActive) return true;
  
  return checkIdleTimeout(lastLogTimestamp);
}

export async function validateTrainStation(lat, lon, radiusKm = TRACKING_CONFIG.TRAIN_RADIUS_KM) {
  const radiusMeters = radiusKm * 1000;
  
  const result = await pool.query(
    `SELECT id, station_name, city, latitude, longitude,
     ST_Distance(
       ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
       ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
     ) / 1000 as distance_km
     FROM train_stations
     WHERE ST_DWithin(
       ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
       ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
       $3
     )
     ORDER BY distance_km ASC
     LIMIT 1`,
    [lon, lat, radiusMeters]
  );

  if (result.rows.length === 0) {
    return {
      valid: false,
      error: "NoTrainStationNearby",
      message: `No train station found within ${radiusKm}km radius`
    };
  }

  const station = result.rows[0];
  return {
    valid: true,
    station: {
      id: station.id,
      name: station.station_name,
      city: station.city,
      distanceKm: parseFloat(station.distance_km)
    }
  };
}

export function buildMultiLegJourney(legs, baseDistanceKm) {
  if (!legs || legs.length === 0) return [];

  const processedLegs = [];
  let cumulativeDistance = 0;

  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    
    if (i > 0) {
      const previousLeg = processedLegs[i - 1];
      if (!leg.start_location && previousLeg.end_location) {
        leg.start_location = previousLeg.end_location;
      }
    }

    cumulativeDistance += parseFloat(leg.distance_km || 0);

    processedLegs.push({
      legNumber: i + 1,
      startLocation: leg.start_location,
      endLocation: leg.end_location,
      distanceKm: leg.distance_km,
      transportMode: leg.transport_mode,
      amountSpent: leg.amount_spent
    });
  }

  return {
    legs: processedLegs,
    totalDistanceKm: cumulativeDistance
  };
}

export async function getLastJourneyEndLocation(userId, companyId) {
  const result = await pool.query(
    `SELECT end_location, ended_at FROM travel_logs 
     WHERE user_id = $1 AND company_id = $2
     ORDER BY ended_at DESC NULLS LAST
     LIMIT 1`,
    [userId, companyId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].end_location;
}

export async function validateExpenseFull(userId, companyId, travelDate) {
  const journeyCheck = await pool.query(
    `SELECT id FROM location_logs 
     WHERE user_id = $1 AND company_id = $2 
     AND activity = 'JOURNEY_START'
     AND DATE(timestamp) = DATE($3)
     LIMIT 1`,
    [userId, companyId, travelDate || new Date()]
  );

  if (journeyCheck.rows.length === 0) {
    return {
      valid: false,
      error: "NoJourneyExists",
      message: "No journey found for today. Please start a journey before submitting expenses."
    };
  }

  const validLogsResult = await pool.query(
    `SELECT COUNT(*) as valid_count, COALESCE(SUM(distance_delta), 0) as total_distance
     FROM location_logs
     WHERE user_id = $1 AND company_id = $2 
     AND DATE(timestamp) = DATE($3)
     AND validated = true`,
    [userId, companyId, travelDate || new Date()]
  );

  const validCount = parseInt(validLogsResult.rows[0].valid_count);
  const totalDistance = parseFloat(validLogsResult.rows[0].total_distance) || 0;

  if (validCount < TRACKING_CONFIG.MIN_VALID_LOGS_FOR_EXPENSE) {
    return {
      valid: false,
      error: "InsufficientValidLogs",
      message: `At least ${TRACKING_CONFIG.MIN_VALID_LOGS_FOR_EXPENSE} valid travel logs required. Found: ${validCount}`
    };
  }

  if (totalDistance < TRACKING_CONFIG.MIN_EXPENSE_DISTANCE_METERS) {
    return {
      valid: false,
      error: "InsufficientTravelDistance",
      message: `Total travel distance must be at least ${TRACKING_CONFIG.MIN_EXPENSE_DISTANCE_METERS}m. Found: ${totalDistance.toFixed(0)}m`
    };
  }

  return {
    valid: true,
    journeyId: journeyCheck.rows[0].id,
    validLogs: validCount,
    totalDistance: totalDistance
  };
}

export function validateBatteryData(battery, timestamp) {
  if (battery === undefined || battery === null) {
    return { valid: true, reason: null, batteryStale: false };
  }

  if (battery < 0 || battery > 100) {
    return { valid: false, reason: "battery_out_of_range", batteryStale: false };
  }

  if (timestamp) {
    const ageSeconds = (Date.now() - new Date(timestamp).getTime()) / 1000;
    if (ageSeconds > TRACKING_CONFIG.BATTERY_DATA_MAX_AGE_SECONDS) {
      return { valid: true, reason: "battery_data_stale", batteryStale: true, ageSeconds };
    }
  }

  return { valid: true, reason: null, batteryStale: false };
}

export function buildMultiLegChaining(legs) {
  if (!legs || legs.length === 0) return legs;

  const chainedLegs = [];
  
  for (let i = 0; i < legs.length; i++) {
    const leg = { ...legs[i] };
    
    if (i > 0) {
      const prevEnd = chainedLegs[i - 1].end_location || chainedLegs[i - 1].endLocation;
      if (prevEnd) {
        leg.start_location = prevEnd;
      }
    }
    
    chainedLegs.push(leg);
  }

  return chainedLegs;
}

export function logValidationDebug(logData) {
  console.log("📍 VALIDATION DEBUG:", JSON.stringify({
    lat: logData.lat,
    lng: logData.lng,
    distanceDelta: logData.distanceDelta,
    speed: logData.speed,
    accuracy: logData.accuracy,
    battery: logData.battery,
    sessionState: logData.sessionState,
    validated: logData.validated,
    validationReason: logData.validationReason,
    timestamp: new Date().toISOString()
  }, null, 2));
}