const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function diagnoseEpisodes() {
    try {
        const mediaId = 1396; // Breaking Bad
        
        // Step 1: Check raw episodes in DB
        const episodesResult = await pool.query(
            `SELECT SeasonNo, EpisodeNo, EpisodeTitle, Duration, AvgRating FROM Episode WHERE MediaID = $1 ORDER BY SeasonNo, EpisodeNo LIMIT 3`,
            [mediaId]
        );
        console.log('✅ Raw episodes from DB:', episodesResult.rows.length, 'total');
        console.log(episodesResult.rows);
        
        // Step 2: Check seasons in DB
        const seasonsResult = await pool.query(
            `SELECT SeasonNo, SeasonTitle, EpisodeCount FROM Season WHERE MediaID = $1 ORDER BY SeasonNo`,
            [mediaId]
        );
        console.log('\n✅ Seasons from DB:', seasonsResult.rows.length);
        console.log(seasonsResult.rows);
        
        // Step 3: Test the filter logic
        console.log('\n✅ Testing filter logic:');
        seasonsResult.rows.forEach(season => {
            const filtered = episodesResult.rows.filter(ep => ep.seasonno === season.seasonno);
            console.log(`  Season ${season.seasonno}: ${filtered.length} episodes`);
        });
        
        // Step 4: Call the actual API
        console.log('\n✅ Testing actual API endpoint:');
        const response = await fetch('http://localhost:3000/tvshows/1396');
        const data = await response.json();
        console.log('API Response seasons with episodes:');
        data.data.seasons.forEach(s => {
            console.log(`  Season ${s.seasonno}: ${s.episodes?.length || 0} episodes`);
        });
        
        // Step 5: Check first season's episodes in detail
        if (data.data.seasons[0].episodes && data.data.seasons[0].episodes.length > 0) {
            console.log('\n✅ First episode object:', data.data.seasons[0].episodes[0]);
        } else {
            console.log('\n❌ NO EPISODES IN FIRST SEASON!');
            console.log('First season object:', JSON.stringify(data.data.seasons[0], null, 2));
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

diagnoseEpisodes();
