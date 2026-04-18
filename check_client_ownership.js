// check_client_ownership.js
import pkg from "pg";
const { Pool } = pkg;
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

async function checkOwnership() {
    console.log("==============================================");
    console.log("🔍 CHECKING CLIENT OWNERSHIP");
    console.log("==============================================\n");

    try {
        // Get superadmin info
        const superAdmin = await pool.query(`
            SELECT u.id, u.email, u.company_id, p.full_name, c.name as company_name
            FROM users u
            JOIN profiles p ON u.id = p.user_id
            LEFT JOIN companies c ON u.company_id = c.id
            WHERE u.email = 'admin@test.com'
        `);

        if (superAdmin.rows.length === 0) {
            console.log("❌ Superadmin not found!");
            return;
        }

        console.log("👑 SUPER ADMIN INFO:");
        console.log(`   Email: ${superAdmin.rows[0].email}`);
        console.log(`   Name: ${superAdmin.rows[0].full_name}`);
        console.log(`   Company ID: ${superAdmin.rows[0].company_id}`);
        console.log(`   Company Name: ${superAdmin.rows[0].company_name}`);
        console.log("");

        // Check client company distribution
        const clientCompanies = await pool.query(`
            SELECT company_id, COUNT(*) as count
            FROM clients
            GROUP BY company_id
            ORDER BY count DESC
            LIMIT 20
        `);

        console.log("📊 CLIENTS BY COMPANY_ID:");
        console.log("   Company ID | Count");
        console.log("   -----------|------");
        
        for (const row of clientCompanies.rows) {
            const companyName = await pool.query("SELECT name FROM companies WHERE id = $1", [row.company_id]);
            const name = companyName.rows.length > 0 ? companyName.rows[0].name : 'NULL/UNKNOWN';
            console.log(`   ${row.company_id ? row.company_id.substring(0, 20) + '...' : 'NULL'} | ${row.count} (${name})`);
        }

        // Check clients with NULL company_id
        const nullClients = await pool.query("SELECT COUNT(*) as count FROM clients WHERE company_id IS NULL");
        console.log(`\n   NULL company_id: ${nullClients.rows[0].count} clients`);

        // Total clients
        const totalClients = await pool.query("SELECT COUNT(*) as count FROM clients");
        console.log(`   Total clients: ${totalClients.rows[0].count}`);

        // Check if there's a mismatch
        console.log("\n==============================================");
        console.log("⚠️  ANALYSIS:");
        console.log("==============================================");
        
        if (superAdmin.rows[0].company_id) {
            const clientsWithSameCompany = await pool.query(
                "SELECT COUNT(*) as count FROM clients WHERE company_id = $1",
                [superAdmin.rows[0].company_id]
            );
            console.log(`   Clients in superadmin's company (${superAdmin.rows[0].company_name}): ${clientsWithSameCompany.rows[0].count}`);
        }

        const nullCompanyClients = await pool.query(
            "SELECT COUNT(*) as count FROM clients WHERE company_id IS NULL"
        );
        console.log(`   Clients with NULL company_id: ${nullCompanyClients.rows[0].count}`);

        console.log("\n==============================================");
        console.log("💡 FIX NEEDED:");
        console.log("==============================================");
        console.log("If superadmin sees 0 clients, we need to:");
        console.log("1. Either reassign clients to superadmin's company");
        console.log("2. Or update is_super_admin = true to show ALL clients");
        
        // Update: set is_super_admin = true for admin@test.com if not already
        console.log("\n🔧 Checking is_super_admin status...");
        const updateCheck = await pool.query("SELECT is_super_admin FROM users WHERE email = 'admin@test.com'");
        console.log(`   is_super_admin: ${updateCheck.rows[0].is_super_admin}`);

    } catch (err) {
        console.error("❌ Error:", err.message);
    }

    await pool.end();
}

checkOwnership();
