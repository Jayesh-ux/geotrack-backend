
import { pool } from "./db.js";

async function checkPostGIS() {
  try {
    console.log("Checking PostGIS extensions...");
    const ext = await pool.query("SELECT * FROM pg_extension WHERE extname IN ('postgis', 'earthdistance', 'cube')");
    console.table(ext.rows);

    console.log("\nChecking pincodes table count...");
    const count = await pool.query("SELECT COUNT(*) FROM pincodes");
    console.log(`Total pincodes in DB: ${count.rows[0].count}`);

    console.log("\nChecking nearest pincode to Lodha Supremus (19.19825, 72.94904)...");
    const nearest = await pool.query(`
      SELECT postalcode, city, state,
             earth_distance(ll_to_earth(latitude, longitude), ll_to_earth(19.19825, 72.94904)) AS distance_m
      FROM pincodes
      ORDER BY ll_to_earth(latitude, longitude) <-> ll_to_earth(19.19825, 72.94904)
      LIMIT 1
    `);
    console.table(nearest.rows);

  } catch (err) {
    console.error("❌ PostGIS check failed:", err.message);
  } finally {
    process.exit();
  }
}

checkPostGIS();
