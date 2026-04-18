// check_meetings.js
import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkMeetings() {
    console.log("==============================================");
    console.log("🔍 CHECKING MEETINGS");
    console.log("==============================================\n");

    try {
        // Check meetings with company info
        const meetings = await pool.query(`
            SELECT m.id, m.status, m.start_time, m.company_id, u.email, c.name as company_name
            FROM meetings m
            JOIN users u ON m.user_id = u.id
            LEFT JOIN companies c ON m.company_id = c.id
            ORDER BY m.start_time DESC
            LIMIT 20
        `);
        
        console.log(`Total meetings: ${meetings.rows.length}`);
        console.log("\nMeetings:");
        meetings.rows.forEach(m => {
            console.log(`   ${m.email} (${m.company_name || 'NULL company_id'}): ${m.status} at ${m.start_time}`);
        });

        // Check meetings without company_id
        const nullCompany = await pool.query("SELECT COUNT(*) as count FROM meetings WHERE company_id IS NULL");
        console.log(`\nMeetings with NULL company_id: ${nullCompany.rows[0].count}`);

        // Check users and their companies
        console.log("\n--- Users and their companies ---");
        const users = await pool.query(`
            SELECT u.email, u.company_id, c.name as company_name
            FROM users u
            LEFT JOIN companies c ON u.company_id = c.id
            WHERE u.email IN ('admin@test.com', 'agent@test.com')
        `);
        users.rows.forEach(u => {
            console.log(`   ${u.email}: ${u.company_name || 'NULL'} (company_id: ${u.company_id})`);
        });

    } catch (err) {
        console.error("❌ Error:", err.message);
    }

    await pool.end();
}

checkMeetings();
