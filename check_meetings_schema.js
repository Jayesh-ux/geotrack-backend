
import { pool } from "./db.js";

async function checkMeetingsSchema() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'meetings'
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkMeetingsSchema();
