import pool from './db.js';

async function fixLogs() {
    const client = await pool.connect();
    try {
        const lodhaCompanyId = '53d8b685-bb58-421d-aa5a-e3a618af7326';
        
        // Update all location_logs for agent@test.com to have the new company_id
        const result = await client.query(
            `UPDATE location_logs 
             SET company_id = $1 
             WHERE user_id = (SELECT id FROM users WHERE email = $2)
             RETURNING id`,
            [lodhaCompanyId, 'agent@test.com']
        );
        
        console.log(`✅ Updated ${result.rows.length} location logs to Lodha company`);
        
        // Verify
        console.log('\n=== Verification ===');
        const verify = await client.query(`
            SELECT l.id, l.user_id, l.activity, l.timestamp, u.email, c.name as company_name
            FROM location_logs l
            JOIN users u ON l.user_id = u.id
            LEFT JOIN companies c ON l.company_id = c.id
            WHERE u.email = 'agent@test.com'
            ORDER BY l.timestamp DESC
            LIMIT 5
        `);
        
        verify.rows.forEach(l => {
            console.log(`${l.timestamp} | ${l.email} | ${l.company_name} | ${l.activity}`);
        });
        
    } finally {
        client.release();
        await pool.end();
    }
}

fixLogs();