
import { pool } from "./db.js";

async function checkRecentLocation() {
  try {
    const res = await pool.query(`
      SELECT latitude, longitude, created_at 
      FROM location_logs 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    console.log("Recent Agent Location:");
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkRecentLocation();
