import pool from './db.js';

async function clearAllLogs() {
    const client = await pool.connect();
    try {
        // Delete all location logs
        const logs = await client.query('DELETE FROM location_logs RETURNING id');
        console.log(`✅ Deleted ${logs.rowCount} location logs`);
        
        // Delete all meetings
        const meetings = await client.query('DELETE FROM meetings RETURNING id');
        console.log(`✅ Deleted ${meetings.rowCount} meetings`);
        
        // Delete all expenses
        const expenses = await client.query('DELETE FROM trip_expenses RETURNING id');
        console.log(`✅ Deleted ${expenses.rowCount} expenses`);
        
        // Verify
        const logCount = await client.query('SELECT COUNT(*) as count FROM location_logs');
        const meetingCount = await client.query('SELECT COUNT(*) as count FROM meetings');
        const expenseCount = await client.query('SELECT COUNT(*) as count FROM trip_expenses');
        
        console.log('\n=== Remaining ===');
        console.log(`Location logs: ${logCount.rows[0].count}`);
        console.log(`Meetings: ${meetingCount.rows[0].count}`);
        console.log(`Expenses: ${expenseCount.rows[0].count}`);
        
    } finally {
        client.release();
        await pool.end();
    }
}

clearAllLogs();