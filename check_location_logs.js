// check_location_logs.js
import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkLogs() {
    console.log("==============================================");
    console.log("🔍 CHECKING LOCATION LOGS");
    console.log("==============================================\n");

    try {
        // Check total logs
        const total = await pool.query("SELECT COUNT(*) as count FROM location_logs");
        console.log(`Total location_logs: ${total.rows[0].count}`);

        // Check logs by user
        const byUser = await pool.query(`
            SELECT l.user_id, u.email, COUNT(*) as count, p.full_name, c.name as company_name
            FROM location_logs l
            JOIN users u ON l.user_id = u.id
            LEFT JOIN profiles p ON u.id = p.user_id
            LEFT JOIN companies c ON l.company_id = c.id
            GROUP BY l.user_id, u.email, p.full_name, c.name
            ORDER BY count DESC
        `);
        console.log("\nLogs by User:");
        byUser.rows.forEach(r => {
            console.log(`   ${r.email} (${r.full_name || 'N/A'}, ${r.company_name || 'NULL'}): ${r.count}`);
        });

        // Check recent logs
        const recent = await pool.query(`
            SELECT l.id, l.user_id, l.activity, l.timestamp, u.email, c.name as company_name
            FROM location_logs l
            JOIN users u ON l.user_id = u.id
            LEFT JOIN companies c ON l.company_id = c.id
            ORDER BY l.timestamp DESC
            LIMIT 20
        `);
        console.log("\nRecent 20 Logs:");
        recent.rows.forEach(r => {
            console.log(`   ${r.email} (${r.company_name || 'NULL'}): ${r.activity} at ${r.timestamp}`);
        });

    } catch (err) {
        console.error("❌ Error:", err.message);
    }

    await pool.end();
}

checkLogs();
