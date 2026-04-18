import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { 
  blockTrialUserWrites, 
  enforceTrialUserLimits 
} from "../middleware/trialUser.js";
import * as locationController from "../controllers/location.controller.js";

const router = express.Router();

router.post("/", 
  authenticateToken,
  blockTrialUserWrites,
  asyncHandler(locationController.createLocationLog)
);

router.get("/", 
  authenticateToken,
  enforceTrialUserLimits,
  asyncHandler(locationController.getLocationLogs)
);

router.get("/clock-in", 
  authenticateToken,
  enforceTrialUserLimits,
  asyncHandler(locationController.getClockIn)
);

router.get("/daily-summary",
  authenticateToken,
  enforceTrialUserLimits,
  asyncHandler(locationController.getDailySummary)
);

router.get("/tracking-state",
  authenticateToken,
  enforceTrialUserLimits,
  asyncHandler(locationController.getTrackingStateEndpoint)
);

router.post("/clock-in",
  authenticateToken,
  blockTrialUserWrites,
  asyncHandler(locationController.clockIn)
);

router.post("/clock-out",
  authenticateToken,
  blockTrialUserWrites,
  asyncHandler(locationController.clockOut)
);

router.post("/pause",
  authenticateToken,
  blockTrialUserWrites,
  asyncHandler(locationController.pauseSession)
);

router.post("/resume",
  authenticateToken,
  blockTrialUserWrites,
  asyncHandler(locationController.resumeSession)
);

router.post("/resume-tracking",
  authenticateToken,
  blockTrialUserWrites,
  asyncHandler(locationController.resumeTrackingFromPauseEndpoint)
);

export default router;