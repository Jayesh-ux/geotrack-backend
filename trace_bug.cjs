const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const client = await pool.connect();
  try {
    console.log('=== TRACING THE EXACT BUG ===\n');

    // Get sanika@gmail.com (who was trying to use the app)
    const user = await client.query(`SELECT id, email, company_id FROM users WHERE email = 'sanika@gmail.com'`);
    const userId = user.rows[0].id;
    const userCompanyId = user.rows[0].company_id;
    
    console.log('User:', user.rows[0].email);
    console.log('User ID:', userId);
    console.log('User Company ID:', userCompanyId);
    
    // Check what company_id is in the location_logs for the test user
    const testUserLog = await client.query(`
      SELECT user_id, company_id FROM location_logs LIMIT 1
    `);
    console.log('\nTest user company_id in logs:', testUserLog.rows[0]?.company_id);
    
    // Now simulate what the API does
    // Get the company ID from the user's session/token
    console.log('\n=== SIMULATING THE API CALL ===');
    
    // Step 1: The API gets userId from token, and companyId from user's company_id
    // Then it queries location_logs WHERE user_id = $userId AND company_id = $companyId
    
    // Check if any logs exist for this company_id
    const companyLogs = await client.query(`
      SELECT COUNT(*) as cnt FROM location_logs WHERE company_id = $1
    `, [userCompanyId]);
    console.log('Logs with user company_id:', companyLogs.rows[0].cnt);
    
    // Check if logs exist for this user_id
    const userLogs = await client.query(`
      SELECT COUNT(*) as cnt FROM location_logs WHERE user_id = $1
    `, [userId]);
    console.log('Logs with user_id:', userLogs.rows[0].cnt);
    
    // BOTH are 0! So the user has never logged any data
    // That's not the bug - the bug is they clocked in but data didn't save
    
    // Let me check the meetings - those might have data
    console.log('\n=== Checking meetings ===');
    const meetings = await client.query(`
      SELECT m.*, u.email 
      FROM meetings m 
      JOIN users u ON m.user_id = u.id 
      WHERE u.email = 'sanika@gmail.com'
    `);
    console.log('Meetings for sanika@gmail.com:', meetings.rows.length);
    
    // Check trip_expenses
    const expenses = await client.query(`
      SELECT * FROM trip_expenses WHERE user_id = $1
    `, [userId]);
    console.log('Expenses for sanika@gmail.com:', expenses.rows.length);

  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(e => console.error(e.message));