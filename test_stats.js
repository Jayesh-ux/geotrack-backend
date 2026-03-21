import pool from './db.js';

async function testStats() {
    try {
        const statsQuery = await pool.query(`
          SELECT
            (SELECT COUNT(*) FROM users WHERE is_admin = false ) as total_agents,
            (SELECT COUNT(*) FROM users WHERE is_admin = false AND last_seen > NOW() - INTERVAL '15 minutes' ) as active_agents,
            (SELECT COUNT(*) FROM clients WHERE 1=1 ) as total_clients,
            (SELECT COUNT(*) FROM clients WHERE latitude IS NOT NULL AND longitude IS NOT NULL ) as gps_verified,
            (SELECT COUNT(DISTINCT client_id) FROM meetings WHERE 1=1 ) as visited_clients
        `);

        console.log('--- Results ---');
        console.log(statsQuery.rows[0]);
        
        process.exit(0);
    } catch (err) {
        console.error('Test Failed:', err);
        process.exit(1);
    }
}

testStats();
