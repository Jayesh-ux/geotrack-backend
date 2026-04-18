// fix_missing_columns.js
import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

const pool = new Pool(
    connectionString
        ? {
            connectionString: connectionString,
            ssl: { rejectUnauthorized: false }
        }
        : {
            user: process.env.DB_USER || "postgres",
            host: process.env.DB_HOST || "localhost",
            database: process.env.DB_NAME || "client_tracking_app",
            password: process.env.DB_PASSWORD || "root",
            port: parseInt(process.env.DB_PORT) || 5432,
        }
);

async function fixColumns() {
    console.log("==============================================");
    console.log("🔧 FIXING MISSING COLUMNS");
    console.log("==============================================\n");

    const columnsToAdd = [
        { table: 'clients', column: 'location_source', definition: 'VARCHAR(50) DEFAULT NULL' },
        { table: 'clients', column: 'location_accuracy', definition: 'VARCHAR(20) DEFAULT NULL' },
        { table: 'clients', column: 'building_name', definition: 'VARCHAR(255) DEFAULT NULL' },
        { table: 'user_bank_accounts', column: 'id', definition: 'uuid NOT NULL DEFAULT gen_random_uuid()' },
        { table: 'user_bank_accounts', column: 'user_id', definition: 'uuid NOT NULL' },
        { table: 'user_bank_accounts', column: 'account_number', definition: 'VARCHAR(50)' },
        { table: 'user_bank_accounts', column: 'ifsc_code', definition: 'VARCHAR(20)' },
        { table: 'user_bank_accounts', column: 'account_holder_name', definition: 'VARCHAR(200)' },
        { table: 'user_bank_accounts', column: 'bank_name', definition: 'VARCHAR(200)' },
        { table: 'user_bank_accounts', column: 'upi_id', definition: 'VARCHAR(100)' },
        { table: 'user_bank_accounts', column: 'is_verified', definition: 'boolean DEFAULT false' },
        { table: 'user_bank_accounts', column: 'created_at', definition: 'TIMESTAMP DEFAULT now()' },
        { table: 'user_bank_accounts', column: 'updated_at', definition: 'TIMESTAMP DEFAULT now()' },
    ];

    for (const col of columnsToAdd) {
        try {
            await pool.query(`
                ALTER TABLE "${col.table}" ADD COLUMN IF NOT EXISTS ${col.column} ${col.definition}
            `);
            console.log(`✅ Added: ${col.table}.${col.column}`);
        } catch (err) {
            if (err.code === "42701") {
                console.log(`⚠️  Already exists: ${col.table}.${col.column}`);
            } else if (err.code === "42P01") {
                console.log(`⚠️  Table not found: ${col.table}`);
            } else {
                console.log(`❌ Error adding ${col.table}.${col.column}: ${err.message}`);
            }
        }
    }

    console.log("\n==============================================");
    console.log("✅ COLUMN FIXES COMPLETE");
    console.log("==============================================");

    await pool.end();
}

fixColumns();
