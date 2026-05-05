const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const client = await pool.connect();
  try {
    console.log('=== TESTING THE ACTUAL API QUERY ===\n');

    // Get a user
    const user = await client.query(`SELECT id, email, company_id FROM users WHERE email = 'sanika@gmail.com'`);
    const userId = user.rows[0].id;
    const companyId = user.rows[0].company_id;
    
    console.log('Query params that app sends:');
    console.log('  userId:', userId);
    console.log('  companyId:', companyId);
    console.log('  startDate: 2026-04-23');
    console.log('  endDate: 2026-04-23');
    console.log('  page: 1');
    console.log('  limit: 50\n');

    // What the API actually does - line 438-450
    // startDate: 2026-04-23 -> "2026-04-23 00:00:00.000"
    // endDate: 2026-04-23 -> "2026-04-23 23:59:59.999"
    
    console.log('=== Query with TODAY (April 23) ===');
    const today = await client.query(`
      SELECT * FROM location_logs 
      WHERE user_id = $1 AND company_id = $2
        AND timestamp >= '2026-04-23 00:00:00.000'
        AND timestamp <= '2026-04-23 23:59:59.999'
      ORDER BY timestamp DESC
    `, [userId, companyId]);
    console.log('Results:', today.rows.length);

    console.log('\n=== Query with April 18 (when data exists) ===');
    const april18 = await client.query(`
      SELECT l.*, u.email FROM location_logs l
      JOIN users u ON l.user_id = u.id
      WHERE l.user_id = $1 AND l.company_id = $2
        AND l.timestamp >= '2026-04-18 00:00:00.000'
        AND l.timestamp <= '2026-04-18 23:59:59.999'
      ORDER BY l.timestamp DESC
    `, [userId, companyId]);
    console.log('Results:', april18.rows.length);

    // The test data is for agent@test.com in Lodha company
    console.log('\n=== Query for test user (agent@test.com) with April 18 ===');
    const testUser = await client.query(`SELECT id, email, company_id FROM users WHERE email = 'agent@test.com'`);
    if (testUser.rows[0]) {
      const agentLogs = await client.query(`
        SELECT * FROM location_logs 
        WHERE user_id = $1 
          AND timestamp >= '2026-04-18 00:00:00.000'
          AND timestamp <= '2026-04-18 23:59:59.999'
        ORDER BY timestamp DESC
        LIMIT 5
      `, [testUser.rows[0].id]);
      console.log('Results for agent@test.com on April 18:', agentLogs.rows.length);
      agentLogs.rows.forEach(l => console.log('  -', l.activity, l.timestamp));
    }

  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(e => console.error(e.message));