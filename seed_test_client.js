
import pkg from 'bcryptjs';
const bcrypt = pkg;
import { pool } from "./db.js";

async function seedTestClient() {
  const lodhaSupremus = {
    lat: 19.19825,
    lng: 72.94904,
    pincode: "400604"
  };

  // Create a client right at the tower (0m away basically)
  const testClient = {
    name: "Test Client - Lodha Supremus",
    address: "611, Tower 2, Lodha Supremus, Road No. 22, Wagle Estate, Thane West",
    pincode: lodhaSupremus.pincode,
    latitude: lodhaSupremus.lat,
    longitude: lodhaSupremus.lng,
    company_id: '03cc3deb-8f33-43ea-96a7-ab939ac89e28' // Abcd Inc
  };

  // Create another client very close (20m away)
  const testClient2 = {
    name: "Nearby Client (20m)",
    address: "Entrance of Lodha Supremus Tower 2",
    pincode: lodhaSupremus.pincode,
    latitude: lodhaSupremus.lat + 0.00018, // approx 20m north
    longitude: lodhaSupremus.lng + 0.00018, // approx 20m east
    company_id: '03cc3deb-8f33-43ea-96a7-ab939ac89e28'
  };

  try {
    console.log("Updating agent password to 'password123'...");
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash("password123", salt);
    await pool.query("UPDATE users SET password = $1 WHERE email = $2", [hash, 'agent@test.com']);

    console.log("Seeding test clients...");
    
    const query = `
      INSERT INTO clients (name, address, pincode, latitude, longitude, company_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
      RETURNING *;
    `;

    const res1 = await pool.query(query, [testClient.name, testClient.address, testClient.pincode, testClient.latitude, testClient.longitude, testClient.company_id]);
    const res2 = await pool.query(query, [testClient2.name, testClient2.address, testClient2.pincode, testClient2.latitude, testClient2.longitude, testClient2.company_id]);

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
