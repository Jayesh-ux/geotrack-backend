import pool from './db.js';

async function checkSchema() {
    const result = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position
    `);
    console.log('--- users table columns ---');
    result.rows.forEach(r => console.log(r.column_name, '-', r.data_type));
    
    const agentSample = await pool.query(`SELECT id, email, is_admin, is_super_admin FROM users LIMIT 3`);
    console.log('\n--- Sample users ---');
    console.log(agentSample.rows);
    
    process.exit(0);
}

checkSchema();
