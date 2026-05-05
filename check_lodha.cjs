const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const client = await pool.connect();
  try {
    console.log('=== THE REAL PROBLEM ===\n');

    // Who owns the location_logs?
    const logOwnership = await client.query(`
      SELECT u.email, u.company_id as user_company, c.name as company_name, COUNT(l.id) as log_count
      FROM location_logs l
      JOIN users u ON l.user_id = u.id
      LEFT JOIN companies c ON u.company_id = c.id
      GROUP BY u.email, u.company_id, c.name
      ORDER BY log_count DESC
    `);
    console.log('Log ownership:');
    logOwnership.rows.forEach(r => {
      console.log(r.email, '| company:', r.company_name || r.user_company?.slice(0,8), '| logs:', r.log_count);
    });

    // What company is "Lodha Supremus Enterprises"?
    const lodha = await client.query(`SELECT id, name FROM companies WHERE name LIKE '%Lodha%'`);
    console.log('\nLodha company:', lodha.rows);

    // Find which user belongs to Lodha
    const lodhaUsers = await client.query(`
      SELECT email, company_id FROM users WHERE company_id = $1
    `, [lodha.rows[0]?.id]);
    console.log('\nUsers in Lodha company:');
    lodha.rows.forEach(r => console.log(r.email));

    // Check test users (agent@test.com) company
    const testUsers = await client.query(`SELECT id, email, company_id FROM users WHERE email LIKE '%test%' OR email LIKE '%agent%' LIMIT 10`);
    console.log('\nTest users:');
    testUsers.rows.forEach(u => console.log(u.email, u.company_id?.slice(0,8)));

  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(e => console.error(e.message));