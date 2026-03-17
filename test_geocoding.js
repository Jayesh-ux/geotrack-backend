
import { getPincodeFromCoordinates } from "./services/geocoding.service.js";

async function testGeocoding() {
  const lat = 19.19825;
  const lng = 72.94904;
  console.log(`Testing PostGIS resolution for (${lat}, ${lng})...`);
  const pincode = await getPincodeFromCoordinates(lat, lng);
  console.log(`Result: ${pincode}`);
  if (pincode === '400604') {
    console.log("✅ SUCCESS: PostGIS resolved the coordinates correctly!");
  } else {
    console.log("❌ FAILURE: PostGIS did not resolve the coordinates.");
  }
  process.exit();
}

testGeocoding();
