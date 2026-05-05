const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function audit() {
  const client = await pool.connect();
  
  try {
    console.log('=== DATABASE: ' + (await client.query('SELECT current_database()')).rows[0].current_database + ' ===\n');
    
    // Check tables
    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    console.log('=== TABLES ===');
    tables.rows.forEach(t => console.log(t.table_name));
    
    // Check extensions
    const exts = await client.query("SELECT extname FROM pg_extension");
    console.log('\n=== EXTENSIONS ===');
    exts.rows.forEach(e => console.log(e.extname));
    
    // Check location_logs columns
    const locCols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'location_logs' ORDER BY ordinal_position");
    console.log('\n=== LOCATION_LOGS COLUMNS ===');
    locCols.rows.forEach(c => console.log(c.column_name + ' - ' + c.data_type));
    
    // Check user_tracking_sessions exists
    const sessions = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_tracking_sessions'");
    console.log('\n=== user_tracking_sessions ===');
    console.log('Exists:', sessions.rows.length > 0);
    
    // Check users columns
    const userCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position");
    console.log('\n=== users columns ===');
    userCols.rows.forEach(c => console.log(c.column_name));
    
  } finally {
    client.release();
    await pool.end();
  }
}

audit().catch(e => console.error(e.message));