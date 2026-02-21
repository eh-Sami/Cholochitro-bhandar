const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkEpisodes() {
    try {
        console.log('Checking episodes in database...\n');
        
        // Check total episodes
        const totalResult = await pool.query('SELECT COUNT(*) FROM Episode');
        console.log('Total episodes in database:', totalResult.rows[0].count);
        
        // Check a sample TV series
        const tvResult = await pool.query('SELECT MediaID, Title FROM Media WHERE MediaID IN (SELECT MediaID FROM TVSeries) LIMIT 1');
        if (tvResult.rows.length > 0) {
            const tvShow = tvResult.rows[0];
            console.log('\nSample TV Show:', tvShow.title, '(ID:', tvShow.mediaid + ')');
            
            // Check episodes for this show
            const episodesResult = await pool.query(
                'SELECT * FROM Episode WHERE MediaID = $1 ORDER BY SeasonNo, EpisodeNo LIMIT 5',
                [tvShow.mediaid]
            );
            console.log('Episodes for this show:', episodesResult.rows.length);
            console.log('\nSample episodes:');
            episodesResult.rows.forEach(ep => {
                console.log(`  S${ep.seasonno}E${ep.episodeno}: ${ep.episodetitle} (${ep.duration} min, Rating: ${ep.avgrating})`);
            });
        }
        
        // Check if Episode table has any data at all
        const sampleEpisodes = await pool.query('SELECT * FROM Episode LIMIT 3');
        console.log('\n\nFirst 3 episodes in entire database:');
        console.log(sampleEpisodes.rows);
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkEpisodes();
