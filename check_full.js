import 'dotenv/config';
import { pool } from './db.js';

async function check() {
  const result = await pool.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL) as has_coords,
      COUNT(*) FILTER (WHERE latitude IS NULL OR longitude IS NULL) as no_coords,
      COUNT(*) FILTER (WHERE location_accuracy = 'exact') as exact_accuracy,
      COUNT(*) FILTER (WHERE location_accuracy = 'geocoded') as geocoded_accuracy,
      COUNT(*) FILTER (WHERE location_accuracy = 'approximate') as approx_accuracy
    FROM clients
  `);

  console.log('=== FULL BREAKDOWN ===');
  console.log('Total clients:', result.rows[0].total);
  console.log('');
  console.log('By Coordinates:');
  console.log('  - Has coordinates:', result.rows[0].has_coords);
  console.log('  - No coordinates:', result.rows[0].no_coords);
  console.log('');
  console.log('By Accuracy:');
  console.log('  - Exact:', result.rows[0].exact_accuracy);
  console.log('  - Geocoded:', result.rows[0].geocoded_accuracy);
  console.log('  - Approximate:', result.rows[0].approx_accuracy);
  console.log('');
  console.log('=== PENDING MANUAL PINNING (35 clients) ===');
  
  const pending = await pool.query(`
    SELECT name, address, pincode
    FROM clients 
    WHERE latitude IS NULL OR longitude IS NULL
    ORDER BY name
  `);
  
  pending.rows.forEach((c, i) => console.log(`${i+1}. ${c.name} - ${c.address || 'no address'}`));
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });