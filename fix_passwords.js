import pool from './db.js';
import bcrypt from 'bcryptjs';

async function fixPasswords() {
    const client = await pool.connect();
    try {
        // Hash password
        const hashedPassword = await bcrypt.hash('agent123', 10);
        
        // Update agent@test.com password
        await client.query(
            "UPDATE users SET password = $1 WHERE email = $2",
            [hashedPassword, 'agent@test.com']
        );
        console.log('✅ Updated agent@test.com password');
        
        // Verify both users
        const agent1 = await client.query("SELECT email, password FROM users WHERE email = $1", ['agent@test.com']);
        const agent2 = await client.query("SELECT email, password FROM users WHERE email = $1", ['agent2@test.com']);
        
        console.log('\nagent@test.com:', agent1.rows[0]?.password?.substring(0, 20));
        console.log('agent2@test.com:', agent2.rows[0]?.password?.substring(0, 20));
        
    } finally {
        client.release();
        await pool.end();
    }
}

fixPasswords();