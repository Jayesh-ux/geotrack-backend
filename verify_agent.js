import pool from './db.js';

async function verify() {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT u.email, c.name as company_name 
            FROM users u 
            LEFT JOIN companies c ON u.company_id = c.id 
            WHERE u.email = 'agent@test.com'
        `);
        console.log('agent@test.com now belongs to:', result.rows[0]);
    } finally {
        client.release();
        await pool.end();
    }
}

verify();