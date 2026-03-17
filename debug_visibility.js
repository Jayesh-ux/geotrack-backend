import { pool } from "./db.js";
import fs from "fs";

async function debugVisibility() {
  try {
    const data = {};
    
    console.log("Fetching Companies...");
    const companies = await pool.query("SELECT id, name FROM companies");
    data.companies = companies.rows;

    console.log("Fetching Users...");
    const users = await pool.query("SELECT * FROM users");
    data.users = users.rows;

    console.log("Fetching Clients...");
    const clients = await pool.query("SELECT id, name, company_id, pincode FROM clients");
    data.clients = clients.rows;

    try {
        const pincodes = await pool.query("SELECT * FROM agent_pincodes");
        data.agent_pincodes = pincodes.rows;
    } catch (e) {
        data.agent_pincodes = "table not found";
    }

    fs.writeFileSync("debug_result.json", JSON.stringify(data, null, 2));
    console.log("Debug data written to debug_result.json");

  } catch (err) {
    console.error("Error debugging visibility:", err);
  } finally {
    process.exit();
  }
}

debugVisibility();
