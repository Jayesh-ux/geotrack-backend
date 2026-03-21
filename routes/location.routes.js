import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { 
  blockTrialUserWrites, 
  enforceTrialUserLimits 
} from "../middleware/trialUser.js";  // ← NEW IMPORT
import * as locationController from "../controllers/location.controller.js";

const router = express.Router();

// ============================================
// CREATE LOCATION LOG
// ============================================
// Blocked for trial users (trial users can't track location)
router.post("/", 
  authenticateToken,
  blockTrialUserWrites,  // ← NEW: Block trial users
  asyncHandler(locationController.createLocationLog)
);

// ============================================
// GET LOCATION LOGS
// ============================================
// Allow trial users with limits
router.get("/", 
  authenticateToken,
  enforceTrialUserLimits,  // ← NEW: Allow trial users
  asyncHandler(locationController.getLocationLogs)
);

// ============================================
// GET CLOCK-IN STATUS
// ============================================
// Allow trial users
router.get("/clock-in", 
  authenticateToken,
  enforceTrialUserLimits,  // ← NEW: Allow trial users
  asyncHandler(locationController.getClockIn)
);

// ============================================
// GET DAILY SUMMARY (distance + meetings + expenses in one call)
// ============================================
router.get("/daily-summary",
  authenticateToken,
  enforceTrialUserLimits,
  asyncHandler(locationController.getDailySummary)
);

export default router;