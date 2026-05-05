const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const client = await pool.connect();
  try {
    // Check when logs are from
    const dateRange = await client.query("SELECT MIN(timestamp) as oldest, MAX(timestamp) as newest FROM location_logs");
    console.log('Date range:', dateRange.rows[0]);
    
    // Users in the system
    const users = await client.query("SELECT id, email, is_admin, is_super_admin, company_id FROM users LIMIT 10");
    console.log('\nUsers:');
    users.rows.forEach(u => console.log(u.email, 'admin:', u.is_admin, 'super:', u.is_super_admin));
    
    // Check sessions
    const sessions = await client.query("SELECT * FROM user_tracking_sessions LIMIT 5");
    console.log('\nTracking sessions:', sessions.rows.length);
    
    // Check companies
    const companies = await client.query("SELECT id, name FROM companies");
    console.log('\nCompanies:', companies.rows.length);
    companies.rows.forEach(c => console.log(c.name));
    
  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(e => console.error(e.message));