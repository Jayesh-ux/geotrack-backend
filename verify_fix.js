import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const testDatabaseUrl = process.env.DATABASE_URL;

async function testSuperAdminAPI() {
    // Using the test database from .env
    const client = new Client({ 
        connectionString: testDatabaseUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("🔗 Connected to test database.\n");

        // 1. Check admin@test.com role
        const adminUser = await client.query(
            "SELECT id, email, is_admin, is_super_admin, company_id FROM users WHERE email = 'admin@test.com'"
        );

        console.log("📋 ADMIN USER STATUS:");
        if (adminUser.rows.length > 0) {
            console.log(`   Email: ${adminUser.rows[0].email}`);
            console.log(`   is_admin: ${adminUser.rows[0].is_admin}`);
            console.log(`   is_super_admin: ${adminUser.rows[0].is_super_admin}`);
            console.log(`   company_id: ${adminUser.rows[0].company_id}`);
        } else {
            console.log("   NOT FOUND");
        }

        // 2. Check agent@test.com role
        const agentUser = await client.query(
            "SELECT id, email, is_admin, is_super_admin, company_id FROM users WHERE email = 'agent@test.com'"
        );

        console.log("\n📋 AGENT USER STATUS:");
        if (agentUser.rows.length > 0) {
            console.log(`   Email: ${agentUser.rows[0].email}`);
            console.log(`   is_admin: ${agentUser.rows[0].is_admin}`);
            console.log(`   is_super_admin: ${agentUser.rows[0].is_super_admin}`);
            console.log(`   company_id: ${agentUser.rows[0].company_id}`);
        } else {
            console.log("   NOT FOUND");
        }

        // 3. Count clients in database
        const totalClients = await client.query("SELECT COUNT(*) as count FROM clients");
        console.log(`\n📊 TOTAL CLIENTS IN DATABASE: ${totalClients.rows[0].count}`);

        // 4. Count clients by company (for agent's company)
        if (agentUser.rows.length > 0 && agentUser.rows[0].company_id) {
            const agentCompanyClients = await client.query(
                "SELECT COUNT(*) as count FROM clients WHERE company_id = $1",
                [agentUser.rows[0].company_id]
            );
            console.log(`   Clients in agent's company (${agentUser.rows[0].company_id.substring(0,8)}...): ${agentCompanyClients.rows[0].count}`);
        }

        // 5. Count clients created by agent
        if (agentUser.rows.length > 0) {
            const agentClients = await client.query(
                "SELECT COUNT(*) as count FROM clients WHERE created_by = $1",
                [agentUser.rows[0].id]
            );
            console.log(`   Clients created by agent: ${agentClients.rows[0].count}`);
        }

        console.log("\n✅ VERIFICATION COMPLETE");

    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        await client.end();
    }
}

testSuperAdminAPI();