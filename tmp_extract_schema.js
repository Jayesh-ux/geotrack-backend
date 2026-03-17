
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import { writeFileSync } from 'fs';
dotenv.config();

const config = {
    user: process.env.DB_USER || "postgres",
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "client_tracking_app",
    password: process.env.DB_PASSWORD || "root",
    port: parseInt(process.env.DB_PORT) || 5432,
};

async function extractSchema() {
    const client = new Client(config);
    let fullSql = "-- Full Schema Migration\n\n";

    try {
        await client.connect();
        console.log("🏠 Connected to Local DB");

        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            AND table_name NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns')
        `);

        for (const row of tables.rows) {
            const tableName = row.table_name;
            console.log(`🛠️ Extracting: ${tableName}...`);

            const columns = await client.query(`
                SELECT column_name, data_type, is_nullable, column_default, character_maximum_length, udt_name
                FROM information_schema.columns
                WHERE table_name = $1 AND table_schema = 'public'
                ORDER BY ordinal_position
            `, [tableName]);

            fullSql += `CREATE TABLE IF NOT EXISTS "${tableName}" (\n`;

            const colDefs = columns.rows.map(col => {
                let type = col.data_type;
                let defaultVal = col.column_default;

                if (type === 'ARRAY') {
                    type = col.udt_name.substring(1).toUpperCase() + '[]';
                }

                if (type === 'timestamp without time zone') type = 'TIMESTAMP';
                if (type === 'timestamp with time zone') type = 'TIMESTAMPTZ';
                if (type === 'character varying') type = `VARCHAR${col.character_maximum_length ? '(' + col.character_maximum_length + ')' : ''}`;

                let isSerial = false;
                if (defaultVal && defaultVal.includes('nextval')) {
                    isSerial = true;
                    type = (type.toLowerCase() === 'bigint') ? 'BIGSERIAL' : 'SERIAL';
                    defaultVal = null;
                }

                let def = `  "${col.column_name}" ${type}`;
                if (col.is_nullable === 'NO' && !isSerial) def += " NOT NULL";
                if (defaultVal) {
                    const cleanDefault = defaultVal.split('::')[0];
                    def += ` DEFAULT ${cleanDefault}`;
                }
                return def;
            });

            fullSql += colDefs.join(",\n");
            fullSql += "\n);\n\n";
        }

        writeFileSync('migrations/000_full_schema.sql', fullSql);
        console.log("✅ Schema extracted to migrations/000_full_schema.sql");

    } catch (err) {
        console.error("💥 Error during extraction:", err);
    } finally {
        await client.end();
    }
}

extractSchema();
