const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ══════════════════════════════════════════════
// MIDDLEWARE
// ══════════════════════════════════════════════

// Enable CORS - allows frontend to connect from different port/domain
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Log incoming requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// ══════════════════════════════════════════════
// DATABASE CONNECTION
// ══════════════════════════════════════════════
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

// ══════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════

// Home route - API info
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Cholochitro Bhandar API',
        version: '1.0.0',
        endpoints: {
            movies: '/movies - Get all movies (paginated)',
            movieById: '/movies/:id - Get single movie details',
            tvshows: '/tvshows - Get all TV shows (paginated)',
            tvshowById: '/tvshows/:id - Get single TV show details',
            search: '/search?q=query - Search movies and TV shows'
        }
    });
});

// GET all movies
app.get('/movies', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const genre = req.query.genre;
        const year = req.query.year;
        const minRating = req.query.minRating;
        const period = req.query.period;
        const sort = req.query.sort || 'rating';

        const currentYear = new Date().getFullYear();

        let query = `
            SELECT m.*
            FROM Media m
            LEFT JOIN Media_Genre mg ON m.MediaID = mg.MediaID
            LEFT JOIN Genre g ON mg.GenreID = g.GenreID
            WHERE m.MediaType = 'Movie'
        `;

        let countQuery = `
            SELECT COUNT(DISTINCT m.MediaID) as total
            FROM Media m
            LEFT JOIN Media_Genre mg ON m.MediaID = mg.MediaID
            LEFT JOIN Genre g ON mg.GenreID = g.GenreID
            WHERE m.MediaType = 'Movie'
        `;

        const conditions = [];
        const params = [];
        const countParams = [];

        if (genre) {
            conditions.push(`g.GenreName = $${params.length + 1}`);
            params.push(genre);
            countParams.push(genre);
        }

        if (year) {
            conditions.push(`m.ReleaseYear = $${params.length + 1}`);
            params.push(parseInt(year));
            countParams.push(parseInt(year));
        }

        if (period === 'year') {
            conditions.push(`m.ReleaseYear = $${params.length + 1}`);
            params.push(currentYear);
            countParams.push(currentYear);
        }

        if (minRating) {
            conditions.push(`m.Rating >= $${params.length + 1}`);
            params.push(parseFloat(minRating));
            countParams.push(parseFloat(minRating));
        }

        if (conditions.length > 0) {
            const wherePart = conditions.join(' AND ');
            query += ` AND ${wherePart}`;
            countQuery += ` AND ${wherePart}`;
        }

        query += ' GROUP BY m.MediaID';

        if (sort === 'year') {
            query += ' ORDER BY m.ReleaseYear DESC NULLS LAST, m.Rating DESC NULLS LAST';
        } else if (sort === 'title') {
            query += ' ORDER BY m.Title ASC';
        } else {
            query += ' ORDER BY m.Rating DESC NULLS LAST, m.ReleaseYear DESC NULLS LAST';
        }

        query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const [result, countResult] = await Promise.all([
            pool.query(query, params),
            pool.query(countQuery, countParams)
        ]);

        const total = parseInt(countResult.rows[0].total);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                page: page,
                limit: limit,
                total: total,
                pages: Math.ceil(total / limit)  // Total pages needed
            }
        });
    } catch (error) {
        console.error('Error fetching movies:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch movies'
        });
    }
});

