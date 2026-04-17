// create_admin.js
import pkg from "pg";
const { Pool } = pkg;
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import crypto from "crypto";

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
    console.log("👤 Creating Admin User");
    console.log("==============================================\n");

    const email = "admin@geotrack.com";
    const password = "admin123";
    const fullName = "Admin User";

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const userId = crypto.randomUUID();
        
        await pool.query(
            `INSERT INTO users (id, email, password, is_admin, is_super_admin, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (email) DO NOTHING`,
            [userId, email, hashedPassword, true, true]
        );

        await pool.query(
            `INSERT INTO profiles (user_id, full_name, email)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [userId, fullName, email]
        );

        console.log("✅ Admin user created successfully!");
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 Password: ${password}`);
        console.log(`🆔 User ID: ${userId}`);
        
    } catch (err) {
        if (err.code === "23505") {
            console.log("⚠️  Admin user already exists!");
            const result = await pool.query("SELECT id, email FROM users WHERE email = $1", [email]);
            if (result.rows.length > 0) {
                console.log(`📧 Existing email: ${result.rows[0].email}`);
                console.log(`🆔 Existing user ID: ${result.rows[0].id}`);
            }
        } else {
            console.error("❌ Error:", err.message);
        }
    }

    await pool.end();
}

createAdmin();
