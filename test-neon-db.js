const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkData() {
    try {
        console.log('🔍 Checking data in all tables...\n');

        // Check each table
        const tables = ['media', 'movie', 'tvseries', 'person', 'studio', 'genre'];

        for (const table of tables) {
            const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
            console.log(`${table}: ${result.rows[0].count} rows`);
        }

        console.log('\n📊 Checking media table with different case variations:');

        // Try lowercase
        try {
            const result1 = await pool.query('SELECT COUNT(*) FROM media');
            console.log(`✅ "media" (lowercase): ${result1.rows[0].count} rows`);
        } catch (e) {
            console.log(`❌ "media" (lowercase): ${e.message}`);
        }

        // Try capitalized
        try {
            const result2 = await pool.query('SELECT COUNT(*) FROM Media');
            console.log(`✅ "Media" (capitalized): ${result2.rows[0].count} rows`);
        } catch (e) {
            console.log(`❌ "Media" (capitalized): ${e.message}`);
        }

        // Try with quotes
        try {
            const result3 = await pool.query('SELECT COUNT(*) FROM "Media"');
            console.log(`✅ "Media" (quoted): ${result3.rows[0].count} rows`);
        } catch (e) {
            console.log(`❌ "Media" (quoted): ${e.message}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkData();
