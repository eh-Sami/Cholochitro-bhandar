require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Initialize Neon database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// The absolute execution order matters!
const plpgsqlFiles = [
    '01_rating_functions.sql',
    '02_vote_function.sql',
    '04_procedures.sql',
    '05_utilities.sql',
    '06_profanity_filter.sql',
    '03_triggers.sql' // Must be last
];

async function applyMigrations() {
    console.log('════════════════════════════════════════');
    console.log('🚀 Starting PL/pgSQL Migration Script');
    console.log('════════════════════════════════════════\n');

    const client = await pool.connect();

    try {
        for (const filename of plpgsqlFiles) {
            const filePath = path.join(__dirname, 'plpgsql', filename);
            process.stdout.write(`Executing ${filename} ... `);

            // Read the SQL file
            const sqlQuery = fs.readFileSync(filePath, 'utf8');

            // Execute the queries
            await client.query(sqlQuery);
            
            console.log('✅ Success');
        }
        
        console.log('\n🎉 All PL/pgSQL scripts executed successfully!');

    } catch (error) {
        console.log('❌ FAILED');
        console.error('\nError Details:');
        console.error(error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

applyMigrations();
