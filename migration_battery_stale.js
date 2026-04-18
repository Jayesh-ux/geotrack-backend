import { pool } from "./db.js";

async function addBatteryStaleColumn() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log("🔍 Checking for battery_stale column...");
    
    const colCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'location_logs' AND column_name = 'battery_stale'
    `);
    
    if (colCheck.rows.length === 0) {
      console.log("📦 Adding battery_stale column...");
      await client.query(`
        ALTER TABLE location_logs 
        ADD COLUMN battery_stale BOOLEAN DEFAULT FALSE
      `);
      console.log("✅ battery_stale column added");
    } else {
      console.log("⚠️ battery_stale column already exists");
    }
    
    await client.query('COMMIT');
    console.log("✅ Migration complete!");
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("❌ Migration failed:", err);
    throw err;
  } finally {
    client.release();
  }
}

addBatteryStaleColumn()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));