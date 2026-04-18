// get_all_users.js
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

async function getUsers() {
    console.log("==============================================");
    console.log("👥 ALL USERS IN DATABASE");
    console.log("==============================================\n");

    try {
        const users = await pool.query(`
            SELECT 
                u.id,
                u.email,
                p.full_name,
                u.is_admin,
                u.is_super_admin,
                u.is_trial_user,
                u.company_id,
                u.role,
                c.name as company_name
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            LEFT JOIN companies c ON u.company_id = c.id
            ORDER BY 
                u.is_super_admin DESC,
                u.is_admin DESC,
                p.full_name ASC
        `);

        console.log(`Total Users: ${users.rows.length}\n`);

        // Group by role
        const superAdmins = users.rows.filter(u => u.is_super_admin);
        const admins = users.rows.filter(u => u.is_admin && !u.is_super_admin);
        const agents = users.rows.filter(u => !u.is_admin && !u.is_super_admin);

        console.log("==============================================");
        console.log("🔑 SUPER ADMIN USERS");
        console.log("==============================================");
        if (superAdmins.length === 0) {
            console.log("   No super admins found\n");
        } else {
            superAdmins.forEach((u, i) => {
                console.log(`\n${i + 1}. ${u.full_name || 'N/A'}`);
                console.log(`   Email: ${u.email}`);
                console.log(`   Company: ${u.company_name || 'N/A'}`);
            });
        }

        console.log("\n==============================================");
        console.log("👤 ADMIN USERS");
        console.log("==============================================");
        if (admins.length === 0) {
            console.log("   No admins found\n");
        } else {
            admins.forEach((u, i) => {
                console.log(`\n${i + 1}. ${u.full_name || 'N/A'}`);
                console.log(`   Email: ${u.email}`);
                console.log(`   Company: ${u.company_name || 'N/A'}`);
            });
        }

        console.log("\n==============================================");
        console.log("👨‍💻 AGENT USERS (First 10)");
        console.log("==============================================");
        if (agents.length === 0) {
            console.log("   No agents found\n");
        } else {
            agents.slice(0, 10).forEach((u, i) => {
                console.log(`\n${i + 1}. ${u.full_name || 'N/A'}`);
                console.log(`   Email: ${u.email}`);
                console.log(`   Company: ${u.company_name || 'N/A'}`);
            });
            if (agents.length > 10) {
                console.log(`\n   ... and ${agents.length - 10} more agents`);
            }
        }

        console.log("\n==============================================");
        console.log("📊 SUMMARY");
        console.log("==============================================");
        console.log(`   Super Admins: ${superAdmins.length}`);
        console.log(`   Admins: ${admins.length}`);
        console.log(`   Agents: ${agents.length}`);
        console.log(`   Total: ${users.rows.length}`);

        console.log("\n==============================================");
        console.log("🏢 COMPANIES");
        console.log("==============================================");
        const companies = await pool.query(`
            SELECT c.id, c.name, c.subdomain, c.email_domain, c.is_active,
                   COUNT(u.id) as user_count
            FROM companies c
            LEFT JOIN users u ON c.id = u.company_id
            GROUP BY c.id
            ORDER BY c.name
        `);

        companies.rows.forEach((c, i) => {
            console.log(`\n${i + 1}. ${c.name}`);
            console.log(`   Subdomain: ${c.subdomain}`);
            console.log(`   Email Domain: ${c.email_domain || 'N/A'}`);
            console.log(`   Active: ${c.is_active ? 'Yes' : 'No'}`);
            console.log(`   Users: ${c.user_count}`);
        });

        console.log("\n==============================================");
        console.log("✅ CREDENTIALS FOR TESTING");
        console.log("==============================================\n");

        // Find or create test passwords for each role
        console.log("🔑 SUPER ADMIN:");
        if (superAdmins.length > 0) {
            console.log(`   Email: ${superAdmins[0].email}`);
            console.log("   Password: admin123 (if migrated) or create new\n");
        } else {
            console.log("   Create a super admin user\n");
        }

        console.log("👤 ADMIN:");
        if (admins.length > 0) {
            console.log(`   Email: ${admins[0].email}`);
            console.log("   Password: Check original password from production\n");
        } else {
            console.log("   No admins found\n");
        }

        console.log("👨‍💻 AGENT:");
        if (agents.length > 0) {
            console.log(`   Email: ${agents[0].email}`);
            console.log("   Password: Check original password from production\n");
        } else {
            console.log("   No agents found\n");
        }

    } catch (err) {
        console.error("❌ Error:", err.message);
    }

    await pool.end();
}

getUsers();
