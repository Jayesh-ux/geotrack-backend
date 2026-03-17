// scripts/runMigration.js
import { pool } from "../db.js";
import { readFileSync } from "fs";
import { resolve } from "path";

async function run() {
    console.log("🚀 Starting local migration...");

    try {
        const migrationPath = resolve("migrations/001_postgis_pincodes.sql");
        const sql = readFileSync(migrationPath, "utf8");

        // Split SQL by semicolor (simple split, won't work with functions/triggers, but for this SQL it's fine)
        // Actually, pg pool.query() can handle multiple commands if it's one big string.
        await pool.query(sql);

        console.log("✅ Migration successful!");
        console.log("📍 PostGIS extensions & pincodes table are now ready.");
    } catch (err) {
        if (err.message.includes("permission denied")) {
            console.error("❌ Permission Denied: You must be a PostgreSQL superuser to enable PostGIS extensions.");
        } else {
            console.error("❌ Migration failed:", err.message);
        }
    } finally {
        await pool.end();
    }
}

run();
