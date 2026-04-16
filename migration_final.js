import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: "postgresql://geotrackdb_user:WTrqAeeE6vJGwxlZnl1R7nGpycgdDELp@dpg-d6sgsjshg0os73f6s1jg-a.oregon-postgres.render.com/geotrackdb_a9cp",
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Step 1: Add location_source column if not exists
    await client.query(`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS location_source VARCHAR(20)
    `);
    console.log('✅ Added location_source column');

    // Step 2: Create location_tag_log table (without foreign key)
    await client.query(`
      CREATE TABLE IF NOT EXISTS location_tag_log (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        client_id UUID,
        tagged_by UUID,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        source VARCHAR(20),
        tagged_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✅ Created location_tag_log table');

    // Step 3: Reset clients with broken coordinate
    const fixResult = await client.query(`
      UPDATE clients
      SET latitude = NULL,
          longitude = NULL,
          location_accuracy = 'needs_verification',
          location_source = NULL
      WHERE latitude = 19.187291535150372
        AND longitude = 73.22288080120603
    `);
    console.log(`✅ Fixed ${fixResult.rowCount} clients with broken coordinates`);

    // Verify counts
    const needsVerif = await client.query(
      "SELECT COUNT(*) as count FROM clients WHERE location_accuracy = 'needs_verification'"
    );
    console.log(`📊 Needs verification: ${needsVerif.rows[0].count}`);

    const nullCoords = await client.query(
      "SELECT COUNT(*) as count FROM clients WHERE latitude IS NULL OR longitude IS NULL"
    );
    console.log(`📊 Total missing GPS: ${nullCoords.rows[0].count}`);

    await client.query('COMMIT');
    console.log('✅ Migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();