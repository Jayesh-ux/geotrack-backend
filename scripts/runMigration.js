// scripts/runMigration.js
import { pool } from "../db.js";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

async function run() {
    console.log("🚀 Starting database migrations...");

    try {
        const migrationsDir = resolve("migrations");
        const files = readdirSync(migrationsDir)
            .filter(f => f.endsWith(".sql"))
            .sort();

        console.log(`📦 Found ${files.length} migration files.`);

        for (const file of files) {
            console.log(`🛠️  Running migration: ${file}...`);
            const sql = readFileSync(resolve(migrationsDir, file), "utf8");
            
            // Execute the entire SQL file
            await pool.query(sql);
            console.log(`✅ Finished: ${file}`);
        }

        console.log("\n✨ All migrations completed successfully!");
    } catch (err) {
        if (err?.message?.includes("permission denied")) {
            console.error("\n❌ Permission Denied: You must be a PostgreSQL superuser to enable PostGIS extensions.");
            console.error("💡 On Render, this is usually handled automatically if the extension is pre-installed.");
        } else {
            console.error("\n❌ Migration failed:", err?.message || err);
        }
        console.error("🚨 Continuing anyway so the server can start! Check your Render DB logs.");
        // We explicitly DO NOT process.exit(1) here so the server can boot and we can debug.
    } finally {
        // Only end the pool if we actually connect
        try { await pool.end(); } catch (e) {}
    }
}

run();
