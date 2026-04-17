// test_login.js
import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

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

async function testLogin() {
    console.log("==============================================");
    console.log("🔐 Testing Login Functionality");
    console.log("==============================================\n");

    const email = "admin@geotrack.com";
    const password = "admin123";

    try {
        const result = await pool.query(
            `SELECT u.*, p.full_name 
             FROM users u 
             LEFT JOIN profiles p ON u.id = p.user_id 
             WHERE u.email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            console.log("❌ User not found!");
            return;
        }

        const user = result.rows[0];
        console.log(`✅ User found: ${user.email}`);
        console.log(`   is_admin: ${user.is_admin}`);
        console.log(`   is_super_admin: ${user.is_super_admin}`);
        console.log(`   full_name: ${user.full_name}`);

        const validPassword = await bcrypt.compare(password, user.password);
        console.log(`   password_valid: ${validPassword}`);

        if (validPassword) {
            console.log("\n✅ LOGIN TEST PASSED!");
        } else {
            console.log("\n❌ LOGIN TEST FAILED - Wrong password!");
        }
        
    } catch (err) {
        console.error("❌ Error:", err.message);
    }

    await pool.end();
}

testLogin();
