import { pool } from "./db.js";

async function countData() {
  try {
    const clients = await pool.query("SELECT COUNT(*) FROM clients");
    const agents = await pool.query("SELECT COUNT(*) FROM users WHERE is_admin = false");
    const companies = await pool.query("SELECT COUNT(*) FROM companies");
    
    console.log(`\n--- Database Status ---`);
    console.log(`Companies: ${companies.rows[0].count}`);
    console.log(`Agents:    ${agents.rows[0].count}`);
    console.log(`Clients:   ${clients.rows[0].count}`);
    
    if (parseInt(clients.rows[0].count) > 0) {
        const clientSample = await pool.query("SELECT id, name, company_id FROM clients LIMIT 5");
        console.log("\nSample Clients:");
        console.table(clientSample.rows);
    }

    if (parseInt(agents.rows[0].count) > 0) {
        const agentSample = await pool.query("SELECT id, email, company_id FROM users WHERE is_admin = false LIMIT 5");
        console.log("\nSample Agents:");
        console.table(agentSample.rows);
    }

  } catch (err) {
    console.error("Error counting data:", err);
  } finally {
    process.exit();
  }
}

countData();
