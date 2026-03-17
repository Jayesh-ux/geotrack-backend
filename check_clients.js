
import { pool } from "./db.js";

async function checkClients() {
  try {
    const res = await pool.query("SELECT name, latitude, longitude FROM clients WHERE name LIKE '%Client%'");
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkClients();
