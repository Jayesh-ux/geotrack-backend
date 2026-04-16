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

    // Step 2: Fix the 333 clients with broken coordinate
    const fixResult = await client.query(`
      UPDATE clients
      SET location_accuracy = 'needs_verification',
          location_source = NULL,
          latitude = NULL,
          longitude = NULL
      WHERE latitude = 19.187291535150372
        AND longitude = 73.22288080120603
    `);
    console.log(`✅ Fixed ${fixResult.rowCount} clients with broken coordinates`);

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