const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

// Database connection
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'imdb',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
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
