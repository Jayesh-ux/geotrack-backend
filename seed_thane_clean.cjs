const { Pool } = require('pg');

const DATABASE_URL = "postgresql://geotrack_dbtest_user:DpQrv5nopeTKqIUNQB6pQYeCdJgIlOxA@dpg-d7grg6po3t8c7392p2tg-a.oregon-postgres.render.com:5432/geotrack_dbtest";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seedClient() {
  try {
    // Get agent
    const userResult = await pool.query(
      "SELECT id, company_id FROM users WHERE email = 'agent@test.com'"
    );
    
    if (userResult.rows.length === 0) {
      console.log('User agent@test.com not found');
      return;
    }
    
    const agent = userResult.rows[0];
    console.log('Found agent:', agent.id.substring(0,8) + '...');
    console.log('Company:', agent.company_id.substring(0,8) + '...');
    
    // Check existing
    const existingResult = await pool.query(
      "SELECT id, name FROM clients WHERE company_id = $1 AND ABS(latitude - 19.1979441) < 0.001 AND ABS(longitude - 72.9475755) < 0.001",
      [agent.company_id]
    );
    
    if (existingResult.rows.length > 0) {
      console.log('Client already exists:', existingResult.rows[0].name);
      return;
    }
    
    // Insert client (simple - no parameterized pincode)
    const clientResult = await pool.query(`
      INSERT INTO clients (id, name, email, phone, address, pincode, latitude, longitude, company_id, created_at, updated_at)
      VALUES (gen_random_uuid(), 'Test Client Thane', 'testclient.thane@test.com', '9876543210', 
              'Near Station Road, Thane West', '400604', 19.1979441, 72.9475755, $1, NOW(), NOW())
      RETURNING id, name
    `, [agent.company_id]);
    
    const client = clientResult.rows[0];
    console.log('Client created:', client.name, '(' + client.id.substring(0,8) + '...)');
    
    // Tag to agent (using client_users table - let me check the actual table name)
    const tablesResult = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE '%client%'
      ORDER BY table_name
    `);
    
    console.log('Client-related tables:');
    tablesResult.rows.forEach(t => console.log(' -', t.table_name));
    
    await pool.end();
    console.log('\nDone!');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

seedClient();
