// find_default_company_admin.js
import pkg from "pg";
const { Pool } = pkg;
import bcrypt from "bcryptjs";
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

async function findDefaultCompanyAdmin() {
    console.log("==============================================");
    console.log("🔍 Finding Super Admin for Default Company");
    console.log("==============================================\n");

    try {
        // Find users in Default Company
        const result = await pool.query(`
            SELECT u.id, u.email, u.is_admin, u.is_super_admin, u.password,
                   p.full_name, c.name as company_name, c.id as company_id
            FROM users u
            JOIN profiles p ON u.id = p.user_id
            JOIN companies c ON u.company_id = c.id
            WHERE c.name = 'Default Company'
            ORDER BY u.is_super_admin DESC, u.is_admin DESC
        `);

        console.log(`Found ${result.rows.length} users in Default Company:\n`);
        
        for (const user of result.rows) {
            console.log(`Name: ${user.full_name}`);
            console.log(`Email: ${user.email}`);
            console.log(`is_admin: ${user.is_admin}`);
            console.log(`is_super_admin: ${user.is_super_admin}`);
            console.log(`Company: ${user.company_name}`);
            console.log("---");
        }

        // Find the superadmin in Default Company
        const superAdmin = result.rows.find(u => u.is_super_admin);
        
        if (superAdmin) {
            console.log("\n==============================================");
            console.log("👑 SUPER ADMIN FOR DEFAULT COMPANY");
            console.log("==============================================");
            console.log(`Name: ${superAdmin.full_name}`);
            console.log(`Email: ${superAdmin.email}`);
            console.log(`Company: ${superAdmin.company_name}`);
            
            // Test common passwords
            const testPasswords = ['admin123', 'password', 'admin', 'password123', 'Admin@123'];
            
            console.log("\nTesting passwords...");
            
            for (const pwd of testPasswords) {
                const valid = await bcrypt.compare(pwd, superAdmin.password);
                if (valid) {
                    console.log(`\n✅ FOUND PASSWORD: "${pwd}"`);
                    break;
                }
            }
            
            // If no password found, reset it
            console.log("\n⚠️  Setting password to 'admin123'...");
            const hashedPassword = await bcrypt.hash("admin123", 10);
            await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, superAdmin.id]);
            console.log("✅ Password reset to 'admin123'");
            
            console.log("\n==============================================");
            console.log("🔑 FINAL CREDENTIALS");
            console.log("==============================================");
            console.log(`Email: ${superAdmin.email}`);
            console.log(`Password: admin123`);
        }

    } catch (err) {
        console.error("❌ Error:", err.message);
    }

    await pool.end();
}

findDefaultCompanyAdmin();
