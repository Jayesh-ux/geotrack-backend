
import pkg from 'pg';
const { Client } = pkg;
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const prodUrl = process.env.DATABASE_URL;

async function seedProductionUsers() {
    const client = new Client({ 
        connectionString: prodUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("🔗 Connected to production database.");

        const password = "password123";
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // 1. Create a default company if none exists
        const companyId = crypto.randomUUID();
        const companyRes = await client.query(
            "INSERT INTO companies (id, name, subdomain) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING id",
            [companyId, "Test Company", "test"]
        );
        const finalCompanyId = companyRes.rows[0]?.id || (await client.query("SELECT id FROM companies LIMIT 1")).rows[0]?.id;

        if (!finalCompanyId) {
            console.error("❌ No company found and couldn't create one. Check your companies table schema.");
            return;
        }

        console.log(`🏢 Using Company ID: ${finalCompanyId}`);

        // 2. Create Admin
        const adminEmail = "admin@test.com";
        const adminRes = await client.query(
            "INSERT INTO users (id, email, password, is_admin, company_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO UPDATE SET password = $3, is_admin = $4, company_id = $5 RETURNING id",
            [crypto.randomUUID(), adminEmail, hash, true, finalCompanyId]
        );
        console.log(`✅ Admin user ${adminEmail} created/updated.`);

        // 3. Create Agent
        const agentEmail = "agent@test.com";
        const agentRes = await client.query(
            "INSERT INTO users (id, email, password, is_admin, company_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO UPDATE SET password = $3, is_admin = $4, company_id = $5 RETURNING id",
            [crypto.randomUUID(), agentEmail, hash, false, finalCompanyId]
        );
        console.log(`✅ Agent user ${agentEmail} created/updated.`);

        // 4. Create Profiles
        await client.query(
            "INSERT INTO profiles (user_id, full_name) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [adminRes.rows[0].id, "Admin User"]
        );
        await client.query(
            "INSERT INTO profiles (user_id, full_name) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [agentRes.rows[0].id, "Agent User"]
        );

        console.log("\n🚀 All set! You should now be able to sign in with:");
        console.log(`User: ${adminEmail} | Pass: ${password}`);
        console.log(`User: ${agentEmail} | Pass: ${password}`);

    } catch (err) {
        console.error("❌ Seeding failed:", err.message);
    } finally {
        await client.end();
    }
}

seedProductionUsers();
