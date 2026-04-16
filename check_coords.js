import 'dotenv/config';
import { pool } from './db.js';

async function check() {
  const result = await pool.query(`
    SELECT latitude, longitude 
    FROM clients 
    WHERE latitude IS NOT NULL 
    LIMIT 5
  `);

  console.log('=== SAMPLE COORDINATES ===');
  result.rows.forEach((c, i) => console.log(`${i+1}. ${c.latitude}, ${c.longitude}`));
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });