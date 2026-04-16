import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: "postgresql://geotrackdb_user:WTrqAeeE6vJGwxlZnl1R7nGpycgdDELp@dpg-d6sgsjshg0os73f6s1jg-a.oregon-postgres.render.com/geotrackdb_a9cp",
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  try {
    const cols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      AND column_name IN ('location_source', 'location_accuracy')
    `);
    console.log('Existing columns:', JSON.stringify(cols.rows));
    
    const broken = await pool.query(
      "SELECT COUNT(*) as count FROM clients WHERE latitude = 19.187291535150372 AND longitude = 73.22288080120603"
    );
    console.log('Clients with broken coordinate:', broken.rows[0].count);
    
    const nullCoords = await pool.query(
      "SELECT COUNT(*) as count FROM clients WHERE latitude IS NULL OR longitude IS NULL"
    );
    console.log('Clients with NULL coordinates:', nullCoords.rows[0].count);
  } catch(e) {
    console.error("Error:", e);
  } finally {
    await pool.end();
  }
}

checkSchema();