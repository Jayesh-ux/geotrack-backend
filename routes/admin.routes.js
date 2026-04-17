import express from "express";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";
import { attachCompanyContext } from "../middleware/company.js"; // ✅ ADD THIS
import { asyncHandler } from "../middleware/errorHandler.js";
import * as adminController from "../controllers/admin.controller.js";

const router = express.Router();

// ✅ FIXED: All admin routes require authentication + company context + admin role
router.use(authenticateToken, attachCompanyContext, requireAdmin);

// Existing routes
router.get("/clients", asyncHandler(adminController.getAllClients));
router.get("/users", asyncHandler(adminController.getAllUsers));
router.get("/analytics", asyncHandler(adminController.getAnalytics));
router.get("/stats", asyncHandler(adminController.getDashboardStats));
router.get("/location-logs/:userId", asyncHandler(adminController.getUserLocationLogs));
router.get("/clock-status/:userId", asyncHandler(adminController.getClockStatus));
router.get("/expenses/summary", asyncHandler(adminController.getExpensesSummary));
router.get("/user-meetings/:userId", asyncHandler(adminController.getUserMeetings));
router.get("/user-expenses/:userId", asyncHandler(adminController.getUserExpenses));
router.get("/check", asyncHandler(adminController.checkAdminStatus));
router.get("/team-locations", asyncHandler(adminController.getTeamLocations)); // NEW ROUTE FOR ANDROID MAP
router.get("/agents/live", asyncHandler(adminController.getLiveAgents)); // ✅ Android App Live Map
router.get("/daily-summary", asyncHandler(adminController.getAdminDailySummary)); // ✅ Android App Admin Dashboard
router.get("/client-services", asyncHandler(adminController.getClientServices)); // Missing route

// NEW USER MANAGEMENT ROUTES
router.post("/users", asyncHandler(adminController.createUser));
router.get("/users/:userId", asyncHandler(adminController.getUserDetails));
router.put("/users/:userId", asyncHandler(adminController.updateUser));
router.patch("/users/:userId/status", asyncHandler(adminController.updateUser)); // ✅ Android App updateUserStatus
router.delete("/users/:userId", asyncHandler(adminController.deleteUser));
router.post("/users/:userId/reset-password", asyncHandler(adminController.resetUserPassword));

// ✅ UNIFIED JOURNEY REPORT
router.get("/users/:userId/unified-journey", asyncHandler(adminController.getUnifiedJourney));
router.get("/journey/:userId/:date", async (req, res, next) => {
    req.query.date = req.params.date; // Map path param to query param expected by getUnifiedJourney
    return adminController.getUnifiedJourney(req, res, next);
});

router.patch("/clients/:id/location", asyncHandler(adminController.updateClientLocation));

// ============================================
// SET CLIENT LOCATION (Phase 2 - Admin pins location)
// ============================================
router.post("/clients/:id/set-location", asyncHandler(adminController.setClientLocation));

// ============================================
// MISSING LOCATIONS REPORT (Most Important)
// ============================================
router.get("/clients/missing-locations", asyncHandler(adminController.getMissingLocations));

// ============================================
// LOCATION REPORT (Admin dashboard)
// ============================================
router.get("/clients/location-report", asyncHandler(adminController.getLocationReport));

export default router;