// migrate_oregon_sessions.js
// Apply session fixes to OREGON database ONLY
import pkg from "pg";
const { Pool } = pkg;

const OREGON_DB_URL = "postgresql://geotrack_dbtest_user:DpQrv5nopeTKqIUNQB6pQYeCdJgIlOxA@dpg-d7grg6po3t8c7392p2tg-a.oregon-postgres.render.com:5432/geotrack_dbtest";

const pool = new Pool({ connectionString: OREGON_DB_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Clean up existing duplicate active sessions (safety first)
    console.log("🧹 Cleaning up duplicate active sessions...");
    const duplicates = await client.query(`
      WITH ranked AS (
        SELECT id, user_id, 
               ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY started_at ASC) as rn
        FROM user_tracking_sessions 
        WHERE session_state = 'ACTIVE' AND ended_at IS NULL
      )
      UPDATE user_tracking_sessions 
      SET session_state = 'ENDED', 
          ended_at = started_at,
          clock_out_location = clock_in_location
      WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
      RETURNING user_id, id, started_at
    `);

    if (duplicates.rows.length > 0) {
      console.log(`  ✅ Closed ${duplicates.rows.length} duplicate sessions:`);
      duplicates.rows.forEach(r => console.log(`    - User ${r.user_id}: closed session ${r.id}`));
    } else {
      console.log("  ✅ No duplicate sessions found");
    }

    // 2. Add partial unique index (PostgreSQL supports WHERE clause)
    console.log("\n🔒 Adding unique constraint for active sessions...");
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_session 
      ON user_tracking_sessions (user_id, company_id) 
      WHERE session_state = 'ACTIVE'
    `);
    console.log("  ✅ Unique index created (only 1 ACTIVE session per user)");

    // 3. Add index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_active 
      ON user_tracking_sessions (user_id, session_state, started_at DESC)
    `);
    console.log("  ✅ Lookup index created");

    // 4. Update users table to point to correct session
    console.log("\n🔄 Updating users table with correct session IDs...");
    const updateResult = await client.query(`
      UPDATE users u SET current_session_id = (
        SELECT id FROM user_tracking_sessions 
        WHERE user_tracking_sessions.user_id = u.id 
          AND session_state = 'ACTIVE' 
        ORDER BY started_at ASC LIMIT 1
      )
      WHERE u.id IN (
        SELECT DISTINCT user_id FROM user_tracking_sessions 
        WHERE session_state = 'ACTIVE'
      )
      RETURNING u.id
    `);
    console.log(`  ✅ Updated ${updateResult.rowCount} users with correct session ID`);

    // 5. Verify the constraint works
    console.log("\n✅ Verifying constraint...");
    const verifyResult = await client.query(`
      SELECT COUNT(DISTINCT user_id) as users_with_active,
             COUNT(*) as total_active
      FROM user_tracking_sessions 
      WHERE session_state = 'ACTIVE' AND ended_at IS NULL
    `);
    console.log(`  Users with active sessions: ${verifyResult.rows[0].users_with_active}`);
    console.log(`  Total active sessions: ${verifyResult.rows[0].total_active}`);

    await client.query('COMMIT');
    console.log("\n🎉 Migration completed successfully!");

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Migration failed:", error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(e => {
  console.error("Fatal error:", e);
  process.exit(1);
});
