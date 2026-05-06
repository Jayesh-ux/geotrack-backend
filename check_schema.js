const { Pool } = require('pg');

const pool = new Pool({
  host: 'dpg-d0t1njofte5s73b1r2dg-a.oregon-postgres.render.com',
  port: 5432,
  database: 'geotrack_oregon',
  user: 'geotrack_oregon_user',
  password: 'MOlSajtaHjQQPig1miFh8qFNLuwJbNc',
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  try {
    // Check if image_urls column exists
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'location_logs' 
      AND column_name = 'image_urls'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ image_urls column EXISTS:', result.rows[0]);
    } else {
      console.log('❌ image_urls column DOES NOT EXIST - need to run migration');
      console.log('Run this SQL:');
      console.log('ALTER TABLE location_logs ADD COLUMN image_urls JSONB DEFAULT \'[]\'::jsonb;');
    }
    
    // Show all columns
    const allColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'location_logs' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 All columns in location_logs:');
    allColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
