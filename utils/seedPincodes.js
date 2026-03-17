// ============================================================
// utils/seedPincodes.js
// Seeds the local pincodes table with Indian postal data.
//
// DATA SOURCE OPTIONS:
//   Option A: Use bundled sample data (covers major cities, runs immediately)
//   Option B: Download full 155,000-pincode CSV from Open Data
//
// USAGE:
//   node utils/seedPincodes.js         → seeds with bundled sample data
//   node utils/seedPincodes.js --full  → expects pincodes.csv in project root
// ============================================================

import { pool } from "../db.js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// ─────────────────────────────────────────────────────────────
// BUNDLED SAMPLE DATA — Major Indian cities coverage
// Enough to get started. Extend with a full CSV for production.
// Source: India Post / OSM community verified data
// ─────────────────────────────────────────────────────────────
const SAMPLE_PINCODES = [
    // Mumbai
    { postalcode: "400001", latitude: 18.9322, longitude: 72.8264, city: "Mumbai", state: "Maharashtra" },
    { postalcode: "400051", latitude: 19.0596, longitude: 72.8295, city: "Mumbai", state: "Maharashtra" },
    { postalcode: "400064", latitude: 19.1136, longitude: 72.8697, city: "Mumbai", state: "Maharashtra" },
    { postalcode: "400070", latitude: 19.0748, longitude: 72.8856, city: "Chembur", state: "Maharashtra" },
    { postalcode: "400080", latitude: 19.1196, longitude: 72.9008, city: "Mulund", state: "Maharashtra" },
    // Pune
    { postalcode: "411001", latitude: 18.5196, longitude: 73.8553, city: "Pune", state: "Maharashtra" },
    { postalcode: "411014", latitude: 18.5642, longitude: 73.9229, city: "Pune", state: "Maharashtra" },
    { postalcode: "411028", latitude: 18.4982, longitude: 73.8258, city: "Pune", state: "Maharashtra" },
    // Delhi
    { postalcode: "110001", latitude: 28.6517, longitude: 77.2219, city: "New Delhi", state: "Delhi" },
    { postalcode: "110011", latitude: 28.6139, longitude: 77.2090, city: "New Delhi", state: "Delhi" },
    { postalcode: "110025", latitude: 28.5672, longitude: 77.2100, city: "Delhi", state: "Delhi" },
    { postalcode: "110055", latitude: 28.6573, longitude: 77.1806, city: "Delhi", state: "Delhi" },
    // Bangalore
    { postalcode: "560001", latitude: 12.9716, longitude: 77.5946, city: "Bengaluru", state: "Karnataka" },
    { postalcode: "560029", latitude: 12.9352, longitude: 77.6245, city: "Bengaluru", state: "Karnataka" },
    { postalcode: "560068", latitude: 12.9854, longitude: 77.7081, city: "Bengaluru", state: "Karnataka" },
    // Hyderabad
    { postalcode: "500001", latitude: 17.3750, longitude: 78.4744, city: "Hyderabad", state: "Telangana" },
    { postalcode: "500032", latitude: 17.4435, longitude: 78.3772, city: "Hyderabad", state: "Telangana" },
    { postalcode: "500072", latitude: 17.4947, longitude: 78.3996, city: "Hyderabad", state: "Telangana" },
    // Chennai
    { postalcode: "600001", latitude: 13.0843, longitude: 80.2705, city: "Chennai", state: "Tamil Nadu" },
    { postalcode: "600020", latitude: 13.0559, longitude: 80.2131, city: "Chennai", state: "Tamil Nadu" },
    { postalcode: "600042", latitude: 13.0072, longitude: 80.2560, city: "Chennai", state: "Tamil Nadu" },
    // Kolkata
    { postalcode: "700001", latitude: 22.5726, longitude: 88.3639, city: "Kolkata", state: "West Bengal" },
    { postalcode: "700019", latitude: 22.5095, longitude: 88.3680, city: "Kolkata", state: "West Bengal" },
    { postalcode: "700091", latitude: 22.5958, longitude: 88.4269, city: "Kolkata", state: "West Bengal" },
    // Ahmedabad
    { postalcode: "380001", latitude: 23.0258, longitude: 72.5873, city: "Ahmedabad", state: "Gujarat" },
    { postalcode: "380015", latitude: 23.0508, longitude: 72.5265, city: "Ahmedabad", state: "Gujarat" },
    { postalcode: "380054", latitude: 23.0456, longitude: 72.6483, city: "Ahmedabad", state: "Gujarat" },
    // Surat
    { postalcode: "395001", latitude: 21.1702, longitude: 72.8311, city: "Surat", state: "Gujarat" },
    { postalcode: "395007", latitude: 21.1952, longitude: 72.8466, city: "Surat", state: "Gujarat" },
    // Jaipur
    { postalcode: "302001", latitude: 26.9124, longitude: 75.7873, city: "Jaipur", state: "Rajasthan" },
    { postalcode: "302017", latitude: 26.9407, longitude: 75.7440, city: "Jaipur", state: "Rajasthan" },
    // Lucknow
    { postalcode: "226001", latitude: 26.8467, longitude: 80.9462, city: "Lucknow", state: "Uttar Pradesh" },
    { postalcode: "226022", latitude: 26.8718, longitude: 80.9955, city: "Lucknow", state: "Uttar Pradesh" },
    // Nagpur
    { postalcode: "440001", latitude: 21.1458, longitude: 79.0882, city: "Nagpur", state: "Maharashtra" },
    { postalcode: "440010", latitude: 21.1267, longitude: 79.0632, city: "Nagpur", state: "Maharashtra" },
    // Indore
    { postalcode: "452001", latitude: 22.7196, longitude: 75.8577, city: "Indore", state: "Madhya Pradesh" },
];

