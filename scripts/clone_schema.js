
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

// PRODUCTION (Render)
const prodUrl = "postgresql://geotrackdb_user:gDBJB8LnmVT6UrIwKwv7uI13LH9BPMGp@dpg-d4rqmoc9c44c738du6dg-a.singapore-postgres.render.com/geotrackdb";

// LOCAL
const localConfig = {
    user: process.env.DB_USER || "postgres",
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "client_tracking_app",
    password: process.env.DB_PASSWORD || "root",
    port: parseInt(process.env.DB_PORT) || 5432,
};

async function cloneSchema() {
    const prodClient = new Client({ connectionString: prodUrl, ssl: { rejectUnauthorized: false } });
    const localClient = new Client(localConfig);

    try {
        await prodClient.connect();
        console.log("🔗 Connected to Render (Production)");

        await localClient.connect();
        console.log("🏠 Connected to Local DB");

        // 1. Get all public tables
        const tables = await prodClient.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        `);

        console.log(`📦 Found ${tables.rows.length} tables on Render.`);

        for (const row of tables.rows) {
            const tableName = row.table_name;
            if (tableName === 'spatial_ref_sys') continue; // Skip PostGIS internal table

            console.log(`🛠️ Cloning table: ${tableName}...`);

            // Get column definitions
            const columns = await prodClient.query(`
                SELECT column_name, data_type, is_nullable, column_default, character_maximum_length, udt_name
                FROM information_schema.columns
                WHERE table_name = $1 AND table_schema = 'public'
                ORDER BY ordinal_position
            `, [tableName]);

            let createSql = `DROP TABLE IF EXISTS "${tableName}" CASCADE;\n`;
            createSql += `CREATE TABLE "${tableName}" (\n`;

            const colDefs = columns.rows.map(col => {
                let type = col.data_type;
                let defaultVal = col.column_default;

                // 1. Handle ARRAYS (udt_name like _text -> text[])
                if (type === 'ARRAY') {
                    type = col.udt_name.substring(1).toUpperCase() + '[]';
                }

                // 2. Map long types
                if (type === 'timestamp without time zone') type = 'TIMESTAMP';
                if (type === 'timestamp with time zone') type = 'TIMESTAMPTZ';
                if (type === 'character varying') type = `VARCHAR${col.character_maximum_length ? '(' + col.character_maximum_length + ')' : ''}`;

                // 3. Handle SERIAL types (nextval in default)
                let isSerial = false;
                if (defaultVal && defaultVal.includes('nextval')) {
                    isSerial = true;
                    if (type.toLowerCase() === 'bigint') {
                        type = 'BIGSERIAL';
                    } else {
                        type = 'SERIAL';
                    }
                    defaultVal = null; // Don't include explicit default
                }

                let def = `  "${col.column_name}" ${type}`;

                if (col.is_nullable === 'NO' && !isSerial) def += " NOT NULL";

                if (defaultVal) {
                    // Strip the ::type cast if present for simpler local execution
                    const cleanDefault = defaultVal.split('::')[0];
                    def += ` DEFAULT ${cleanDefault}`;
                }

                return def;
            });

            createSql += colDefs.join(",\n");
            createSql += "\n);";

            try {
                await localClient.query(createSql);
                console.log(`✅ Table "${tableName}" created locally.`);
            } catch (err) {
                console.error(`❌ Failed to create table "${tableName}":`, err.message);
                // If it fails because of missing sequence, we might need a more complex dump,
                // but usually CREATE TABLE IF NOT EXISTS with SERIAL is easier.
            }
        }

        console.log("\n🚀 Migration of base tables complete.");
        console.log("💡 You should now run 'node migrate.js' to add PostGIS extensions and pincodes.");

    } catch (err) {
        console.error("💥 Error during cloning:", err);
    } finally {
        await prodClient.end();
        await localClient.end();
    }
}

cloneSchema();
