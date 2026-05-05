const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const client = await pool.connect();
  try {
    console.log('=== CHECKING IF CLOCK-IN WAS ACTUALLY SAVED ===\n');

    // Look for ANY CLOCK_IN logs
    const clockIns = await client.query(`
      SELECT l.id, l.user_id, l.activity, l.timestamp, u.email
      FROM location_logs l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE l.activity = 'CLOCK_IN'
      ORDER BY l.timestamp DESC
    `);
    console.log('All CLOCK_IN logs:');
    clockIns.rows.forEach(r => {
      console.log('Log ID:', r.id);
      console.log('User ID:', r.user_id);
      console.log('Email:', r.email);
      console.log('Time:', r.timestamp);
      console.log('---');
    });

    // Check user_sessions table for any session data
    console.log('\n=== Checking user_sessions table ===');
    const sessions = await client.query(`SELECT * FROM user_sessions LIMIT 10`);
    console.log('user_sessions count:', sessions.rows.length);

    // Check users table last_seen
    console.log('\n=== Users last_seen ===');
    const users = await client.query(`
      SELECT email, last_seen, current_activity, session_state 
      FROM users 
      WHERE last_seen IS NOT NULL 
      ORDER BY last_seen DESC 
      LIMIT 10
    `);
    users.rows.forEach(u => console.log(u.email, 'last seen:', u.last_seen, 'activity:', u.current_activity));

  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(e => console.error(e.message));