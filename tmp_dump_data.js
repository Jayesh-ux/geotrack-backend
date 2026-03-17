
import { pool } from "./db.js";

async function dumpData() {
  try {
    const users = await pool.query("SELECT id, email, company_id FROM users LIMIT 5");
    const clients = await pool.query("SELECT id, name, pincode, company_id, latitude, longitude FROM clients LIMIT 5");
    const companies = await pool.query("SELECT id, name FROM companies LIMIT 5");

    console.log("--- USERS ---");
    console.log(JSON.stringify(users.rows, null, 2));
    console.log("--- CLIENTS ---");
    console.log(JSON.stringify(clients.rows, null, 2));
    console.log("--- COMPANIES ---");
    console.log(JSON.stringify(companies.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

dumpData();
