import pool from './db.js';
import bcrypt from 'bcryptjs';

async function fixAdminPassword() {
    const client = await pool.connect();
    try {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        await client.query(
            "UPDATE users SET password = $1 WHERE email = 'admin@test.com'",
            [hashedPassword]
        );
        console.log('✅ Updated admin@test.com password to admin123');
        
    } finally {
        client.release();
        await pool.end();
    }
}

fixAdminPassword();