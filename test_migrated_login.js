// test_migrated_login.js
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
    console.log("🔐 Testing Login with Migrated Data");
    console.log("==============================================\n");

    try {
        // Get admin users
        const admins = await pool.query(`
            SELECT u.id, u.email, u.password, u.is_admin, u.is_super_admin, p.full_name
            FROM users u 
            LEFT JOIN profiles p ON u.id = p.user_id 
            WHERE u.is_admin = true OR u.is_super_admin = true
            LIMIT 5
        `);

        console.log(`Found ${admins.rows.length} admin users:\n`);
        
        for (const admin of admins.rows) {
            console.log(`📧 Email: ${admin.email}`);
            console.log(`   Name: ${admin.full_name || 'N/A'}`);
            console.log(`   is_admin: ${admin.is_admin}`);
            console.log(`   is_super_admin: ${admin.is_super_admin}`);
            console.log(`   password_hash: ${admin.password.substring(0, 20)}...`);
            console.log("");
        }

        // Test login with first admin
        if (admins.rows.length > 0) {
            const admin = admins.rows[0];
            console.log(`Testing login for: ${admin.email}`);
            
            // Try common passwords
            const passwords = ['admin123', 'password', 'Password@123', 'admin', 'test123'];
            
            for (const pwd of passwords) {
                const valid = await bcrypt.compare(pwd, admin.password);
                if (valid) {
                    console.log(`\n✅ PASSWORD FOUND: "${pwd}"`);
                    console.log("\n✅ LOGIN TEST PASSED!");
                    console.log(`\n📝 Admin credentials:`);
                    console.log(`   Email: ${admin.email}`);
                    console.log(`   Password: ${pwd}`);
                    break;
                }
            }
        }
        
    } catch (err) {
        console.error("❌ Error:", err.message);
    }

    await pool.end();
}

testLogin();
