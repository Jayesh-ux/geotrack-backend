
import { pool } from "../db.js";
import { getCoordinatesFromPincode, getCoordinatesFromAddress } from "../services/geocoding.service.js";

async function fixMissingCoordinates() {
  console.log("🚀 Starting missing coordinates fix...");

  try {
    // 1. Get all clients with missing coordinates but having address or pincode
    const result = await pool.query(`
      SELECT id, name, address, pincode 
      FROM clients 
      WHERE latitude IS NULL OR longitude IS NULL
    `);

    console.log(`📊 Found ${result.rows.length} clients needing geocoding.`);

    let fixed = 0;
    let failed = 0;

    for (const client of result.rows) {
      console.log(`\n🔍 Processing: ${client.name} (Pincode: ${client.pincode || 'N/A'})`);
      
      let coords = null;

      // Try pincode geocoding first (often faster/cheaper)
      if (client.pincode) {
        coords = await getCoordinatesFromPincode(client.pincode);
      }

      // If pincode geocoding failed, try address geocoding
      if (!coords && client.address) {
        coords = await getCoordinatesFromAddress(client.address);
      }

      if (coords && coords.latitude && coords.longitude) {
        await pool.query(
          `UPDATE clients SET latitude = $1, longitude = $2, pincode = COALESCE(pincode, $3) WHERE id = $4`,
          [coords.latitude, coords.longitude, coords.pincode || client.pincode, client.id]
        );
        console.log(`✅ Fixed coordinates for ${client.name}: ${coords.latitude}, ${coords.longitude}`);
        fixed++;
      } else {
        console.log(`❌ Could not resolve coordinates for ${client.name}`);
        failed++;
      }
    }

    console.log(`\n✨ Summary:`);
    console.log(`   - Fixed: ${fixed}`);
    console.log(`   - Failed: ${failed}`);

  } catch (err) {
    console.error("❌ Critical error during fix:", err);
  } finally {
    process.exit();
  }
}

fixMissingCoordinates();
