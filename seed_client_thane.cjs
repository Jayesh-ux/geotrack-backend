const { Pool } = require('pg');

const DATABASE_URL = "postgresql://geotrack_dbtest_user:DpQrv5nopeTKqIUNQB6pQYeCdJgIlOxA@dpg-d7grg6po3t8c7392p2tg-a.oregon-postgres.render.com:5432/geotrack_dbtest";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seedClient() {
  try {
    // 1. Get agent@test.com user details
    const userResult = await pool.query(
      'SELECT id, company_id FROM users WHERE email = $1',
      ['agent@test.com']
    );
    
    if (userResult.rows.length === 0) {
      console.log('User agent@test.com not found');
      return;
    }
    
    const agent = userResult.rows[0];
    console.log('Found agent: ' + agent.id);
    
    // 2. Check table columns
    const colResult = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'clients' ORDER BY ordinal_position"
    );
    const columns = colResult.rows.map(r => r.column_name);
    console.log('Columns: ' + columns.join(', '));
    
    const hasCity = columns.includes('city');
    const hasState = columns.includes('state');
    const hasAddress = columns.includes('address');
    const hasPincode = columns.includes('pincode');
    
    console.log('hasCity: ' + hasCity + ', hasState: ' + hasState + ', hasAddress: ' + hasAddress);
    
    // 3. Check if client already exists
    const existingResult = await pool.query(
      'SELECT id, name FROM clients WHERE company_id = $1 AND ABS(latitude - $2) < 0.001 AND ABS(longitude - $3) < 0.001',
      [agent.company_id, 19.1979441, 72.9475755]
    );
    
    if (existingResult.rows.length > 0) {
      console.log('Client already exists: ' + existingResult.rows[0].name);
      return;
    }
    
    // 4. Build insert query dynamically
    const insertCols = ['id', 'name', 'email', 'phone'];
    const insertVals = ['gen_random_uuid()', '$1', '$2', '$3'];
    const params = ['Test Client Thane', 'testclient.thane@test.com', '9876543210'];
    
    if (hasAddress) {
      insertCols.push('address');
      insertVals.push('$4');
      params.push('Near Station Road, Thane West');
    }
    if (hasCity) {
      insertCols.push('city');
      insertVals.push('$5');
      params.push('Thane');
    }
    if (hasState) {
      insertCols.push('state');
      insertVals.push('$6');
      params.push('Maharashtra');
    }
    if (hasPincode) {
      insertCols.push('pincode');
      insertVals.push('$7');
      params.push('400604');
    }
    
    insertCols.push('latitude', 'longitude', 'company_id', 'created_at', 'updated_at');
    insertVals.push('$8', '$9', '$10', 'NOW()', 'NOW()');
    params.push(19.1979441, 72.9475755, agent.company_id);
    
    const query = 'INSERT INTO clients (' + insertCols.join(', ') + ') VALUES (' + insertVals.join(', ') + ') RETURNING id, name';
    
    console.log('Insert query: ' + query);
    console.log('Params: ' + JSON.stringify(params));
    
    const clientResult = await pool.query(query, params);
    const client = clientResult.rows[0];
    console.log('Client created: ' + client.name + ' (' + client.id + ')');
    
    // 5. Tag client to agent
    await pool.query(
      'INSERT INTO client_users (id, client_id, user_id, company_id, created_at) VALUES (gen_random_uuid(), $1, $2, $3, NOW()) ON CONFLICT DO NOTHING',
      [client.id, agent.id, agent.company_id]
    );
    
    console.log('Client tagged to agent@test.com');
    console.log('Location: Lat 19.1979441, Lng 72.9475755 (Thane, Maharashtra)');
    console.log('Pincode: 400604');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

seedClient();
