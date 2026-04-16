import 'dotenv/config';
import { pool } from './db.js';

async function checkNullCoords() {
  const result = await pool.query(`
    SELECT id, name, latitude, longitude, location_accuracy
    FROM clients 
    WHERE latitude IS NULL OR longitude IS NULL
    ORDER BY name
  `);

  console.log('=== CLIENTS WITH NULL COORDINATES ===');
  console.log('Count:', result.rows.length);
  console.log('');
  result.rows.forEach((c, i) => {
    console.log(`${i+1}. ${c.name}`);
    console.log(`   latitude: ${c.latitude}, longitude: ${c.longitude}, accuracy: ${c.location_accuracy}`);
  });
}

checkNullCoords().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });