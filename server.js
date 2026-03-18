// server.js
console.log("==========================================");
console.log("🚀 BACKEND STARTING UP...");
console.log("📅 TIME:", new Date().toISOString());
console.log("🔌 PORT:", process.env.PORT || 5000);
console.log("🌍 NODE_ENV:", process.env.NODE_ENV);
console.log("==========================================");

import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { pool } from "./db.js";
import { CORS_ORIGIN, PORT } from "./config/constants.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authenticateToken } from "./middleware/auth.js";
import { attachCompanyContext } from "./middleware/company.js";
import { attachPlanFeatures } from "./middleware/featureAuth.js";
import { startBackgroundGeocode } from "./utils/geocodeBatch.js";

// Route imports
import authRoutes from "./routes/auth.routes.js";
import clientRoutes from "./routes/clients.routes.js";
import locationRoutes from "./routes/location.routes.js";
import meetingRoutes from "./routes/meetings.routes.js";
import expenseRoutes from "./routes/expenses.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import syncRoutes from "./routes/sync.routes.js";
import servicesRoutes from './routes/services.routes.js';
import manualClientRoutes from './routes/manualClient.routes.js';
import companyRoutes from './routes/company.routes.js';
import integrationRoutes from "./routes/integrations.routes.js";
import licenseRoutes from './routes/license.routes.js';
import planRoutes from './routes/plan.routes.js'; // ← NEW
import quickVisitsRoutes from './routes/quickVisits.routes.js';

const app = express();

// IMMEDIATE HEALTH CHECK
app.get("/ping", (req, res) => res.status(200).send("PONG - Server is alive"));

// Middleware
app.use(cors({
  origin: CORS_ORIGIN,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-company-id"]
}));
app.options("*", cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`🔥 ${req.method} ${req.path}`);
  next();
});

// Test DB connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
  } else {
    console.log("✅ Database connected successfully");
  }
});

// ============================================
// PUBLIC ROUTES (No Authentication)
// ============================================
app.use("/auth", authRoutes);
app.use("/integrations", integrationRoutes);

// ============================================
// PLAN MANAGEMENT ROUTES (Authenticated)
// ============================================
app.use("/api/plans", authenticateToken, attachCompanyContext, planRoutes);

// ============================================
// LICENSE ROUTES (Authenticated)
// ============================================
app.use("/api/license", authenticateToken, licenseRoutes);

// ============================================
// COMPANY-SCOPED ROUTES (Authenticated + Company Context + Plan Features)
// ============================================
// ⚠️ IMPORTANT: attachPlanFeatures adds req.planFeatures to all these routes
app.use("/clients", 
  authenticateToken, 
  attachCompanyContext, 
  attachPlanFeatures,  // ← NEW: Attaches plan features
  clientRoutes
);

app.use("/location-logs", 
  authenticateToken, 
  attachCompanyContext, 
  attachPlanFeatures,  // ← NEW
  locationRoutes
);

app.use("/api/quick-visits", 
  authenticateToken, 
  attachCompanyContext, 
  attachPlanFeatures,
  quickVisitsRoutes
);

app.use("/meetings", 
  authenticateToken, 
  attachCompanyContext, 
  attachPlanFeatures,  // ← NEW
  meetingRoutes
);

app.use("/expenses", 
  authenticateToken, 
  attachCompanyContext, 
  attachPlanFeatures,  // ← NEW
  expenseRoutes
);

app.use('/services', 
  authenticateToken, 
  attachCompanyContext, 
  attachPlanFeatures,  // ← NEW
  servicesRoutes
);

app.use('/api/manual-clients', 
  authenticateToken, 
  attachCompanyContext, 
  attachPlanFeatures,  // ← NEW
  manualClientRoutes
);

// ============================================
// ADMIN ROUTES (Company Admin + Plan Features)
// ============================================
app.use("/admin", 
  authenticateToken, 
  attachCompanyContext, 
  attachPlanFeatures,  // ← NEW
  adminRoutes
);

