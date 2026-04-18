import { pool } from "./db.js";

async function addSpatialIndex() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log("🔍 Checking for existing indexes on train_stations...");
    
    const indexCheck = await client.query(
      `SELECT indexname FROM pg_indexes 
       WHERE tablename = 'train_stations'`
    );
    
    console.log("Existing indexes:", indexCheck.rows.map(r => r.indexname));
    
    const latLonIndexExists = indexCheck.rows.some(r => r.indexname.includes('lat_lon') || r.indexname.includes('coordinates'));
    
    if (!latLonIndexExists) {
      console.log("📦 Creating index on latitude, longitude...");
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_train_stations_lat_lon 
        ON train_stations (latitude, longitude)
      `);
      
      console.log("✅ Index created: idx_train_stations_lat_lon");
    } else {
      console.log("⚠️ Coordinate index already exists");
    }
    
    console.log("\n🧪 Testing train station query with earth_distance (6km requirement)...");
    
    const testResult = await client.query(`
      SELECT id, station_name, city, latitude, longitude,
      (earth_distance(ll_to_earth(72.8777, 19.0760), ll_to_earth(latitude, longitude)) / 1000) as distance_km
      FROM train_stations
      WHERE earth_distance(ll_to_earth(72.8777, 19.0760), ll_to_earth(latitude, longitude)) <= 10000
      ORDER BY distance_km ASC
      LIMIT 1
    `);
    
    if (testResult.rows.length > 0) {
      console.log("✅ Train station within 10km found:", testResult.rows[0].station_name, `(${testResult.rows[0].distance_km.toFixed(2)}km)`);
    } else {
      console.log("⚠️ No station found within 10km of Mumbai (19.0760, 72.8777)");
    }
    
    console.log("\n🧪 Testing 6km train validation...");
    const sixKmTest = await client.query(`
      SELECT id, station_name, city, latitude, longitude,
      (earth_distance(ll_to_earth(72.8777, 19.0760), ll_to_earth(latitude, longitude)) / 1000) as distance_km
      FROM train_stations
      WHERE earth_distance(ll_to_earth(72.8777, 19.0760), ll_to_earth(latitude, longitude)) <= 6000
      ORDER BY distance_km ASC
      LIMIT 1
    `);
    
    if (sixKmTest.rows.length > 0) {
      console.log("✅ 6km test PASSED:", sixKmTest.rows[0].station_name, `(${sixKmTest.rows[0].distance_km.toFixed(2)}km)`);
    } else {
      console.log("❌ 6km test FAILED: No station within 6km");
    }
    
    await client.query('COMMIT');
    console.log("\n✅ Migration complete!");
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("❌ Migration failed:", err);
    throw err;
  } finally {
    client.release();
  }
}

addSpatialIndex()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));