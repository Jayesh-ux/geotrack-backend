import pool from './db.js';

async function deleteAllLogs() {
    const client = await pool.connect();
    try {
        // Delete all location logs
        const result = await client.query('DELETE FROM location_logs RETURNING id');
        console.log(`✅ Deleted ${result.rowCount} location logs`);
        
        // Verify
        const count = await client.query('SELECT COUNT(*) as count FROM location_logs');
        console.log(`Remaining logs: ${count.rows[0].count}`);
        
    } finally {
        client.release();
        await pool.end();
    }
}

deleteAllLogs();