import pool from './db.js';

async function checkAll() {
    const client = await pool.connect();
    try {
        // Check all tables for agent@test.com
        console.log('=== All data for agent@test.com ===\n');
        
        // Users
        const user = await client.query(`SELECT id, email, company_id FROM users WHERE email = 'agent@test.com'`);
        console.log('USER:', user.rows[0]);
        
        // Location logs
        const logs = await client.query(`SELECT COUNT(*) as count FROM location_logs WHERE user_id = $1`, [user.rows[0]?.id]);
        console.log('Location logs:', logs.rows[0].count);
        
        // Meetings
        const meetings = await client.query(`SELECT COUNT(*) as count FROM meetings WHERE user_id = $1`, [user.rows[0]?.id]);
        console.log('Meetings:', meetings.rows[0].count);
        
        // Expenses  
        const expenses = await client.query(`SELECT COUNT(*) as count FROM expenses WHERE user_id = $1`, [user.rows[0]?.id]);
        console.log('Expenses:', expenses.rows[0].count);
        
        // Check company details
        console.log('\n=== Company ===');
        const company = await client.query(`SELECT id, name, subdomain FROM companies WHERE id = $1`, [user.rows[0]?.company_id]);
        console.log(company.rows[0]);
        
    } finally {
        client.release();
        await pool.end();
    }
}

checkAll();