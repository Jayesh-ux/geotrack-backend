
import { pool } from "./db.js";

async function checkIndex() {
  try {
    const res = await pool.query("SELECT * FROM pg_indexes WHERE tablename = 'pincodes'");
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkIndex();
