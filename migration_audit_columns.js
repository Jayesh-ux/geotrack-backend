import { pool } from "./db.js";

async function addAuditColumns() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log("🔍 Checking audit columns in location_logs...");
    
    const columns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'location_logs'
    `);
    
    const existingCols = columns.rows.map(r => r.column_name);
    console.log("Existing columns:", existingCols.join(", "));
    
    const requiredCols = [
      { name: "location_confidence", type: "VARCHAR(20) DEFAULT 'LOW'" },
      { name: "is_initial", type: "BOOLEAN DEFAULT FALSE" },
      { name: "rejection_reason", type: "VARCHAR(100)" },
      { name: "idle_state_flag", type: "BOOLEAN DEFAULT FALSE" }
    ];
    
    for (const col of requiredCols) {
      if (!existingCols.includes(col.name)) {
        console.log(`📦 Adding column: ${col.name}`);
        await client.query(`ALTER TABLE location_logs ADD COLUMN ${col.name} ${col.type}`);
        console.log(`✅ ${col.name} added`);
      } else {
        console.log(`⚠️ ${col.name} already exists`);
      }
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

addAuditColumns()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));