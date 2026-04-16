import pkg from 'pg';
const { Client } = pkg;
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const prodUrl = process.env.DATABASE_URL;

async function createSuperAdmin() {
    const client = new Client({ 
        connectionString: prodUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("🔗 Connected to production database.");

        // Check if superadmin already exists
        const existingSuperAdmin = await client.query(
            "SELECT id, email, is_admin, is_super_admin FROM users WHERE is_super_admin = true"
        );

        if (existingSuperAdmin.rows.length > 0) {
            console.log("✅ SuperAdmin already exists:");
            existingSuperAdmin.rows.forEach(u => {
                console.log(`   - Email: ${u.email}, ID: ${u.id}`);
            });
            console.log("\n⚠️ Not creating new superadmin to avoid duplicates.");
            return;
        }

        console.log("⚠️ No superadmin found. Creating new superadmin...");

        const password = "Admin@123";
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // Create superadmin with NULL company_id (can access all companies)
        const superAdminId = crypto.randomUUID();
        await client.query(
            `INSERT INTO users (id, email, password, is_admin, is_super_admin, role, company_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             ON CONFLICT (email) DO NOTHING`,
            [superAdminId, "superadmin@test.com", hash, true, true, 'admin', null]
        );

        // Create profile
        await client.query(
            "INSERT INTO profiles (user_id, full_name) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [superAdminId, "Super Admin"]
        );

        console.log("✅ SuperAdmin user created successfully!");
        console.log(`   Email: superadmin@test.com`);
        console.log(`   Password: ${password}`);
        console.log(`   ID: ${superAdminId}`);

        // Verify the user was created
        const verifyUser = await client.query(
            "SELECT id, email, is_admin, is_super_admin, company_id FROM users WHERE email = 'superadmin@test.com'"
        );

        if (verifyUser.rows.length > 0) {
            console.log("\n✅ Verification - User found in database:");
            console.log(`   - ID: ${verifyUser.rows[0].id}`);
            console.log(`   - Email: ${verifyUser.rows[0].email}`);
            console.log(`   - is_admin: ${verifyUser.rows[0].is_admin}`);
            console.log(`   - is_super_admin: ${verifyUser.rows[0].is_super_admin}`);
            console.log(`   - company_id: ${verifyUser.rows[0].company_id}`);
        }

    } catch (err) {
        console.error("❌ Failed to create superadmin:", err.message);
    } finally {
        await client.end();
    }
}

createSuperAdmin();