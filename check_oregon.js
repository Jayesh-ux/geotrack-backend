import pkg from "pg";
const { Pool } = pkg;

const OREGON_DB = {
  connectionString: "postgresql://geotrackdb_user:WTrqAeeE6vJGwxlZnl1R7nGpycgdDELp@dpg-d6sgsjshg0os73f6s1jg-a.oregon-postgres.render.com/geotrackdb_a9cp",
  ssl: { rejectUnauthorized: false }
};

async function checkOregonDetails() {
  const orPool = new Pool(OREGON_DB);

  try {
    // Check schema
    const schema = await orPool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      ORDER BY ordinal_position
    `);
    console.log("Oregon clients table columns:");
    schema.rows.forEach(r => console.log(`  - ${r.column_name}: ${r.data_type}`));

    // Get unique coordinates distribution
    const coords = await orPool.query(`
      SELECT latitude, longitude, COUNT(*) as count 
      FROM clients 
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      GROUP BY latitude, longitude 
      ORDER BY count DESC
      LIMIT 20
    `);
    
    console.log("\n📍 TOP 20 MOST COMMON COORDINATES (for healing):");
    coords.rows.forEach((r, i) => {
      console.log(`  ${i+1}. ${r.latitude}, ${r.longitude} - ${r.count} clients`);
    });

    // Check accuracy distribution
    const hasAccuracy = schema.rows.some(r => r.column_name === 'location_accuracy');
    if (hasAccuracy) {
      const accuracyStats = await orPool.query(`
        SELECT location_accuracy, COUNT(*) as count 
        FROM clients 
        GROUP BY location_accuracy
      `);
      console.log("\n📊 LOCATION ACCURACY DISTRIBUTION:");
      accuracyStats.rows.forEach(r => {
        console.log(`  - ${r.location_accuracy || 'NULL'}: ${r.count} clients`);
      });
    }

    // Check clients with the most common coord (fallback)
    const fallbackClients = await orPool.query(`
      SELECT name, address, location_accuracy
      FROM clients 
      WHERE latitude = 19.187291535150372 AND longitude = 73.22288080120603
      LIMIT 15
    `);
    
    console.log("\n⚠️ CLIENTS WITH FALLBACK COORDINATES (19.187, 73.222):");
    fallbackClients.rows.forEach((r, i) => {
      console.log(`  ${i+1}. ${r.name} | Accuracy: ${r.location_accuracy || 'NULL'}`);
      if (r.address) console.log(`     Address: ${r.address}`);
    });

    // Check location_logs for the fallback coord
    const agentLog = await orPool.query(`
      SELECT latitude, longitude, timestamp, pincode
      FROM location_logs 
      WHERE latitude IS NOT NULL
      ORDER BY timestamp DESC
      LIMIT 5
    `);
    
    console.log("\n📍 RECENT AGENT LOCATION LOGS:");
    agentLog.rows.forEach((r, i) => {
      console.log(`  ${i+1}. ${r.latitude}, ${r.longitude} | ${r.timestamp} | ${r.pincode}`);
    });

  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await orPool.end();
  }
}

checkOregonDetails();
