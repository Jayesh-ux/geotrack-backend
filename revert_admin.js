import pool from './db.js';

async function revertAdmin() {
    const client = await pool.connect();
    try {
        // Revert both to regular agents (is_admin = false)
        await client.query(
            "UPDATE users SET is_admin = false WHERE email IN ('agent@test.com', 'agent2@test.com')"
        );
        console.log('✅ Reverted both to regular agents');
        
    } finally {
        client.release();
        await pool.end();
    }
}

revertAdmin();