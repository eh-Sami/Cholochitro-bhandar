const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
// Database connection
// Neon DB uses a connection string format
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? {
        rejectUnauthorized: false
    } : false
});

// Test connection on startup
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Database connection error:', err.message);
    } else {
        console.log('✅ Connected to Neon DB successfully');
        release();
    }
});

// GET all movies
app.get('/movies', async (req, res) => {
    const result = await pool.query('SELECT * FROM Media WHERE MediaType = \'Movie\'');
    console.log(result.rows)
    res.json(result.rows);
});

// GET all TV shows
app.get('/tvshows', async (req, res) => {
    const result = await pool.query('SELECT * FROM Media WHERE MediaType = \'TVSeries\'');
    console.log(result.rows)
    res.json(result.rows);
});

app.listen(3000, () => console.log('Server running at http://localhost:3000'));
