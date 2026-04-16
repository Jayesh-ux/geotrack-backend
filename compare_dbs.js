import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";
dotenv.config();

const SINGAPORE_DB = {
  connectionString: "postgresql://geotrackdb_user:gDBJB8LnmVT6UrIwKwv7uI13LH9BPMGp@dpg-d4rqmoc9c44c738du6dg-a.singapore-postgres.render.com/geotrackdb",
  ssl: { rejectUnauthorized: false }
};

const OREGON_DB = {
  connectionString: "postgresql://geotrackdb_user:WTrqAeeE6vJGwxlZnl1R7nGpycgdDELp@dpg-d6sgsjshg0os73f6s1jg-a.oregon-postgres.render.com/geotrackdb_a9cp",
  ssl: { rejectUnauthorized: false }
};

async function compareDatabases() {
  const sgPool = new Pool(SINGAPORE_DB);
  const orPool = new Pool(OREGON_DB);

  console.log("=".repeat(80));
  console.log("DATABASE COMPARISON REPORT: Singapore vs Oregon");
  console.log("=".repeat(80));

  try {
    // Check if location_accuracy column exists
    const sgSchema = await sgPool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'clients'
    `);
    const sgHasAccuracy = sgSchema.rows.some(r => r.column_name === 'location_accuracy');
    
    const orSchema = await orPool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'clients'
    `);
    const orHasAccuracy = orSchema.rows.some(r => r.column_name === 'location_accuracy');
    
    const sgAccSelect = sgHasAccuracy ? 'location_accuracy,' : "'' as location_accuracy,";
    const orAccSelect = orHasAccuracy ? 'location_accuracy,' : "'' as location_accuracy,";

    // Get all clients from Singapore
    const sgClients = await sgPool.query(`
      SELECT id, company_id, name, email, address, latitude, longitude, 
             ${sgAccSelect} status, created_at
      FROM clients ORDER BY id
    `);

    // Get all clients from Oregon
    const orClients = await orPool.query(`
      SELECT id, company_id, name, email, address, latitude, longitude, 
             ${orAccSelect} status, created_at
      FROM clients ORDER BY id
    `);

    const sgList = sgClients.rows;
    const orList = orClients.rows;

    console.log(`\n📊 OVERVIEW:`);
    console.log(`   Singapore DB: ${sgList.length} clients`);
    console.log(`   Oregon DB: ${orList.length} clients`);

    // Create maps for quick lookup
    const sgMap = new Map(sgList.map(c => [c.name?.toLowerCase().trim(), c]));
    const orMap = new Map(orList.map(c => [c.name?.toLowerCase().trim(), c]));

    // Stats
    const sgMissingGps = sgList.filter(c => !c.latitude || !c.longitude);
    const orMissingGps = orList.filter(c => !c.latitude || !c.longitude);
    const sgWithGps = sgList.filter(c => c.latitude && c.longitude);
    const orWithGps = orList.filter(c => c.latitude && c.longitude);

    console.log(`\n📍 GPS STATUS:`);
    console.log(`   Singapore - Missing GPS: ${sgMissingGps.length} | With GPS: ${sgWithGps.length}`);
    console.log(`   Oregon    - Missing GPS: ${orMissingGps.length} | With GPS: ${orWithGps.length}`);

    // Find clients that were missing in Singapore but are healed in Oregon
    console.log(`\n🔧 SELF-HEAL ANALYSIS:`);
    let healedInOregon = [];
    let stillMissingInOregon = [];
    let newlyAddedInOregon = [];

    for (const sgClient of sgList) {
      const key = sgClient.name?.toLowerCase().trim();
      const orClient = orMap.get(key);

      if (!orClient) {
        // Client exists in Singapore but NOT in Oregon
        newlyAddedInOregon.push(sgClient);
        continue;
      }

      // Check if Singapore client was missing GPS but Oregon has it
      if ((!sgClient.latitude || !sgClient.longitude) && orClient.latitude && orClient.longitude) {
        healedInOregon.push({
          name: sgClient.name,
          sg_lat: sgClient.latitude,
          sg_lng: sgClient.longitude,
          or_lat: orClient.latitude,
          or_lng: orClient.longitude,
          accuracy: orClient.location_accuracy,
          source: 'self-heal'
        });
      }

      // Check if still missing in Oregon
      if (!sgClient.latitude && !sgClient.longitude && !orClient.latitude && !orClient.longitude) {
        stillMissingInOregon.push({
          name: sgClient.name,
          address: sgClient.address
        });
      }
    }

    console.log(`\n✅ HEALED IN OREGON (Singapore missing → Oregon has GPS):`);
    console.log(`   Total healed: ${healedInOregon.length}`);
    if (healedInOregon.length > 0) {
      console.log(`\n   Accuracy Distribution:`);
      const accuracyCount = {};
      healedInOregon.forEach(c => {
        const acc = c.accuracy || 'unknown';
        accuracyCount[acc] = (accuracyCount[acc] || 0) + 1;
      });
      Object.entries(accuracyCount).forEach(([acc, count]) => {
        console.log(`     - ${acc}: ${count} clients`);
      });

      console.log(`\n   Sample Healed Clients (first 10):`);
      healedInOregon.slice(0, 10).forEach((c, i) => {
        console.log(`     ${i+1}. ${c.name}`);
        console.log(`        Oregon: ${c.or_lat}, ${c.or_lng} (${c.accuracy})`);
      });
    }

    console.log(`\n❌ STILL MISSING IN OREGON (both DBs missing GPS):`);
    console.log(`   Total: ${stillMissingInOregon.length}`);
    if (stillMissingInOregon.length > 0 && stillMissingInOregon.length <= 20) {
      stillMissingInOregon.forEach((c, i) => {
        console.log(`     ${i+1}. ${c.name} | ${c.address || 'no address'}`);
      });
    } else if (stillMissingInOregon.length > 20) {
      console.log(`   (showing first 20 of ${stillMissingInOregon.length})`);
      stillMissingInOregon.slice(0, 20).forEach((c, i) => {
        console.log(`     ${i+1}. ${c.name} | ${c.address || 'no address'}`);
      });
    }

    // Check accuracy distribution of healed clients
    console.log(`\n📐 ACCURACY ANALYSIS OF SELF-HEALED:`);
    let approximateCount = 0;
    let geocodedCount = 0;
    let exactCount = 0;
    let unknownCount = 0;

    healedInOregon.forEach(c => {
      switch(c.accuracy) {
        case 'approximate': approximateCount++; break;
        case 'geocoded': geocodedCount++; break;
        case 'exact': exactCount++; break;
        default: unknownCount++;
      }
    });

    const totalHealed = healedInOregon.length;
    console.log(`   Approximate (from agent logs): ${approximateCount} (${((approximateCount/totalHealed)*100).toFixed(1)}%)`);
    console.log(`   Geocoded (from Google API):    ${geocodedCount} (${((geocodedCount/totalHealed)*100).toFixed(1)}%)`);
    console.log(`   Exact (manually pinned):       ${exactCount} (${((exactCount/totalHealed)*100).toFixed(1)}%)`);

    // Calculate distance variance for approximate heals
    console.log(`\n📍 LOCATION ACCURACY ASSESSMENT:`);
    if (approximateCount > 0) {
      const approxClients = healedInOregon.filter(c => c.accuracy === 'approximate');
      console.log(`   ⚠️  ${approxClients.length} clients got LAST AGENT LOCATION as fallback`);
      console.log(`      This means ALL clients in same area get EXACT SAME coordinates!`);
      console.log(`      These are NOT actual client locations - just agent's last known position`);
      console.log(`      RECOMMENDATION: Mark these as "needs verification" or manual pin`);
    }
    if (geocodedCount > 0) {
      const geoClients = healedInOregon.filter(c => c.accuracy === 'geocoded');
      console.log(`   ✅ ${geoClients.length} clients geocoded from address (Google API)`);
      console.log(`      Accuracy depends on address quality - typically 10-500m accuracy`);
    }
    if (exactCount > 0) {
      const exactClients = healedInOregon.filter(c => c.accuracy === 'exact');
      console.log(`   ✅ ${exactClients.length} clients manually pinned (100% accurate)`);
    }

    // Final verdict
    console.log(`\n${"=".repeat(80)}`);
    console.log("VERDICT:");
    console.log("=".repeat(80));
    
    const healRate = sgMissingGps.length > 0 ? ((healedInOregon.length / sgMissingGps.length) * 100).toFixed(1) : 0;
    console.log(`\n   Self-heal success rate: ${healRate}% (${healedInOregon.length}/${sgMissingGps.length} missing clients healed)`);
    console.log(`   Still need manual attention: ${stillMissingInOregon.length} clients`);
    
    if (geocodedCount > 0 && approximateCount > 0) {
      console.log(`\n   ⚠️  MIXED QUALITY:`);
      console.log(`      - Geocoded (good): ${geocodedCount} clients`);
      console.log(`      - Approximate (poor): ${approximateCount} clients (all same coords)`);
      console.log(`\n   RECOMMENDATION: Self-heal is PARTIALLY RELIABLE`);
      console.log(`      - Use for visualization on map (show approximate areas)`);
      console.log(`      - DO NOT use for distance calculations or route planning`);
      console.log(`      - DO mark approximate clients for field verification`);
    } else if (approximateCount === 0 && geocodedCount > 0) {
      console.log(`\n   ✅ GOOD QUALITY: All healed via geocoding`);
      console.log(`      Self-heal is RELIABLE for general use`);
    } else if (approximateCount > 0 && geocodedCount === 0) {
      console.log(`\n   ❌ POOR QUALITY: All healed via fallback (same coordinates)`);
      console.log(`      Self-heal is NOT RELIABLE - needs manual intervention`);
    }

  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await sgPool.end();
    await orPool.end();
  }
}

compareDatabases();