// GET single movie by ID with full details
app.get('/movies/:id', async (req, res) => {
    try {
        const { id } = req.params; // Get the ID from URL

        // 1. Get basic movie info
        const movieQuery = `
            SELECT 
                m.MediaID,
                m.Title,
                m.ReleaseYear,
                m.Description,
                m.Rating,
                m.Poster,
                m.LanguageName,
                mv.Duration,
                mv.Budget,
                mv.Revenue,
                mv.TrailerLink
            FROM Media m
            JOIN Movie mv ON m.MediaID = mv.MediaID
            WHERE m.MediaID = $1 AND m.MediaType = 'Movie'
        `;

        // 2. Get genres for this movie
        const genreQuery = `
            SELECT g.GenreID, g.GenreName
            FROM Genre g
            JOIN Media_Genre mg ON g.GenreID = mg.GenreID
            WHERE mg.MediaID = $1
        `;

        // 3. Get cast (actors only)
        const castQuery = `
            SELECT 
                p.PersonID,
                p.FullName,
                p.Picture,
                c.CharacterName
            FROM Person p
            JOIN Crew c ON p.PersonID = c.PersonID
            WHERE c.MediaID = $1 AND c.CrewRole = 'Actor'
            LIMIT 20
        `;

        // 4. Get directors and writers
        const crewQuery = `
            SELECT 
                p.PersonID,
                p.FullName,
                p.Picture,
                c.CrewRole
            FROM Person p
            JOIN Crew c ON p.PersonID = c.PersonID
            WHERE c.MediaID = $1 AND c.CrewRole IN ('Director', 'Writer')
        `;

        // 5. Get studios/production companies
        const studioQuery = `
            SELECT s.StudioID, s.StudioName, s.LogoURL, s.WebsiteURL
            FROM Studio s
            JOIN Production p ON s.StudioID = p.StudioID
            WHERE p.MediaID = $1
        `;

        // Execute all queries in parallel (faster!)
        const [movieResult, genreResult, castResult, crewResult, studioResult] = await Promise.all([
            pool.query(movieQuery, [id]),
            pool.query(genreQuery, [id]),
            pool.query(castQuery, [id]),
            pool.query(crewQuery, [id]),
            pool.query(studioQuery, [id])
        ]);

        // Check if movie exists
        if (movieResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Movie not found'
            });
        }

        // Combine all data into one object
        const movie = movieResult.rows[0];
        movie.genres = genreResult.rows;
        movie.cast = castResult.rows;
        movie.crew = crewResult.rows;
        movie.studios = studioResult.rows;

        res.json({
            success: true,
            data: movie
        });

    } catch (error) {
        console.error('Error fetching movie:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch movie details'
        });
    }
});

// GET all TV shows
app.get('/tvshows', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const genre = req.query.genre;
        const year = req.query.year;
        const minRating = req.query.minRating;
        const sort = req.query.sort || 'rating';
        const ongoing = req.query.ongoing;

        let query = `
            SELECT m.*, tv.IsOngoing, tv.NumberOfSeasons
            FROM Media m
            JOIN TVSeries tv ON m.MediaID = tv.MediaID
            LEFT JOIN Media_Genre mg ON m.MediaID = mg.MediaID
            LEFT JOIN Genre g ON mg.GenreID = g.GenreID
            WHERE m.MediaType = 'TVSeries'
        `;

        let countQuery = `
            SELECT COUNT(DISTINCT m.MediaID) as total
            FROM Media m
            JOIN TVSeries tv ON m.MediaID = tv.MediaID
            LEFT JOIN Media_Genre mg ON m.MediaID = mg.MediaID
            LEFT JOIN Genre g ON mg.GenreID = g.GenreID
            WHERE m.MediaType = 'TVSeries'
        `;

        const conditions = [];
        const params = [];
        const countParams = [];

        if (genre) {
            conditions.push(`g.GenreName = $${params.length + 1}`);
            params.push(genre);
            countParams.push(genre);
        }

        if (year) {
            conditions.push(`m.ReleaseYear = $${params.length + 1}`);
            params.push(parseInt(year));
            countParams.push(parseInt(year));
        }

        if (minRating) {
            conditions.push(`m.Rating >= $${params.length + 1}`);
            params.push(parseFloat(minRating));
            countParams.push(parseFloat(minRating));
        }

        if (ongoing === 'true' || ongoing === 'false') {
            conditions.push(`tv.IsOngoing = $${params.length + 1}`);
            const ongoingValue = ongoing === 'true';
            params.push(ongoingValue);
            countParams.push(ongoingValue);
        }

        if (conditions.length > 0) {
            const wherePart = conditions.join(' AND ');
            query += ` AND ${wherePart}`;
            countQuery += ` AND ${wherePart}`;
        }

        query += ' GROUP BY m.MediaID, tv.IsOngoing, tv.NumberOfSeasons';

        if (sort === 'year') {
            query += ' ORDER BY m.ReleaseYear DESC NULLS LAST, m.Rating DESC NULLS LAST';
        } else if (sort === 'title') {
            query += ' ORDER BY m.Title ASC';
        } else {
            query += ' ORDER BY m.Rating DESC NULLS LAST, m.ReleaseYear DESC NULLS LAST';
        }

        query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const [result, countResult] = await Promise.all([
            pool.query(query, params),
            pool.query(countQuery, countParams)
        ]);

        const total = parseInt(countResult.rows[0].total);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                page: page,
                limit: limit,
                total: total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching TV shows:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch TV shows'
        });
    }
});

