const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.get('/check-schema', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'location_logs' 
      ORDER BY ordinal_position
    `);
    
    const hasImageUrls = result.rows.some(r => r.column_name === 'image_urls');
    
    res.json({
      success: true,
      columns: result.rows,
      hasImageUrls,
      fix: hasImageUrls ? null : "ALTER TABLE location_logs ADD COLUMN image_urls JSONB DEFAULT '[]'::jsonb;"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
