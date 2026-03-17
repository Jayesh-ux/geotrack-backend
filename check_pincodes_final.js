
import { pool } from "./db.js";

async function checkPincodes() {
  try {
    const res = await pool.query("SELECT email, pincode, is_admin FROM users WHERE email IN ('agent@test.com', 'admin@test.com')");
    console.log("--- User Status ---");
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkPincodes();
