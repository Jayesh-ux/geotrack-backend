import pool from './db.js';
import bcrypt from 'bcryptjs';

async function createAgent() {
    const client = await pool.connect();
    try {
        // Hash password properly
        const hashedPassword = await bcrypt.hash('agent123', 10);
        
        // Get Lodha company ID
        const company = await client.query(
            "SELECT id FROM companies WHERE name ILIKE '%lodha%' LIMIT 1"
        );
        
        if (company.rows.length === 0) {
            console.log('Lodha company not found!');
            return;
        }
        
        const companyId = company.rows[0].id;
        
        // Delete existing if any
        await client.query("DELETE FROM users WHERE email = $1", ['agent2@test.com']);
        
        // Create new agent with hashed password
        const result = await client.query(
            `INSERT INTO users (email, password, company_id, is_active, is_admin, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             RETURNING id, email`,
            ['agent2@test.com', hashedPassword, companyId, true, false]
        );
        
        console.log('✅ Created agent with hashed password:', result.rows[0]);
        
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

createAgent();