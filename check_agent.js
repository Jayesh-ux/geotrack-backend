// check_agent.js
import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    const result = await pool.query(`
        SELECT u.id, u.email, u.is_admin, u.is_super_admin, u.company_id, p.full_name
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE u.email = 'agent@test.com'
    `);
    console.log(JSON.stringify(result.rows, null, 2));
    await pool.end();
}
check();
