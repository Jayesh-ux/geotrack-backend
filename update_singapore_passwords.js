// update_singapore_passwords.js
import pg from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const SINGAPORE_DB_URL = "postgresql://geotrackdb_user:gDBJB8LnmVT6UrIwKwv7uI13LH9BPMGp@dpg-d4rqmoc9c44c738du6dg-a.singapore-postgres.render.com/geotrackdb";

const pool = new Pool({
  connectionString: SINGAPORE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function updatePasswords() {
  console.log("==============================================");
  console.log("🔐 Updating User Passwords in Singapore DB");
  console.log("==============================================\n");

  try {
    await pool.query("SELECT NOW()");
    console.log("✅ Connected to Singapore database\n");

    const users = [
      { email: "admin@test.com", password: "admin123", isAdmin: true },
      { email: "agent@test.com", password: "agent123", isAdmin: false }
    ];

    for (const user of users) {
      console.log(`📝 Updating ${user.email}...`);
      
      const existing = await pool.query(
        "SELECT id, email, is_admin FROM users WHERE email = $1",
        [user.email]
      );

      if (existing.rows.length === 0) {
        console.log(`   ⚠️  User not found: ${user.email}`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(user.password, 10);

      await pool.query(
        `UPDATE users 
         SET password = $1, is_admin = $2, updated_at = NOW()
         WHERE email = $3`,
        [hashedPassword, user.isAdmin, user.email]
      );

      console.log(`   ✅ Password updated for: ${user.email}`);
    }

    console.log("\n==============================================");
    console.log("✅ Passwords updated successfully!");
    console.log("==============================================");
    console.log("\n📝 Login Credentials:");
    console.log("   Admin: admin@test.com / admin123");
    console.log("   Agent: agent@test.com / agent123");

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

updatePasswords();
