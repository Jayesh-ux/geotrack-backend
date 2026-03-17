
import { pool } from "./db.js";

async function fixAgentPincode() {
  try {
    console.log("Setting agent@test.com pincode to 400604...");
    await pool.query("UPDATE users SET pincode = '400604' WHERE email = 'agent@test.com'");
    console.log("✅ Done.");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

fixAgentPincode();
