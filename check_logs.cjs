const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkLogs() {
  const client = await pool.connect();
  try {
    const today = new Date().toISOString().slice(0, 10);
    console.log('Today:', today);
    
    // Total logs
    const total = await client.query('SELECT COUNT(*) FROM location_logs');
    console.log('Total logs:', total.rows[0].count);
    
    // Logs for today
    const todayLogs = await client.query("SELECT COUNT(*) FROM location_logs WHERE timestamp::date = CURRENT_DATE");
    console.log('Logs today:', todayLogs.rows[0].count);
    
    // Recent logs with activity
    const recent = await client.query("SELECT id, user_id, activity, timestamp FROM location_logs WHERE activity IS NOT NULL ORDER BY timestamp DESC LIMIT 10");
    console.log('\nRecent logs with activity:');
    recent.rows.forEach(r => console.log(r.timestamp.slice(0,19), r.activity));
    
    // Users with logs
    const users = await client.query("SELECT DISTINCT u.email, COUNT(l.id) as cnt FROM location_logs l JOIN users u ON l.user_id = u.id GROUP BY u.email ORDER BY cnt DESC LIMIT 5");
    console.log('\nTop users by log count:');
    users.rows.forEach(u => console.log(u.email, u.cnt));
    
    // Check sample user logs
    console.log('\n=== Sample user logs for today ===');
    const sampleUser = await client.query(`
      SELECT l.id, l.user_id, u.email, l.activity, l.timestamp 
      FROM location_logs l 
      JOIN users u ON l.user_id = u.id 
      WHERE l.timestamp::date = CURRENT_DATE 
      LIMIT 5
    `);
    sampleUser.rows.forEach(r => {
      console.log(r.email, r.activity, r.timestamp);
    });
    
  } finally {
    client.release();
    await pool.end();
  }
}

checkLogs().catch(e => console.error(e.message));