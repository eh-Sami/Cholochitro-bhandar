const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function testEpisodesQuery() {
    try {
        const mediaId = 1396; // Breaking Bad
        
        console.log(`Testing episodes query for MediaID: ${mediaId}\n`);
        
        const episodesQuery = `
            SELECT 
                SeasonNo,
                EpisodeNo,
                EpisodeTitle,
                Duration,
                AvgRating
            FROM Episode
            WHERE MediaID = $1
            ORDER BY SeasonNo, EpisodeNo
        `;
        
        const result = await pool.query(episodesQuery, [mediaId]);
        
        console.log('Query executed successfully!');
        console.log('Number of episodes found:', result.rows.length);
        console.log('\nFirst 5 episodes:');
        result.rows.slice(0, 5).forEach(ep => {
            console.log(`  S${ep.seasonno}E${ep.episodeno}: ${ep.episodetitle} - ${ep.duration}min, Rating: ${ep.avgrating}`);
        });
        
        console.log('\nRaw first episode object:');
        console.log(result.rows[0]);
        
    } catch (error) {
        console.error('Error:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

testEpisodesQuery();
