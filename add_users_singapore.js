// add_users_singapore.js
import pg from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// Singapore Production Database
const SINGAPORE_DB_URL = "postgresql://geotrackdb_user:gDBJB8LnmVT6UrIwKwv7uI13LH9BPMGp@dpg-d4rqmoc9c44c738du6dg-a.singapore-postgres.render.com/geotrackdb";

const pool = new Pool({
  connectionString: SINGAPORE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function addUsers() {
  console.log("==============================================");
  console.log("🔐 Adding Users to Singapore Production DB");
  console.log("==============================================\n");

  try {
    // Test connection
    await pool.query("SELECT NOW()");
    console.log("✅ Connected to Singapore database\n");

    const users = [
      {
        email: "admin@test.com",
        password: "admin123",
        fullName: "Test Admin",
        isAdmin: true,
        isSuperAdmin: false
      },
      {
        email: "agent@test.com",
        password: "agent123",
        fullName: "Test Agent",
        isAdmin: false,
        isSuperAdmin: false
      }
    ];

    for (const user of users) {
      console.log(`📝 Processing ${user.email}...`);
      
      // Check if user exists
      const existing = await pool.query(
        "SELECT id, email FROM users WHERE email = $1",
        [user.email]
      );

      const hashedPassword = await bcrypt.hash(user.password, 10);

      if (existing.rows.length > 0) {
        // Update existing user
        await pool.query(
          `UPDATE users 
           SET password = $1, full_name = $2, is_admin = $3, is_super_admin = $4, updated_at = NOW()
           WHERE email = $5`,
          [hashedPassword, user.fullName, user.isAdmin, user.isSuperAdmin, user.email]
        );
        console.log(`   ✅ Updated existing user: ${user.email}`);
      } else {
        // Create new user
        await pool.query(
          `INSERT INTO users (id, email, password, full_name, is_admin, is_super_admin, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())`,
          [user.email, hashedPassword, user.fullName, user.isAdmin, user.isSuperAdmin]
        );
        console.log(`   ✅ Created new user: ${user.email}`);
      }
    }

    console.log("\n==============================================");
    console.log("✅ Users added successfully!");
    console.log("==============================================");
    console.log("\n📝 Test Credentials:");
    console.log("   Admin: admin@test.com / admin123");
    console.log("   Agent: agent@test.com / agent123");

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

addUsers();
