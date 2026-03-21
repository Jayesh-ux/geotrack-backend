
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve('c:/Users/AVERLON ENTERPRISES/OneDrive/Desktop/Jayesh/Geo-Track/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    const sqlPath = path.resolve('c:/Users/AVERLON ENTERPRISES/OneDrive/Desktop/Jayesh/Geo-Track/migrations/003_enforce_uniqueness.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log("🚀 Running migration 003...");
    await pool.query(sql);
    console.log("✅ Migration 003 completed successfully.");
    
    // Check results
    const users = await pool.query('SELECT u.id, u.email, u.company_id, c.name FROM users u JOIN companies c ON u.company_id = c.id');
    console.log("Final Users:");
    console.table(users.rows);
    
    const companies = await pool.query('SELECT * FROM companies');
    console.log("Final Companies:");
    console.table(companies.rows);

  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await pool.end();
  }
}

runMigration();
