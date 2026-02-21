async function testAPI() {
    try {
        console.log('Testing TV show endpoint for Breaking Bad (MediaID: 1396)...\n');
        
        const response = await fetch('http://localhost:3000/tvshows/1396');
        const data = await response.json();
        
        console.log('Response received!\n');
        console.log('Title:', data.data.title);
        console.log('Number of seasons:', data.data.seasons?.length || 0);
        
        if (data.data.seasons && data.data.seasons.length > 0) {
            console.log('\nSeasons:');
            data.data.seasons.forEach(season => {
                console.log(`  Season ${season.seasonno}: ${season.episodecount || 0} episodes (from episodecount field)`);
                console.log(`    Episodes array length: ${season.episodes?.length || 0}`);
                if (season.episodes && season.episodes.length > 0) {
                    console.log(`    First episode:`, season.episodes[0]);
                }
            });
        }
        
        console.log('\n\nFull response data:');
        console.log(JSON.stringify(data.data.seasons, null, 2));
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testAPI();
