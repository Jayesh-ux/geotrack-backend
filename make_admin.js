import pool from './db.js';

async function makeAdmin() {
    const client = await pool.connect();
    try {
        // Make agent@test.com an admin
        await client.query(
            "UPDATE users SET is_admin = true WHERE email = 'agent@test.com'"
        );
        console.log('✅ Made agent@test.com an admin');
        
        // Also make agent2@test.com an admin
        await client.query(
            "UPDATE users SET is_admin = true WHERE email = 'agent2@test.com'"
        );
        console.log('✅ Made agent2@test.com an admin');
        
    } finally {
        client.release();
        await pool.end();
    }
}

makeAdmin();