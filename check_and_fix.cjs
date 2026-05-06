const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://geotrack_dbtest_user:DpQrv5nopeTKqIUNQB6pQYeCdJgIlOxA@dpg-d7grg6po3t8c7392p2tg-a.oregon-postgres.render.com:5432/geotrack_dbtest",
  ssl: { rejectUnauthorized: false }
});

async function checkAndFix() {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to geotrack_dbtest\n');
    
    // Check if image_urls exists
    const result = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'location_logs' AND column_name = 'image_urls'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ image_urls column already exists');
    } else {
      console.log('❌ image_urls column missing - running migration...');
      await pool.query(`ALTER TABLE location_logs ADD COLUMN image_urls JSONB DEFAULT '[]'::jsonb`);
      console.log('✅ Migration complete - image_urls column added');
    }
    
    // Show all columns
    const columns = await pool.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'location_logs' ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Columns in location_logs:');
    columns.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkAndFix();
