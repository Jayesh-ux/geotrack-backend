
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('c:/Users/AVERLON ENTERPRISES/OneDrive/Desktop/Jayesh/Geo-Track/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    console.log("Checking database...");
    
    const userCount = await pool.query("SELECT COUNT(*) FROM users");
    console.log(`Total users: ${userCount.rows[0].count}`);
    
    const usersWithCompany = await pool.query("SELECT email, is_admin, is_super_admin, company_id FROM users LIMIT 10");
    console.log("Sample users:");
    console.table(usersWithCompany.rows);
    
    const companyCount = await pool.query("SELECT COUNT(*) FROM companies");
    console.log(`Total companies: ${companyCount.rows[0].count}`);
    
    const clientCount = await pool.query("SELECT COUNT(*) FROM clients");
    console.log(`Total clients: ${clientCount.rows[0].count}`);
    
    const logCount = await pool.query("SELECT COUNT(*) FROM location_logs");
    console.log(`Total location logs: ${logCount.rows[0].count}`);
    
    const meetingCount = await pool.query("SELECT COUNT(*) FROM meetings");
    console.log(`Total meetings: ${meetingCount.rows[0].count}`);

    const companyIds = await pool.query("SELECT id, name FROM companies");
    console.log("Companies:");
    console.table(companyIds.rows);

  } catch (err) {
    console.error("Error checking DB:", err);
  } finally {
    await pool.end();
  }
}

check();
