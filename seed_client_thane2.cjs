const { Pool } = require('pg');

const DATABASE_URL = "postgresql://geotrack_dbtest_user:DpQrv5nopeTKqIUNQB6pQYeCdJgIlOxA@dpg-d7grg6po3t8c7392p2tg-a.oregon-postgres.render.com:5432/geotrack_dbtest";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seedClient() {
  try {
    // 1. Get agent@test.com
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
    
    // 2. Check if client already exists
    const existingResult = await pool.query(
      "SELECT id, name FROM clients WHERE company_id = $1 AND ABS(latitude - 19.1979441) < 0.001 AND ABS(longitude - 72.9475755) < 0.001",
      [agent.company_id]
    );
    
    if (existingResult.rows.length > 0) {
      console.log('Client already exists:', existingResult.rows[0].name);
      return;
    }
    
    // 3. Insert client (use string interpolation for simplicity)
    const insertQuery = `
      INSERT INTO clients (
        id, name, email, phone, address, pincode, 
        latitude, longitude, company_id, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), 
        'Test Client Thane',
        'testclient.thane@test.com',
        '9876543210',
        'Near Station Road, Thane West',
        '400604',
        19.1979441,
        72.9475755,
        '${agent.company_id}',
        NOW(),
        NOW()
      ) RETURNING id, name
    `;
    
    const clientResult = await pool.query(insertQuery);
    const client = clientResult.rows[0];
    console.log('Client created:', client.name, '(' + client.id.substring(0,8) + '...)');
    
    // 4. Tag client to agent
    await pool.query(`
      INSERT INTO client_users (id, client_id, user_id, company_id, created_at)
      VALUES (gen_random_uuid(), '$1', '$2', '$3', NOW())
      ON CONFLICT DO NOTHING
    `, [client.id, agent.id, agent.company_id]);
    
    console.log('Client tagged to agent@test.com');
    console.log('\nLocation: Lat 19.1979441, Lng 72.9475755 (Thane, Maharashtra)');
    console.log('Pincode: 400604');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

seedClient();
