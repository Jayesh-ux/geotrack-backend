// check_all_data.js
import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkData() {
    console.log("==============================================");
    console.log("🔍 CHECKING ALL DATA");
    console.log("==============================================\n");

    try {
        const tables = ['location_logs', 'meetings', 'clients', 'users', 'profiles', 'expenses', 'trip_expenses'];
        
        for (const table of tables) {
            try {
                const count = await pool.query(`SELECT COUNT(*) as count FROM "${table}"`);
                console.log(`${table}: ${count.rows[0].count} rows`);
            } catch (err) {
                console.log(`${table}: ERROR - ${err.message}`);
            }
        }

        // Check meetings
        console.log("\n--- Recent Meetings ---");
        const meetings = await pool.query(`
            SELECT m.id, m.status, m.start_time, u.email, c.name as client_name
            FROM meetings m
            JOIN users u ON m.user_id = u.id
            LEFT JOIN clients c ON m.client_id = c.id
            ORDER BY m.created_at DESC
            LIMIT 10
        `);
        meetings.rows.forEach(m => {
            console.log(`   ${m.email}: ${m.status} - ${m.client_name || 'N/A'} at ${m.start_time}`);
        });

    } catch (err) {
        console.error("❌ Error:", err.message);
    }

    await pool.end();
}

checkData();
