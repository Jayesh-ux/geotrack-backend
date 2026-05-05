const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const client = await pool.connect();
  try {
    console.log('=== CHECKING USER FILTER ISSUE ===\n');

    // Find your users (real emails)
    const users = await client.query(`
      SELECT id, email, company_id, is_admin 
      FROM users 
      WHERE email IN ('sanika@gmail.com', 'ritika@gmail.com', 'piyush@gmail.com', 'testgeo12@gmail.com')
    `);
    console.log('Real users:');
    users.rows.forEach(u => console.log(u.email, '| company:', u.company_id?.slice(0,8), '| admin:', u.is_admin));

    // Check what company_ids exist in location_logs
    console.log('\n=== Companies in location_logs ===');
    const logCompanies = await client.query(`
      SELECT DISTINCT l.company_id, c.name 
      FROM location_logs l 
      LEFT JOIN companies c ON l.company_id = c.id
    `);
    logCompanies.rows.forEach(c => console.log(c.company_id?.slice(0,8), c.name));

    // Check company_id for your test users
    console.log('\n=== Test user company_id in location_logs ===');
    const testLogCompanies = await client.query(`
      SELECT DISTINCT l.company_id, u.email
      FROM location_logs l 
      JOIN users u ON l.user_id = u.id
      WHERE u.email LIKE '%@gmail.com'
    `);
    testLogCompanies.rows.forEach(c => console.log(c.email, c.company_id?.slice(0,8)));

    // Simulate the API query that gets executed
    console.log('\n=== Simulating API query ===');
    // Pick the first real user
    const testUser = users.rows[0];
    if (testUser) {
      // This is what the API does - filters by user_id AND company_id
      const result = await client.query(`
        SELECT COUNT(*) as cnt 
        FROM location_logs 
        WHERE user_id = $1 AND company_id = $2
      `, [testUser.id, testUser.company_id]);
      console.log('Logs for', testUser.email, 'with company filter:', result.rows[0].cnt);

      // Without company filter (what it SHOULD be)
      const result2 = await client.query(`
        SELECT COUNT(*) as cnt 
        FROM location_logs 
        WHERE user_id = $1
      `, [testUser.id]);
      console.log('Logs for', testUser.email, 'WITHOUT company filter:', result.rows[0].cnt);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(e => console.error(e.message));