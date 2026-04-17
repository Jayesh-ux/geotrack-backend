// verify_schema.js
import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

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

async function verify() {
    console.log("==============================================");
    console.log("🔍 Database Schema Verification");
    console.log("==============================================\n");

    const tables = [
        'users', 'profiles', 'clients', 'companies', 'meetings',
        'location_logs', 'user_sessions', 'plan_features',
        'company_licenses', 'tally_sync_queue', 'pincodes',
        'expenses', 'trip_expenses', 'payments'
    ];

    for (const table of tables) {
        try {
            const result = await pool.query(
                `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = $1`,
                [table]
            );
            const exists = parseInt(result.rows[0].count) > 0;
            console.log(`${exists ? '✅' : '❌'} ${table}: ${exists ? 'EXISTS' : 'MISSING'}`);
        } catch (err) {
            console.log(`❌ ${table}: ERROR - ${err.message}`);
        }
    }

    console.log("\n==============================================");
    console.log("📊 Table Counts:");
    console.log("==============================================\n");

    for (const table of tables) {
        try {
            const result = await pool.query(`SELECT COUNT(*) as count FROM "${table}"`);
            console.log(`📊 ${table}: ${result.rows[0].count} rows`);
        } catch (err) {
            console.log(`⚠️  ${table}: ${err.message}`);
        }
    }

    await pool.end();
}

verify();
