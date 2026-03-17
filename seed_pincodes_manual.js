
import { pool } from "./db.js";

async function seedPincodes() {
  const localData = [
    { code: "400604", lat: 19.19825, lng: 72.94904, city: "Thane", state: "Maharashtra" },
    { code: "400601", lat: 19.1969, lng: 72.9719, city: "Thane", state: "Maharashtra" },
    { code: "400001", lat: 18.9400, lng: 72.8353, city: "Mumbai", state: "Maharashtra" }
  ];

  try {
    console.log("Seeding reference pincodes for PostGIS...");
    for (const p of localData) {
      await pool.query(
        "INSERT INTO pincodes (postal_code, latitude, longitude, city, state) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (postal_code) DO NOTHING",
        [p.code, p.lat, p.lng, p.city, p.state]
      );
    }
    console.log("✅ Seeded 3 reference pincodes.");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

seedPincodes();