// ============================================
// SUPER ADMIN ROUTES (Cross-Company Management)
// ============================================
app.use("/super-admin/companies", companyRoutes);

// ============================================
// SYNC ROUTES
// ============================================
app.use("/api/sync", syncRoutes);

// ============================================
// HEALTH CHECK
// ============================================
app.get("/", (req, res) => {
  res.json({ 
    message: "Multi-Company Client Tracking API with Plan-Based Limitations",
    version: "2.1.0",
    features: [
      "company-scoped", 
      "super-admin", 
      "pincode-filtering",
      "plan-based-limitations"  // ← NEW
    ]
  });
});

app.get("/dbtest", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    const companyCount = await pool.query("SELECT COUNT(*) FROM companies");
    const planCount = await pool.query("SELECT COUNT(*) FROM plan_features");
    
    res.json({ 
      db_time: result.rows[0].now,
      companies: parseInt(companyCount.rows[0].count),
      plans_configured: parseInt(planCount.rows[0].count)  // ← NEW
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// EMERGENCY SEED ROUTE (Remove after use)
// ============================================
app.get("/force-seed-active-db", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    const password = "password123";
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // 1. Ensure a test company exists
    let finalCompanyId;
    const checkCompany = await client.query("SELECT id FROM companies WHERE subdomain = $1", ["test"]);
    if (checkCompany.rows.length > 0) {
      finalCompanyId = checkCompany.rows[0].id;
    } else {
      finalCompanyId = crypto.randomUUID();
      await client.query(
        "INSERT INTO companies (id, name, subdomain) VALUES ($1, $2, $3)",
        [finalCompanyId, "Lodha Supremus Enterprises", "test"]
      );
    }

    // 2. Create Users
    const users = [
      { email: "admin@test.com", isAdmin: true, name: "Admin User" },
      { email: "agent@test.com", isAdmin: false, name: "Agent User" }
    ];

    for (const u of users) {
      let userId;
      const checkUser = await client.query("SELECT id FROM users WHERE email = $1", [u.email]);
      
      if (checkUser.rows.length > 0) {
        userId = checkUser.rows[0].id;
        await client.query(
          "UPDATE users SET password = $1, is_admin = $2, company_id = $3 WHERE id = $4",
          [hash, u.isAdmin, finalCompanyId, userId]
        );
      } else {
        userId = crypto.randomUUID();
        await client.query(
          "INSERT INTO users (id, email, password, is_admin, company_id) VALUES ($1, $2, $3, $4, $5)",
          [userId, u.email, hash, u.isAdmin, finalCompanyId]
        );
      }
      
      // Update/Insert profile
      const checkProfile = await client.query("SELECT id FROM profiles WHERE user_id = $1", [userId]);
      if (checkProfile.rows.length === 0) {
        await client.query(
          "INSERT INTO profiles (user_id, full_name) VALUES ($1, $2)",
          [userId, u.name]
        );
      } else {
        await client.query(
          "UPDATE profiles SET full_name = $1 WHERE user_id = $2",
          [u.name, userId]
        );
      }
    }

    // 3. Clear and Seed 10 Clients (Fresh start to ensure visibility)
    await client.query("DELETE FROM clients WHERE company_id = $1", [finalCompanyId]);
    const centerLat = 19.19825;
    const centerLng = 72.94904;
    for (let i = 1; i <= 10; i++) {
      const latDelta = (Math.random() - 0.5) * 0.01;
      const lngDelta = (Math.random() - 0.5) * 0.01;
      await client.query(
        "INSERT INTO clients (id, name, address, pincode, latitude, longitude, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [crypto.randomUUID(), `Client ${i}`, `Address near Lodha ${i}`, "400604", centerLat + latDelta, centerLng + lngDelta, finalCompanyId]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Seeding complete!", companyId: finalCompanyId, users: users.map(u => u.email) });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🏢 Multi-company mode enabled`);
  console.log(`📍 Pincode-based filtering enabled`);
  console.log(`💎 Plan-based limitations enabled`);  // ← NEW
  console.log(`📦 Request body limit: 10mb`);
});