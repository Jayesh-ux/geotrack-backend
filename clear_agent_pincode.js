
import { pool } from "./db.js";

async function clearAgentPincode() {
  try {
    console.log("Clearing agent@test.com pincode to NULL to test auto-capture...");
    await pool.query("UPDATE users SET pincode = NULL WHERE email = 'agent@test.com'");
    console.log("✅ Done.");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

clearAgentPincode();
