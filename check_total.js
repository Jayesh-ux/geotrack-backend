import 'dotenv/config';
import { pool } from './db.js';

async function check() {
  const result = await pool.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL) as with_coords,
      COUNT(*) FILTER (WHERE latitude IS NULL OR longitude IS NULL) as without_coords
    FROM clients
  `);

  console.log('=== OVERALL CLIENT COUNT ===');
  console.log('Total clients:', result.rows[0].total);
  console.log('With coordinates:', result.rows[0].with_coords);
  console.log('Without coordinates:', result.rows[0].without_coords);
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });