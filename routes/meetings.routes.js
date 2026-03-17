// routes/meetings.routes.js
// FINAL VERSION: With plan limitations + trial user restrictions

import express from "express";
import multer from "multer";
import { authenticateToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { checkMeetingAttachmentUpload } from "../middleware/featureAuth.js";
import {
  blockTrialUserWrites,
  enforceTrialUserLimits
} from "../middleware/trialUser.js";  // ← NEW IMPORT
import { attachCompanyContext } from "../middleware/company.js";
import { attachPlanFeatures } from "../middleware/featureAuth.js";
import * as meetingsController from "../controllers/meetings.controller.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ============================================
// START MEETING
// ============================================
// Blocked for trial users
router.post("/",
  authenticateToken,
  attachCompanyContext,
  attachPlanFeatures,
  blockTrialUserWrites,  // ← NEW: Block trial users
  asyncHandler(meetingsController.startMeeting)
);

// ============================================
// GET ACTIVE MEETING
// ============================================
// Allow trial users with limits
router.get("/active/:clientId",
  authenticateToken,
  attachCompanyContext,
  attachPlanFeatures,
  enforceTrialUserLimits,  // ← NEW: Allow trial users
  asyncHandler(meetingsController.getActiveMeeting)
);

// ============================================
// GET MEETING BY ID
// ============================================
// Allow trial users with limits
router.get("/:id",
  authenticateToken,
  attachCompanyContext,
  attachPlanFeatures,
  enforceTrialUserLimits,  // ← NEW: Allow trial users
  asyncHandler(meetingsController.getMeetingById)
);

// ============================================
// GET ALL MEETINGS
// ============================================
// Allow trial users with limits
router.get("/",
  authenticateToken,
  attachCompanyContext,
  attachPlanFeatures,
  enforceTrialUserLimits,  // ← NEW: Allow trial users
  asyncHandler(meetingsController.getMeetings)
);

// ============================================
// UPDATE MEETING
// ============================================
// Blocked for trial users
router.put("/:id",
  authenticateToken,
  attachCompanyContext,
  attachPlanFeatures,
  blockTrialUserWrites,  // ← NEW: Block trial users
  asyncHandler(meetingsController.updateMeeting)
);

// ============================================
// DELETE MEETING
// ============================================
// Blocked for trial users
router.delete("/:id",
  authenticateToken,
  attachCompanyContext,
  attachPlanFeatures,
  blockTrialUserWrites,  // ← NEW: Block trial users
  asyncHandler(meetingsController.deleteMeeting)
);

// ============================================
// UPLOAD MEETING ATTACHMENT
// ============================================
// Blocked for trial users
router.post("/:id/attachments",
  authenticateToken,
  blockTrialUserWrites,  // ← NEW: Block trial users
  upload.single("file"),
  checkMeetingAttachmentUpload,
  asyncHandler(meetingsController.uploadAttachment)
);

export default router;