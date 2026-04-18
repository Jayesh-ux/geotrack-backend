// create_test_credentials.js
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

async function createTestCredentials() {
    console.log("==============================================");
    console.log("🔑 CREATING TEST CREDENTIALS");
    console.log("==============================================\n");

    const password = "test123";

    try {
        // 1. SUPER ADMIN
        console.log("👑 Creating SUPER ADMIN...");
        const superAdminEmail = "superadmin@geotrack.com";
        const superAdminId = crypto.randomUUID();

        const existingSuperAdmin = await pool.query("SELECT id FROM users WHERE email = $1", [superAdminEmail]);
        
        if (existingSuperAdmin.rows.length === 0) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query(`
                INSERT INTO users (id, email, password, is_admin, is_super_admin, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            `, [superAdminId, superAdminEmail, hashedPassword, true, true]);

            await pool.query(`
                INSERT INTO profiles (id, user_id, full_name, created_at, updated_at)
                VALUES ($1, $2, $3, NOW(), NOW())
            `, [crypto.randomUUID(), superAdminId, "Super Admin"]);
            
            console.log(`   ✅ Created: ${superAdminEmail}\n`);
        } else {
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query("UPDATE users SET password = $1, is_admin = true, is_super_admin = true WHERE email = $2", [hashedPassword, superAdminEmail]);
            console.log(`   ✅ Updated: ${superAdminEmail}\n`);
        }

        // 2. ADMIN
        console.log("👤 Creating ADMIN...");
        const adminEmail = "admin@geotrack.com";
        const adminId = crypto.randomUUID();

        const existingAdmin = await pool.query("SELECT id FROM users WHERE email = $1", [adminEmail]);
        
        if (existingAdmin.rows.length === 0) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query(`
                INSERT INTO users (id, email, password, is_admin, is_super_admin, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            `, [adminId, adminEmail, hashedPassword, true, false]);

            await pool.query(`
                INSERT INTO profiles (id, user_id, full_name, created_at, updated_at)
                VALUES ($1, $2, $3, NOW(), NOW())
            `, [crypto.randomUUID(), adminId, "Test Admin"]);
            
            console.log(`   ✅ Created: ${adminEmail}\n`);
        } else {
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query("UPDATE users SET password = $1, is_admin = true, is_super_admin = false WHERE email = $2", [hashedPassword, adminEmail]);
            console.log(`   ✅ Updated: ${adminEmail}\n`);
        }

        // 3. AGENT
        console.log("👨‍💻 Creating AGENT...");
        const agentEmail = "agent@geotrack.com";
        const agentId = crypto.randomUUID();

        const existingAgent = await pool.query("SELECT id FROM users WHERE email = $1", [agentEmail]);
        
        if (existingAgent.rows.length === 0) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query(`
                INSERT INTO users (id, email, password, is_admin, is_super_admin, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            `, [agentId, agentEmail, hashedPassword, false, false]);

            await pool.query(`
                INSERT INTO profiles (id, user_id, full_name, created_at, updated_at)
                VALUES ($1, $2, $3, NOW(), NOW())
            `, [crypto.randomUUID(), agentId, "Test Agent"]);
            
            console.log(`   ✅ Created: ${agentEmail}\n`);
        } else {
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query("UPDATE users SET password = $1, is_admin = false, is_super_admin = false WHERE email = $2", [hashedPassword, agentEmail]);
            console.log(`   ✅ Updated: ${agentEmail}\n`);
        }

        console.log("==============================================");
        console.log("✅ TEST CREDENTIALS CREATED");
        console.log("==============================================\n");
        console.log(`🔑 Password for all: "${password}"\n`);
        console.log("👑 SUPER ADMIN:");
        console.log(`   Email: ${superAdminEmail}`);
        console.log(`   Role: Super Admin\n`);
        console.log("👤 ADMIN:");
        console.log(`   Email: ${adminEmail}`);
        console.log(`   Role: Admin\n`);
        console.log("👨‍💻 AGENT:");
        console.log(`   Email: ${agentEmail}`);
        console.log(`   Role: Agent\n`);
        console.log("==============================================");

    } catch (err) {
        console.error("❌ Error:", err.message);
    }

    await pool.end();
}

createTestCredentials();
