const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://geotrack_oregon_user:MOlSajtaHjQQPig1miFh8qFNLuwJbNc@dpg-d0t1njofte5s73b1r2dg-a.oregon-postgres.render.com:5432/geotrack_oregon",
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  try {
    await client.connect();
    console.log('✅ Connected to Oregon database\n');
    
    // Check if image_urls column exists
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'location_logs' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 All columns in location_logs:');
    console.log('━'.repeat(80));
    
    result.rows.forEach(row => {
      const defaultVal = row.column_default ? ` [default: ${row.column_default}]` : '';
      console.log(`  ✓ ${row.column_name.padEnd(25)} | ${row.data_type.padEnd(20)} | nullable: ${row.is_nullable}${defaultVal}`);
    });
    
    console.log('━'.repeat(80));
    
    // Check specifically for image_urls
    const hasImageUrls = result.rows.some(r => r.column_name === 'image_urls');
    if (hasImageUrls) {
      console.log('\n✅ image_urls column EXISTS');
    } else {
      console.log('\n❌ image_urls column DOES NOT EXIST');
      console.log('\n🔧 Run this SQL to fix:');
      console.log('ALTER TABLE location_logs ADD COLUMN image_urls JSONB DEFAULT \'[]\'::jsonb;');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

checkSchema();
