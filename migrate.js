// migrate.js
import pkg from "pg";
const { Pool } = pkg;
import { readFileSync } from "fs";
import { resolve } from "path";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

console.log("🛠️  Project Env Config:");
console.log(`- DB_USER: ${process.env.DB_USER || 'from DATABASE_URL'}`);
console.log(`- DB_HOST: ${process.env.DB_HOST || 'from DATABASE_URL'}`);
console.log(`- DB_NAME: ${process.env.DB_NAME || 'from DATABASE_URL'}`);
console.log(`- DB_PORT: ${process.env.DB_PORT || 'from DATABASE_URL'}`);
console.log(`- DATABASE_URL: ${connectionString ? 'SET ✓' : 'NOT SET'}`);

const pool = new Pool(
    connectionString
        ? {
            connectionString: connectionString,
            ssl: { rejectUnauthorized: false }
        }
        : {
            user: process.env.DB_USER || "postgres",
            host: process.env.DB_HOST || "localhost",
            database: process.env.DB_NAME || "client_tracking_app",
            password: process.env.DB_PASSWORD || "root",
            port: parseInt(process.env.DB_PORT) || 5432,
        }
);

async function run() {
    console.log("\n🚀 Starting local PostGIS migration...");

    try {
        // 1. Check connection
        console.log("🔗 Verifying database connection...");
        const conn = await pool.query("SELECT 1");
        if (conn) console.log("✅ Connection SUCCESS");

        // 2. Load SQL
        const migrationPath = resolve("migrations/001_postgis_pincodes.sql");
        const sql = readFileSync(migrationPath, "utf8");

        // 3. Execute SQL
        console.log("📦 Executing SQL migration...");
        await pool.query(sql);

        console.log("✅ Migration successful!");
        console.log("📍 PostGIS extensions & pincodes table are now ready.");
        console.log("📊 You can now run: node utils/seedPincodes.js");
    } catch (err) {
        console.error("\n❌ FATAL ERROR DURING MIGRATION:");
        console.error("---------------------------------");
        console.error(`Message: ${err.message}`);
        console.error(`Code:    ${err.code || 'N/A'}`);
        console.error(`Detail:  ${err.detail || 'N/A'}`);
        console.error("---------------------------------");

        if (err.message.includes("permission denied")) {
            console.log("\n💡 HINT: You must be a superuser to enable PostGIS extensions.");
        }
        if (err.code === "3D000") {
            console.log(`\n💡 HINT: Database "${process.env.DB_NAME}" does not exist. Please create it first!`);
        }
    } finally {
        await pool.end();
    }
}

run();
