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

        let currentFile;
        for (const file of files) {
            currentFile = file;
            console.log(`🛠️  Running migration: ${file}...`);
            const sql = readFileSync(resolve(migrationsDir, file), "utf8");
            
            // Execute the entire SQL file
            await pool.query(sql);
            console.log(`✅ Finished: ${file}`);
        }

        console.log("\n✨ All migrations completed successfully!");
    } catch (err) {
        console.error("\n❌ MIGRATION ERROR DETAILS:");
        console.error("   File:", currentFile || "Unknown");
        console.error("   Message:", err?.message || err);
        
        if (err?.message?.includes("permission denied")) {
            console.error("   💡 Hint: Render Free Tier usually allows basic extensions like 'cube' and 'earthdistance'.");
            console.error("      If this is a superuser error, ensure the extensions are pre-installed or try removing them from SQL.");
        }
        
        console.error("\n🚨 SERVER CONTINUING: The server will attempt to start anyway for debugging.");
        // We explicitly DO NOT process.exit(1) here so the server can boot and we can debug.
    } finally {
        // Only end the pool if we actually connect
        try { await pool.end(); } catch (e) {}
    }
}

run();
