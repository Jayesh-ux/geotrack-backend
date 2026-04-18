import pool from './db.js';

async function updateUserCompany() {
    const client = await pool.connect();
    
    try {
        // Update agent@test.com to Lodha Supremus Enterprises
        const lodhaCompanyId = '53d8b685-bb58-421d-aa5a-e3a618af7326';
        
        const result = await client.query(
            'UPDATE users SET company_id = $1 WHERE email = $2 RETURNING id, email, company_id',
            [lodhaCompanyId, 'agent@test.com']
        );
        
        if (result.rows.length > 0) {
            console.log('✅ Updated:', result.rows[0]);
        } else {
            console.log('❌ User not found');
        }
        
    } finally {
        client.release();
        await pool.end();
    }
}

updateUserCompany();