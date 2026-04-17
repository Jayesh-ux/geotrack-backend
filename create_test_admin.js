// create_test_admin.js
import pkg from "pg";
const { Pool } = pkg;
import bcrypt from "bcryptjs";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

const pool = new Pool(
    connectionString
        ? {
            connectionString: connectionString,
            ssl: { rejectUnauthorized: false }
        }
        : {
            user: process.env.DB_USER || "postgres",
            host: process.env.DB_HOST || "localhost",
            database: process.env.DB_NAME || "client_tracking_app",
            password: process.env.DB_PASSWORD || "root",
            port: parseInt(process.env.DB_PORT) || 5432,
        }
);

async function createAdmin() {
    console.log("==============================================");
    console.log("👤 Creating Test Admin User");
    console.log("==============================================\n");

    const email = "admin@test.com";
    const password = "admin123";
    const fullName = "Test Admin";

    try {
        // Check if exists
        const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
        
        if (existing.rows.length > 0) {
            console.log("⚠️  User exists, updating password...");
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query("UPDATE users SET password = $1, is_admin = true, is_super_admin = true WHERE email = $2", [hashedPassword, email]);
        } else {
            console.log("📝 Creating new user...");
            const hashedPassword = await bcrypt.hash(password, 10);
            const userId = crypto.randomUUID();
            
            await pool.query(`
                INSERT INTO users (id, email, password, is_admin, is_super_admin, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            `, [userId, email, hashedPassword, true, true]);

            await pool.query(`
                INSERT INTO profiles (id, user_id, full_name, created_at, updated_at)
                VALUES ($1, $2, $3, NOW(), NOW())
            `, [crypto.randomUUID(), userId, fullName]);
        }

        // Verify
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (user.rows.length > 0) {
            console.log("✅ Admin user created/updated successfully!");
            console.log(`\n📝 Test Credentials:`);
            console.log(`   Email: ${email}`);
            console.log(`   Password: ${password}`);
            
            // Verify password works
            const valid = await bcrypt.compare(password, user.rows[0].password);
            console.log(`   Password Valid: ${valid ? '✅' : '❌'}`);
        }
        
    } catch (err) {
        console.error("❌ Error:", err.message);
    }

    await pool.end();
}

createAdmin();