// GET all genres with optional media type filter
app.get('/genres', async (req, res) => {
    try {
        const type = req.query.type;
        const params = [];

        let query = `
            SELECT
                g.GenreID,
                g.GenreName,
                COUNT(DISTINCT m.MediaID) as title_count
            FROM Genre g
            JOIN Media_Genre mg ON g.GenreID = mg.GenreID
            JOIN Media m ON mg.MediaID = m.MediaID
        `;

        if (type === 'Movie' || type === 'TVSeries') {
            query += ' WHERE m.MediaType = $1';
            params.push(type);
        }

        query += `
            GROUP BY g.GenreID, g.GenreName
            ORDER BY title_count DESC, g.GenreName ASC
        `;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching genres:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch genres'
        });
    }
});

// GET top actors by number of titles
app.get('/actors/top', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const query = `
            SELECT
                p.PersonID,
                p.FullName,
                p.Picture,
                COUNT(DISTINCT c.MediaID) as title_count,
                ROUND(AVG(m.Rating), 1) as avg_rating
            FROM Person p
            JOIN Crew c ON p.PersonID = c.PersonID
            JOIN Media m ON c.MediaID = m.MediaID
            WHERE c.CrewRole = 'Actor'
            GROUP BY p.PersonID, p.FullName, p.Picture
            ORDER BY title_count DESC, avg_rating DESC NULLS LAST
            LIMIT $1
        `;

        const result = await pool.query(query, [limit]);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching top actors:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch top actors'
        });
    }
});

// GET TV show seasons and episodes
app.get('/tvshows/:id/seasons', async (req, res) => {
    try {
        const { id } = req.params;

        const tvQuery = `
            SELECT 
                m.MediaID,
                m.Title,
                m.ReleaseYear,
                m.Description,
                m.Rating,
                m.Poster,
                m.LanguageName,
                tv.IsOngoing,
                tv.NumberOfSeasons
            FROM Media m
            JOIN TVSeries tv ON m.MediaID = tv.MediaID
            WHERE m.MediaID = $1 AND m.MediaType = 'TVSeries'
        `;

        const seasonsQuery = `
            SELECT 
                SeasonNo,
                SeasonTitle,
                ReleaseDate,
                Description,
                AvgRating,
                TrailerLink,
                EpisodeCount
            FROM Season
            WHERE MediaID = $1
            ORDER BY SeasonNo
        `;

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

        const [tvResult, seasonsResult, episodesResult] = await Promise.all([
            pool.query(tvQuery, [id]),
            pool.query(seasonsQuery, [id]),
            pool.query(episodesQuery, [id])
        ]);

        if (tvResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'TV show not found'
            });
        }

        const tvShow = tvResult.rows[0];
        tvShow.seasons = seasonsResult.rows.map((season) => ({
            ...season,
            episodes: episodesResult.rows.filter((ep) => ep.seasonno === season.seasonno)
        }));

        res.json({
            success: true,
            data: tvShow
        });
    } catch (error) {
        console.error('Error fetching TV show seasons:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch TV show seasons'
        });
    }
});

