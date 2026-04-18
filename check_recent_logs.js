import pool from './db.js';

async function checkLogs() {
    const client = await pool.connect();
    try {
        // Check recent location logs
        console.log('=== Recent Location Logs ===');
        const logs = await client.query(`
            SELECT l.id, l.user_id, l.activity, l.timestamp, l.latitude, l.longitude, u.email, c.name as company_name
            FROM location_logs l
            JOIN users u ON l.user_id = u.id
            LEFT JOIN companies c ON l.company_id = c.id
            ORDER BY l.timestamp DESC
            LIMIT 20
        `);
        
        logs.rows.forEach(l => {
            console.log(`${l.timestamp} | ${l.email} | ${l.company_name || 'NO COMPANY'} | ${l.activity || 'TRACKING'} | ${l.latitude?.toFixed(4)}, ${l.longitude?.toFixed(4)}`);
        });
        
        // Check agent@test.com has logs
        console.log('\n=== agent@test.com Logs ===');
        const agentLogs = await client.query(`
            SELECT COUNT(*) as count FROM location_logs l
            JOIN users u ON l.user_id = u.id
            WHERE u.email = 'agent@test.com'
        `);
        console.log(`Total logs for agent@test.com: ${agentLogs.rows[0].count}`);
        
        // Check Lodha company logs
        console.log('\n=== Lodha Company Logs ===');
        const lodhaLogs = await client.query(`
            SELECT COUNT(*) as count FROM location_logs l
            WHERE company_id = '53d8b685-bb58-421d-aa5a-e3a618af7326'
        `);
        console.log(`Total logs for Lodha: ${lodhaLogs.rows[0].count}`);
        
    } finally {
        client.release();
        await pool.end();
    }
}

checkLogs();