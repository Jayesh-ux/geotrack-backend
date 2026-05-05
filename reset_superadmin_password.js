import pool from './db.js';
import bcrypt from 'bcryptjs';

async function resetAllSuperAdminPasswords() {
    const client = await pool.connect();
    try {
        const newPassword = 'admin123';
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        const result = await client.query(
            "UPDATE users SET password = $1 WHERE is_super_admin = true RETURNING email",
            [hashedPassword]
        );
        
        console.log(`✅ Updated password to '${newPassword}' for:`);
        result.rows.forEach(row => {
            console.log(`   - ${row.email}`);
        });
        
    } finally {
        client.release();
        await pool.end();
    }
}

resetAllSuperAdminPasswords();
