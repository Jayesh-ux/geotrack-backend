import 'dotenv/config';
import { pool } from './db.js';

async function check() {
  const result = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE location_accuracy = 'approximate') as approximate,
      COUNT(*) FILTER (WHERE location_accuracy = 'geocoded') as geocoded,
      COUNT(*) FILTER (WHERE location_accuracy = 'exact') as exact
    FROM clients
  `);

  console.log('=== LOCATION_ACCURACY BREAKDOWN ===');
  console.log('Approximate:', result.rows[0].approximate);
  console.log('Geocoded:', result.rows[0].geocoded);
  console.log('Exact:', result.rows[0].exact);
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });