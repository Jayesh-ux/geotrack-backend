import pool from './db.js';

async function verify() {
    const client = await pool.connect();
    try {
        const user = await client.query(
            "SELECT email, password FROM users WHERE email = $1",
            ['agent2@test.com']
        );
        console.log('User:', user.rows[0]);
        console.log('Password starts with:', user.rows[0]?.password?.substring(0, 20));
    } finally {
        client.release();
        await pool.end();
    }
}

verify();