// compare_schemas.js
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const OREGON_DB_URL = "postgresql://geotrack_dbtest_user:DpQrv5nopeTKqIUNQB6pQYeCdJgIlOxA@dpg-d7grg6po3t8c7392p2tg-a.oregon-postgres.render.com:5432/geotrack_dbtest";
const SINGAPORE_DB_URL = "postgresql://geotrackdb_user:gDBJB8LnmVT6UrIwKwv7uI13LH9BPMGp@dpg-d4rqmoc9c44c738du6dg-a.singapore-postgres.render.com/geotrackdb";

async function getTables(pool) {
  const result = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  return result.rows.map(r => r.table_name);
}

async function getColumns(pool, table) {
  const result = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = $1 
    ORDER BY ordinal_position
  `, [table]);
  return result.rows;
}

async function compareSchemas() {
  console.log("==============================================");
  console.log("📊 Comparing Oregon vs Singapore Schemas");
  console.log("==============================================\n");

  const oregonPool = new Pool({
    connectionString: OREGON_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  const singaporePool = new Pool({
    connectionString: SINGAPORE_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("🔍 Fetching Oregon tables...");
    const oregonTables = await getTables(oregonPool);
    console.log(`   Found ${oregonTables.length} tables\n`);

    console.log("🔍 Fetching Singapore tables...");
    const singaporeTables = await getTables(singaporePool);
    console.log(`   Found ${singaporeTables.length} tables\n`);

    const allTables = [...new Set([...oregonTables, ...singaporeTables])].sort();

    console.log("==============================================");
    console.log("📋 Table Comparison");
    console.log("==============================================\n");

    let hasDifferences = false;

    for (const table of allTables) {
      const inOregon = oregonTables.includes(table);
      const inSingapore = singaporeTables.includes(table);

      if (!inOregon) {
        console.log(`❌ ${table}: Missing in Oregon`);
        hasDifferences = true;
        continue;
      }
      if (!inSingapore) {
        console.log(`❌ ${table}: Missing in Singapore`);
        hasDifferences = true;
        continue;
      }

      const oregonCols = await getColumns(oregonPool, table);
      const singaporeCols = await getColumns(singaporePool, table);

      const oregonColNames = oregonCols.map(c => c.column_name).sort();
      const singaporeColNames = singaporeCols.map(c => c.column_name).sort();

      const missingInSingapore = oregonColNames.filter(c => !singaporeColNames.includes(c));
      const missingInOregon = singaporeColNames.filter(c => !oregonColNames.includes(c));

      if (missingInSingapore.length > 0 || missingInOregon.length > 0) {
        console.log(`⚠️  ${table}: Column mismatch`);
        if (missingInSingapore.length > 0) {
          console.log(`   Missing in Singapore: ${missingInSingapore.join(", ")}`);
        }
        if (missingInOregon.length > 0) {
          console.log(`   Missing in Oregon: ${missingInOregon.join(", ")}`);
        }
        hasDifferences = true;
      } else {
        console.log(`✅ ${table}: Schemas match`);
      }
    }

    console.log("\n==============================================");
    if (hasDifferences) {
      console.log("⚠️  Schemas have differences!");
    } else {
      console.log("✅ All schemas match perfectly!");
    }
    console.log("==============================================");

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await oregonPool.end();
    await singaporePool.end();
  }
}

compareSchemas();
