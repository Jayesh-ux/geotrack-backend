
import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "client_tracking_app",
  password: process.env.DB_PASSWORD || "root",
  port: process.env.DB_PORT || 5432,
});

async function debugData() {
  try {
    const users = await pool.query("SELECT id, name, email, role, company_id FROM users");
    console.log("--- USERS ---");
    console.table(users.rows);

    const companies = await pool.query("SELECT id, name FROM companies");
    console.log("--- COMPANIES ---");
    console.table(companies.rows);

    const clients = await pool.query("SELECT id, name, company_id FROM clients LIMIT 10");
    console.log("--- CLIENTS (Sample 10) ---");
    console.table(clients.rows);
    
    const clientCount = await pool.query("SELECT COUNT(*) FROM clients");
    console.log(`Total Clients: ${clientCount.rows[0].count}`);

    const agentCount = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'agent'");
    console.log(`Total Agents: ${agentCount.rows[0].count}`);

  } catch (err) {
    console.error("Error debugging data:", err);
  } finally {
    await pool.end();
  }
}

debugData();
