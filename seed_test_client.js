
import pkg from 'bcryptjs';
const bcrypt = pkg;
import { pool } from "./db.js";

async function seedTestClient() {
  const lodhaSupremus = {
    lat: 19.198018,
    lng: 72.947480,
    pincode: "400604"
  };

  // Create a client inside Lodha Supremus Tower 2
  const testClient = {
    name: "Test Client - Lodha Supremus Tower 2",
    address: "611, Tower 2, Lodha Supremus 2, Road No. 22, Wagle Estate, Thane West",
    building: "Lodha Supremus 2 Tower",
    pincode: lodhaSupremus.pincode,
    latitude: lodhaSupremus.lat,
    longitude: lodhaSupremus.lng,
    company_id: '53d8b685-bb58-421d-aa5a-e3a618af7326' // agent@test.com company
  };

  // Create another client very close (20m away)
  const testClient2 = {
    name: "Nearby Client (20m)",
    address: "Entrance of Lodha Supremus Tower 2",
    building: "Lodha Supremus 2 Tower",
    pincode: lodhaSupremus.pincode,
    latitude: lodhaSupremus.lat + 0.00018, // approx 20m north
    longitude: lodhaSupremus.lng + 0.00018, // approx 20m east
    company_id: '53d8b685-bb58-421d-aa5a-e3a618af7326'
  };

  try {
    console.log("Updating agent password to 'password123'...");
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash("password123", salt);
    await pool.query("UPDATE users SET password = $1 WHERE email = $2", [hash, 'agent@test.com']);

    console.log("Cleaning up old test data...");
    await pool.query("DELETE FROM clients WHERE name IN ($1, $2)", [testClient.name, testClient2.name]);

    console.log("Seeding test clients...");
    
    const query = `
      INSERT INTO clients (name, address, building, pincode, latitude, longitude, company_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT DO NOTHING
      RETURNING *;
    `;

    const res1 = await pool.query(query, [testClient.name, testClient.address, testClient.building, testClient.pincode, testClient.latitude, testClient.longitude, testClient.company_id]);
    const res2 = await pool.query(query, [testClient2.name, testClient2.address, testClient2.building, testClient2.pincode, testClient2.latitude, testClient2.longitude, testClient2.company_id]);

    console.log("Successfully seeded clients.");
    if (res1.rows.length > 0) console.log("Added: " + res1.rows[0].name);
    if (res2.rows.length > 0) console.log("Added: " + res2.rows[0].name);

  } catch (err) {
    console.error("Error seeding test clients:", err);
  } finally {
    process.exit();
  }
}

seedTestClient();
