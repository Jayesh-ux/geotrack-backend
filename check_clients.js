import 'dotenv/config';
import { pool } from './db.js';

async function checkClients() {
  const stats = await pool.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN location_accuracy = 'exact' THEN 1 END) as exact_coords,
      COUNT(CASE WHEN location_accuracy = 'geocoded' THEN 1 END) as geocoded,
      COUNT(CASE WHEN location_accuracy = 'approximate' THEN 1 END) as approximate,
      COUNT(CASE WHEN latitude IS NULL OR longitude IS NULL THEN 1 END) as null_coords
    FROM clients
  `);

  console.log('=== CLIENT LOCATION STATUS ===');
  console.log('Total clients:', stats.rows[0].total);
  console.log('Exact coordinates:', stats.rows[0].exact_coords);
  console.log('Geocoded:', stats.rows[0].geocoded);
  console.log('Approximate (script-fixed):', stats.rows[0].approximate);
  console.log('No coordinates at all:', stats.rows[0].null_coords);
  console.log('');

  const approximate = await pool.query(`
    SELECT id, name, address, latitude, longitude, location_accuracy 
    FROM clients 
    WHERE location_accuracy = 'approximate' 
    ORDER BY name
  `);

  console.log('=== ALL APPROXIMATE LOCATIONS (Script-Fixed) ===');
  approximate.rows.forEach((c, i) => {
    console.log(`${i+1}. ${c.name}`);
    console.log(`   Address: ${c.address || 'N/A'}`);
    console.log(`   Coords: ${c.latitude}, ${c.longitude}`);
    console.log('');
  });

  console.log(`Total: ${approximate.rows.length} clients with approximate locations`);
}

checkClients().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });