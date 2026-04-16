import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const prodUrl = process.env.DATABASE_URL;

async function listAllUsers() {
    const client = new Client({ 
        connectionString: prodUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("🔗 Connected to production database.\n");

        // Get all users with their roles
        const users = await client.query(
            `SELECT id, email, is_admin, is_super_admin, company_id, role 
             FROM users 
             ORDER BY is_super_admin DESC, is_admin DESC, email ASC`
        );

        console.log("📋 ALL USERS IN SYSTEM:\n");
        console.log("| Email                    | is_admin | is_super_admin | company_id |");
        console.log("|--------------------------|----------|----------------|------------|");
        
        users.rows.forEach(u => {
            console.log(`| ${u.email.padEnd(24)} | ${String(u.is_admin).padEnd(8)} | ${String(u.is_super_admin).padEnd(14)} | ${u.company_id ? u.company_id.substring(0,8)+'...' : 'NULL'} |`);
        });

        console.log(`\nTotal users: ${users.rows.length}`);

        // Check superadmins specifically
        console.log("\n🛡️ SUPERADMIN USERS:");
        const superAdmins = users.rows.filter(u => u.is_super_admin);
        if (superAdmins.length > 0) {
            superAdmins.forEach(u => {
                console.log(`   - ${u.email} (ID: ${u.id})`);
            });
        } else {
            console.log("   NONE");
        }

        // Check regular admins
        console.log("\n👑 REGULAR ADMIN USERS (is_admin = true, is_super_admin = false):");
        const admins = users.rows.filter(u => u.is_admin && !u.is_super_admin);
        if (admins.length > 0) {
            admins.forEach(u => {
                console.log(`   - ${u.email} (ID: ${u.id})`);
            });
        } else {
            console.log("   NONE");
        }

        // Check agents
        console.log("\n👤 AGENT USERS (is_admin = false):");
        const agents = users.rows.filter(u => !u.is_admin);
        if (agents.length > 0) {
            agents.forEach(u => {
                console.log(`   - ${u.email} (ID: ${u.id})`);
            });
        } else {
            console.log("   NONE");
        }

    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        await client.end();
    }
}

listAllUsers();