// GET single TV show by ID with full details
app.get('/tvshows/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Get basic TV show info
        const tvQuery = `
            SELECT 
                m.MediaID,
                m.Title,
                m.ReleaseYear,
                m.Description,
                m.Rating,
                m.Poster,
                m.LanguageName,
                tv.IsOngoing,
                tv.NumberOfSeasons
            FROM Media m
            JOIN TVSeries tv ON m.MediaID = tv.MediaID
            WHERE m.MediaID = $1 AND m.MediaType = 'TVSeries'
        `;

        // 2. Get genres
        const genreQuery = `
            SELECT g.GenreID, g.GenreName
            FROM Genre g
            JOIN Media_Genre mg ON g.GenreID = mg.GenreID
            WHERE mg.MediaID = $1
        `;

        // 3. Get cast (actors)
        const castQuery = `
            SELECT 
                p.PersonID,
                p.FullName,
                p.Picture,
                c.CharacterName
            FROM Person p
            JOIN Crew c ON p.PersonID = c.PersonID
            WHERE c.MediaID = $1 AND c.CrewRole = 'Actor'
            LIMIT 20
        `;

        // 4. Get crew (directors, writers)
        const crewQuery = `
            SELECT 
                p.PersonID,
                p.FullName,
                p.Picture,
                c.CrewRole
            FROM Person p
            JOIN Crew c ON p.PersonID = c.PersonID
            WHERE c.MediaID = $1 AND c.CrewRole IN ('Director', 'Writer')
        `;

        // 5. Get studios/networks
        const studioQuery = `
            SELECT s.StudioID, s.StudioName, s.LogoURL, s.WebsiteURL
            FROM Studio s
            JOIN Production p ON s.StudioID = p.StudioID
            WHERE p.MediaID = $1
        `;

        // 6. Get seasons summary
        const seasonsQuery = `
            SELECT 
                SeasonNo,
                SeasonTitle,
                ReleaseDate,
                Description,
                AvgRating,
                TrailerLink,
                EpisodeCount
            FROM Season
            WHERE MediaID = $1
            ORDER BY SeasonNo
        `;

        // 7. Get episodes for all seasons
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

        // Execute all queries in parallel
        const [tvResult, genreResult, castResult, crewResult, studioResult, seasonsResult, episodesResult] = 
            await Promise.all([
                pool.query(tvQuery, [id]),
                pool.query(genreQuery, [id]),
                pool.query(castQuery, [id]),
                pool.query(crewQuery, [id]),
                pool.query(studioQuery, [id]),
                pool.query(seasonsQuery, [id]),
                pool.query(episodesQuery, [id])
            ]);

        // Check if TV show exists
        if (tvResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'TV show not found'
            });
        }

        // Combine all data
        const tvShow = tvResult.rows[0];
        tvShow.genres = genreResult.rows;
        tvShow.cast = castResult.rows;
        tvShow.crew = crewResult.rows;
        tvShow.studios = studioResult.rows;
        
        // Attach episodes to each season  
        tvShow.seasons = seasonsResult.rows.map((season) => ({
            ...season,
            episodes: episodesResult.rows.filter(ep => ep.seasonno === season.seasonno)
        }));

        res.json({
            success: true,
            data: tvShow
        });

    } catch (error) {
        console.error('Error fetching TV show:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch TV show details'
        });
    }
});

