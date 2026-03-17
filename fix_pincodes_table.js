
import { pool } from "./db.js";

async function fixTable() {
  try {
    console.log("Adding UNIQUE constraint to pincodes(postal_code)...");
    await pool.query("ALTER TABLE pincodes ADD CONSTRAINT pincodes_postal_code_key UNIQUE (postal_code)");
    console.log("✅ Done.");
  } catch (err) {
    if (err.message.includes('already exists')) {
        console.log("✅ Already exists.");
    } else {
        console.error(err);
    }
  } finally {
    process.exit();
  }
}

fixTable();
