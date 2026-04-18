import pool from './db.js';

async function checkSchema() {
    const client = await pool.connect();
    try {
        // Check location_logs columns
        const cols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'location_logs'
            ORDER BY ordinal_position
        `);
        console.log('=== location_logs columns ===');
        cols.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));
        
        // Check meetings columns
        const meetingCols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'meetings'
            ORDER BY ordinal_position
        `);
        console.log('\n=== meetings columns ===');
        meetingCols.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));
        
        // Check trip_expenses columns
        const expenseCols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'trip_expenses'
            ORDER BY ordinal_position
        `);
        console.log('\n=== trip_expenses columns ===');
        expenseCols.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));
        
    } finally {
        client.release();
        await pool.end();
    }
}

checkSchema();