async function ensureExtensions() {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS cube`);
    await pool.query(`CREATE EXTENSION IF NOT EXISTS earthdistance`);
    console.log("✅ Extensions enabled: cube, earthdistance");
}

async function ensureTable() {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS pincodes (
      id         SERIAL PRIMARY KEY,
      postal_code VARCHAR(20) UNIQUE NOT NULL,
      latitude   DOUBLE PRECISION NOT NULL,
      longitude  DOUBLE PRECISION NOT NULL,
      city       VARCHAR(100),
      state      VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
    await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_pincodes_spatial
      ON pincodes USING gist (ll_to_earth(latitude, longitude))
  `);
    console.log("✅ pincodes table ready");
}

async function seedFromCSV(csvPath) {
    console.log(`📂 Reading CSV: ${csvPath}`);
    const content = readFileSync(csvPath, "utf-8");
    const lines = content.split("\n").slice(1); // skip header

    let inserted = 0;
    let skipped = 0;

    for (const line of lines) {
        if (!line.trim()) continue;
        const cols = line.split(",");
        const postal_code = cols[0]?.trim();
        const latitude = parseFloat(cols[1]);
        const longitude = parseFloat(cols[2]);
        const city = cols[3]?.trim() || null;
        const state = cols[4]?.trim() || null;

        if (!postal_code || isNaN(latitude) || isNaN(longitude)) { skipped++; continue; }

        try {
            await pool.query(
                `INSERT INTO pincodes (postal_code, latitude, longitude, city, state)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (postal_code) DO NOTHING`,
                [postal_code, latitude, longitude, city, state]
            );
            inserted++;
        } catch { skipped++; }
    }
    return { inserted, skipped };
}

async function seedSampleData() {
    let inserted = 0;
    for (const row of SAMPLE_PINCODES) {
        try {
            await pool.query(
                `INSERT INTO pincodes (postal_code, latitude, longitude, city, state)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (postal_code) DO NOTHING`,
                [row.postalcode, row.latitude, row.longitude, row.city, row.state]
            );
            inserted++;
        } catch { /* skip */ }
    }
    return inserted;
}

async function main() {
    console.log("🌍 GeoTrack Pincode Seeder");
    console.log("══════════════════════════════\n");

    const useFullCSV = process.argv.includes("--full");

    try {
        await ensureExtensions();
        await ensureTable();

        if (useFullCSV) {
            const csvPath = resolve("./pincodes.csv");
            if (!existsSync(csvPath)) {
                console.error(`❌ pincodes.csv not found at ${csvPath}`);
                console.log(`\n📥 Download it from:`);
                console.log(`   https://data.gov.in/resource/all-india-pincode-directory-till-last-month`);
                console.log(`   OR: https://raw.githubusercontent.com/yourendless/pincode-data/main/pincodes.csv`);
                process.exit(1);
            }
            const { inserted, skipped } = await seedFromCSV(csvPath);
            console.log(`\n✅ CSV Seed complete: ${inserted} inserted, ${skipped} skipped`);
        } else {
            const inserted = await seedSampleData();
            console.log(`\n✅ Sample data seeded: ${inserted} / ${SAMPLE_PINCODES.length} pincodes inserted`);
            console.log(`\n💡 Tip: For full India coverage, download pincodes.csv and run:`);
            console.log(`        node utils/seedPincodes.js --full`);
        }

        // Verify the spatial index works
        const test = await pool.query(`
      SELECT postal_code, city,
             earth_distance(ll_to_earth(latitude, longitude), ll_to_earth(18.9322, 72.8264)) AS dist
      FROM pincodes
      ORDER BY ll_to_earth(latitude, longitude) <-> ll_to_earth(18.9322, 72.8264)
      LIMIT 1
    `);
        if (test.rows.length > 0) {
            console.log(`\n🧪 Spatial test: nearest to Mumbai CST → ${test.rows[0].postal_code} (${test.rows[0].city}) at ${parseFloat(test.rows[0].dist).toFixed(0)}m`);
            console.log(`\n🚀 PostGIS-first geocoding is READY!`);
        }

        const count = await pool.query(`SELECT COUNT(*) FROM pincodes`);
        console.log(`📊 Total pincodes in DB: ${count.rows[0].count}`);

    } catch (err) {
        console.error("❌ Seeder failed:", err.message);
    } finally {
        await pool.end();
    }
}

main();
