const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const client = await pool.connect();
  try {
    console.log('=== ROOT CAUSE ANALYSIS ===\n');
    console.log('Database: geotrack_dbtest (Oregon clone)');
    console.log('Total location_logs: 38');
    console.log('Date range: April 17-18, 2026 (OLD DATA!)');
    console.log('Logs for today (April 23): 0\n');

    // Show all logs to see what's there
    console.log('=== ALL LOCATION LOGS ===');
    const logs = await client.query(`
      SELECT l.timestamp::date as log_date, l.activity, u.email, l.latitude, l.longitude
      FROM location_logs l 
      JOIN users u ON l.user_id = u.id 
      ORDER BY l.timestamp DESC
    `);
    logs.rows.forEach(r => {
      console.log(r.log_date, r.activity, r.email);
    });

    // Check if there's any clock in/out
    console.log('\n=== CLOCK IN/OUT ACTIVITY ===');
    const clockActivity = await client.query(`
      SELECT activity, COUNT(*) as cnt 
      FROM location_logs 
      WHERE activity IN ('CLOCK_IN', 'CLOCK_OUT') 
      GROUP BY activity
    `);
    console.log(clockActivity.rows);

    // Check meetings
    console.log('\n=== RECENT MEETINGS ===');
    const meetings = await client.query(`SELECT id, user_id, start_time, status FROM meetings ORDER BY start_time DESC LIMIT 10`);
    console.log('Count:', meetings.rows.length);
    meetings.rows.forEach(m => console.log(m.start_time, m.status));

  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(e => console.error(e.message));