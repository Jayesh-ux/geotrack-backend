const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const client = await pool.connect();
  try {
    console.log('=== TESTING THE EXACT API FLOW ===\n');

    // Get a real user who has logged (e.g., sanika@gmail.com - admin)
    const user = await client.query(`SELECT id, email, company_id, is_admin FROM users WHERE email = 'sanika@gmail.com'`);
    const userId = user.rows[0].id;
    const userCompanyId = user.rows[0].company_id;
    
    console.log('User:', user.rows[0].email);
    console.log('User ID:', userId);
    console.log('Company ID:', userCompanyId);
    console.log('Is Admin:', user.rows[0].is_admin);

    // Check this user's logs (if any)
    const userLogs = await client.query(`
      SELECT COUNT(*) as cnt FROM location_logs WHERE user_id = $1
    `, [userId]);
    console.log('\nLogs for this user:', userLogs.rows[0].cnt);

    // The API adds company_id filter for non-super-admins
    console.log('\n=== Simulating API query (with company_id filter) ===');
    const apiResult = await client.query(`
      SELECT l.*, u.email 
      FROM location_logs l 
      JOIN users u ON l.user_id = u.id 
      WHERE l.user_id = $1 AND l.company_id = $2
      ORDER BY l.timestamp DESC 
      LIMIT 50
    `, [userId, userCompanyId]);
    console.log('API returned:', apiResult.rows.length, 'logs');

    // Now check WITHOUT company filter
    console.log('\n=== WITHOUT company_id filter ===');
    const noFilter = await client.query(`
      SELECT l.*, u.email 
      FROM location_logs l 
      JOIN users u ON l.user_id = u.id 
      WHERE l.user_id = $1
      ORDER BY l.timestamp DESC 
      LIMIT 50
    `, [userId]);
    console.log('Without company filter:', noFilter.rows.length, 'logs');

    // The REAL problem - do ANY logs exist for this company?
    console.log('\n=== All logs in this company ===');
    const companyLogs = await client.query(`
      SELECT l.user_id, u.email, COUNT(*) as cnt
      FROM location_logs l 
      JOIN users u ON l.user_id = u.id 
      WHERE l.company_id = $1
      GROUP BY l.user_id, u.email
    `, [userCompanyId]);
    console.log('Logs per user in company:');
    companyLogs.rows.forEach(r => console.log(r.email, r.cnt));

  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(e => console.error(e.message));