// GET search persons - Search for actors, directors, and crew
app.get('/persons/search', async (req, res) => {
    try {
        // Get search query from URL
        const query = req.query.q;

        // Validate search query exists
        if (!query || query.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Search query (q) is required'
            });
        }

        // Get pagination params
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        // Search persons by name and count their filmography
        const searchQuery = `
            SELECT 
                p.PersonID,
                p.FullName,
                p.Picture,
                p.Biography,
                COUNT(DISTINCT c.MediaID) as title_count
            FROM Person p
            LEFT JOIN Crew c ON p.PersonID = c.PersonID
            WHERE p.FullName ILIKE $1
            GROUP BY p.PersonID, p.FullName, p.Picture, p.Biography
            ORDER BY p.FullName ASC
            LIMIT $2 OFFSET $3
        `;

        // Count total results
        const countQuery = `
            SELECT COUNT(DISTINCT p.PersonID) as total
            FROM Person p
            WHERE p.FullName ILIKE $1
        `;

        const searchPattern = `%${query}%`;  // Add wildcards for partial matching
        
        const [result, countResult] = await Promise.all([
            pool.query(searchQuery, [searchPattern, limit, offset]),
            pool.query(countQuery, [searchPattern])
        ]);

        const total = parseInt(countResult.rows[0].total);

        res.json({
            success: true,
            query: query,
            data: result.rows,
            pagination: {
                page: page,
                limit: limit,
                total: total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error searching persons:', error);
        res.status(500).json({
            success: false,
            error: 'Person search failed'
        });
    }
});

// GET person details by ID
app.get('/persons/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT
                PersonID,
                FullName,
                Picture,
                Biography,
                Nationality,
                DateOfBirth
            FROM Person
            WHERE PersonID = $1
        `;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Person not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching person:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch person'
        });
    }
});

// GET person filmography
app.get('/persons/:id/filmography', async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT
                m.MediaID,
                m.Title,
                m.ReleaseYear,
                m.Rating,
                m.Poster,
                m.MediaType,
                c.CrewRole,
                c.CharacterName
            FROM Media m
            JOIN Crew c ON m.MediaID = c.MediaID
            WHERE c.PersonID = $1
            ORDER BY m.ReleaseYear DESC NULLS LAST, m.Title
        `;

        const result = await pool.query(query, [id]);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching filmography:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch filmography'
        });
    }
});

// GET search - Search across movies and TV shows
app.get('/search', async (req, res) => {
    try {
        // Get search query from URL
        const query = req.query.q;

        // Validate search query exists
        if (!query || query.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Search query (q) is required'
            });
        }

        // Get pagination params
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        // Search in title and description
        // ILIKE = case-insensitive search in PostgreSQL
        // %query% = matches anywhere in the text
        const searchQuery = `
            SELECT 
                MediaID,
                Title,
                ReleaseYear,
                Description,
                Rating,
                Poster,
                MediaType,
                CASE 
                    WHEN Title ILIKE $1 THEN 3          -- Exact match = highest priority
                    WHEN Title ILIKE $2 THEN 2          -- Contains query = medium
                    WHEN Description ILIKE $2 THEN 1    -- In description = lowest
                    ELSE 0
                END as relevance
            FROM Media
            WHERE Title ILIKE $2 OR Description ILIKE $2
            ORDER BY relevance DESC, Rating DESC NULLS LAST
            LIMIT $3 OFFSET $4
        `;

        // Count total results
        const countQuery = `
            SELECT COUNT(*) as total
            FROM Media
            WHERE Title ILIKE $1 OR Description ILIKE $1
        `;

        const searchPattern = `%${query}%`;  // Add wildcards for partial matching
        
        const [result, countResult] = await Promise.all([
            pool.query(searchQuery, [query, searchPattern, limit, offset]),
            pool.query(countQuery, [searchPattern])
        ]);

        const total = parseInt(countResult.rows[0].total);

        res.json({
            success: true,
            query: query,
            data: result.rows,
            pagination: {
                page: page,
                limit: limit,
                total: total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error searching:', error);
        res.status(500).json({
            success: false,
            error: 'Search failed'
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('════════════════════════════════════════');
    console.log('🎬 Cholochitro Bhandar API Server');
    console.log('════════════════════════════════════════');
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log(`📚 Endpoints: http://localhost:${PORT}/`);
    console.log('════════════════════════════════════════');
});
