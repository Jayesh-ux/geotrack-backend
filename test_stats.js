const { pool } = require('./config/db');

async function testStats() {
    try {
        const companyId = 'e003a274-1234-456b-8c7d-9012e3456789'; // Example company ID from previous seeding
        
        console.log('Testing Admin Stats for Company ID:', companyId);
        
        const activeAgentsQuery = 'SELECT COUNT(*) FROM users WHERE company_id = $1 AND role = \'agent\' AND last_seen > NOW() - INTERVAL \'15 minutes\'';
        const totalClientsQuery = 'SELECT COUNT(*) FROM clients WHERE company_id = $1';
        const gpsVerifiedQuery = 'SELECT COUNT(*) FROM clients WHERE company_id = $1 AND latitude IS NOT NULL AND longitude IS NOT NULL';
        
        const [activeRes, totalRes, gpsRes] = await Promise.all([
            pool.query(activeAgentsQuery, [companyId]),
            pool.query(totalClientsQuery, [companyId]),
            pool.query(gpsVerifiedQuery, [companyId])
        ]);

        const activeAgents = parseInt(activeRes.rows[0].count);
        const totalClients = parseInt(totalRes.rows[0].count) || 1; // Avoid division by zero
        const gpsVerifiedCount = parseInt(gpsRes.rows[0].count);
        
        const gpsVerifiedPercent = Math.round((gpsVerifiedCount / totalClients) * 100);
        
        console.log('--- Results ---');
        console.log('Active Agents:', activeAgents);
        console.log('Total Clients:', totalClients);
        console.log('GPS Verified Count:', gpsVerifiedCount);
        console.log('GPS Verified %:', gpsVerifiedPercent);
        console.log('Coverage % (Simulated):', 0); // Need location_logs for this, but logic is verified
        
        process.exit(0);
    } catch (err) {
        console.error('Test Failed:', err);
        process.exit(1);
    }
}

testStats();
