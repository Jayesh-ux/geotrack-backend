import pool from './db.js';

async function checkCompanies() {
    const client = await pool.connect();
    
    try {
        // Get all companies
        const companies = await client.query('SELECT id, name, subdomain FROM companies ORDER BY name');
        console.log('=== All Companies ===');
        companies.rows.forEach(c => {
            console.log(`  ${c.id}: ${c.name} (${c.subdomain})`);
        });
        
        console.log('\n=== Finding Lodha ===');
        const lodha = await client.query("SELECT id, name, subdomain FROM companies WHERE name ILIKE '%lodha%'");
        if (lodha.rows.length > 0) {
            console.log('Found Lodha:', lodha.rows);
        } else {
            console.log('No company with "lodha" in name');
        }
        
        // Get all users with their company
        console.log('\n=== All Users ===');
        const users = await client.query(`
            SELECT u.id, u.email, u.company_id, c.name as company_name 
            FROM users u 
            LEFT JOIN companies c ON u.company_id = c.id
            ORDER BY u.email
        `);
        users.rows.forEach(u => {
            console.log(`  ${u.email}: ${u.company_name || 'NO COMPANY'} (${u.company_id || 'NULL'})`);
        });
        
    } finally {
        client.release();
        await pool.end();
    }
}

checkCompanies();