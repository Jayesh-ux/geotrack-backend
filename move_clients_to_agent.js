
import { pool } from "./db.js";

async function moveClientsToAgent() {
  try {
    // 1. Get agent's last location
    const agentRes = await pool.query(`
      SELECT latitude, longitude 
      FROM location_logs 
      WHERE user_id = (SELECT id FROM users WHERE email = 'agent@test.com')
      ORDER BY timestamp DESC 
      LIMIT 1
    `);

    if (agentRes.rows.length === 0) {
      console.log("No location logs found for agent@test.com");
      return;
    }

    const { latitude, longitude } = agentRes.rows[0];
    console.log(`Moving all clients to agent location: ${latitude}, ${longitude}`);

    // 2. Update all clients to this location
    const updateRes = await pool.query(`
      UPDATE clients 
      SET latitude = $1, longitude = $2
      RETURNING name, latitude, longitude
    `, [latitude, longitude]);

    console.log(`Updated ${updateRes.rows.length} clients.`);
    console.table(updateRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

moveClientsToAgent();
