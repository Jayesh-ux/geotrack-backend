// run_all_migrations.js
import pkg from "pg";
const { Pool } = pkg;
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
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

const migrationFiles = [
    "000_full_schema.sql",
    "001_postgis_pincodes.sql",
    "002_schema_alignment.sql",
    "003_enforce_uniqueness.sql",
    "004_seed_plans.sql",
    "005_user_active_status.sql",
    "006_add_building_column.sql",
    "007_trip_lifecycle.sql",
    "008_add_location_accuracy.sql",
];

async function run() {
    console.log("==============================================");
    console.log("🚀 GeoTrack Full Migration Script");
    console.log("==============================================\n");

    for (const file of migrationFiles) {
        const migrationPath = resolve("migrations", file);
        
        try {
            console.log(`📄 Running: ${file}`);
            const sql = readFileSync(migrationPath, "utf8");
            await pool.query(sql);
            console.log(`✅ Success: ${file}\n`);
        } catch (err) {
            console.error(`❌ Error in ${file}:`);
            console.error(`   Message: ${err.message}`);
            console.error(`   Code: ${err.code || 'N/A'}\n`);
            
            if (err.code === "42P07" || err.code === "42710") {
                console.log("   (Table/Object already exists - continuing...)\n");
            } else if (err.code === "42701") {
                console.log("   (Column already exists - continuing...)\n");
            } else if (err.code === "23505") {
                console.log("   (Duplicate key - continuing...)\n");
            } else {
                console.log("   ⚠️  Continuing to next migration...\n");
            }
        }
    }

    console.log("==============================================");
    console.log("✅ All migrations completed!");
    console.log("==============================================");
    
    await pool.end();
}

run().catch(err => {
    console.error("Fatal error:", err);
    pool.end();
    process.exit(1);
});
