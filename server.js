const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

const formatUser = (row) => ({
    userId: row.userid,
    fullName: row.fullname,
    email: row.email,
    dateOfBirth: row.dateofbirth
});

const createAuthToken = (user) => jwt.sign(
    {
        userId: user.userId,
        email: user.email,
        fullName: user.fullName
    },
    JWT_SECRET,
    { expiresIn: '7d' }
);

const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Authorization token is required'
        });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        return next();
    } catch {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
};



// Enable CORS 
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Log incoming requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// DATABASE CONNECTION

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

// POST signup - create user account
app.post('/auth/signup', async (req, res) => {
    try {
        const { fullName, email, password, dateOfBirth } = req.body;

        if (!fullName || !email || !password || !dateOfBirth) {
            return res.status(400).json({
                success: false,
                error: 'fullName, email, password, and dateOfBirth are required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters long'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const insertUserQuery = `
            INSERT INTO Users (FullName, Email, PasswordHash, DateOfBirth)
            VALUES ($1, $2, $3, $4)
            RETURNING UserID, FullName, Email, DateOfBirth
        `;

        const result = await pool.query(insertUserQuery, [
            fullName.trim(),
            email.trim().toLowerCase(),
            hashedPassword,
            dateOfBirth
        ]);

        const user = formatUser(result.rows[0]);
        const token = createAuthToken(user);

        return res.status(201).json({
            success: true,
            message: 'Signup successful',
            data: {
                token,
                user
            }
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({
                success: false,
                error: 'Email is already registered'
            });
        }

        console.error('Error during signup:', error);
        return res.status(500).json({
            success: false,
            error: 'Signup failed'
        });
    }
});

// POST login - email and password only
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'email and password are required'
            });
        }

        const query = `
            SELECT UserID, FullName, Email, PasswordHash, DateOfBirth
            FROM Users
            WHERE Email = $1
            LIMIT 1
        `;

        const result = await pool.query(query, [email.trim().toLowerCase()]);

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        const row = result.rows[0];
        const isValidPassword = await bcrypt.compare(password, row.passwordhash);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        const user = formatUser(row);
        const token = createAuthToken(user);

        return res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user
            }
        });
    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).json({
            success: false,
            error: 'Login failed'
        });
    }
});

// GET media reviews with website rating aggregate
app.get('/reviews/media/:mediaId', async (req, res) => {
    try {
        const { mediaId } = req.params;

        const mediaTypeResult = await pool.query(
            `
            SELECT MediaType
            FROM Media
            WHERE MediaID = $1
            LIMIT 1
            `,
            [mediaId]
        );

        if (mediaTypeResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Media not found'
            });
        }

        if (mediaTypeResult.rows[0].mediatype !== 'Movie') {
            return res.status(400).json({
                success: false,
                error: 'TV series reviews are episode-based. Use episode review endpoints.'
            });
        }

        const [aggregateResult, reviewsResult] = await Promise.all([
            pool.query(
                `
                SELECT
                    ROUND(AVG(Rating)::numeric, 1) as website_rating,
                    COUNT(*)::int as review_count
                FROM Review
                WHERE MediaID = $1
                `,
                [mediaId]
            ),
            pool.query(
                `
                SELECT
                    r.ReviewID,
                    r.ReviewText,
                    r.Rating,
                    r.PostDate,
                    r.SpoilerFlag,
                    r.EditedAt,
                    u.UserID,
                    u.FullName
                FROM Review r
                JOIN Users u ON r.UserID = u.UserID
                WHERE r.MediaID = $1
                ORDER BY r.PostDate DESC
                LIMIT 50
                `,
                [mediaId]
            )
        ]);

        const aggregate = aggregateResult.rows[0] || {};

        return res.json({
            success: true,
            data: {
                websiteRating: aggregate.website_rating,
                reviewCount: aggregate.review_count || 0,
                reviews: reviewsResult.rows
            }
        });
    } catch (error) {
        console.error('Error fetching media reviews:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch reviews'
        });
    }
});

// POST media review - creates or updates the user's review for the title
app.post('/reviews/media/:mediaId', requireAuth, async (req, res) => {
    const client = await pool.connect();
    let transactionStarted = false;
    try {
        const { mediaId } = req.params;
        const { rating, reviewText, spoilerFlag } = req.body;

        const numericRating = parseInt(rating, 10);

        if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 10) {
            return res.status(400).json({
                success: false,
                error: 'rating must be an integer between 1 and 10'
            });
        }

        const mediaTypeResult = await client.query(
            `
            SELECT MediaType
            FROM Media
            WHERE MediaID = $1
            LIMIT 1
            `,
            [mediaId]
        );

        if (mediaTypeResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Media not found'
            });
        }

        if (mediaTypeResult.rows[0].mediatype !== 'Movie') {
            return res.status(400).json({
                success: false,
                error: 'TV series reviews are episode-based. Use episode review endpoint.'
            });
        }

        await client.query('BEGIN');
        transactionStarted = true;
        // Serialize writes for the same (user, media) pair to avoid duplicates.
        await client.query(
            'SELECT pg_advisory_xact_lock(hashtext($1))',
            [`review:${req.user.userId}:${mediaId}`]
        );

        const existingReview = await client.query(
            `
            SELECT ReviewID
            FROM Review
            WHERE UserID = $1 AND MediaID = $2
            LIMIT 1
            `,
            [req.user.userId, mediaId]
        );

        if (existingReview.rows.length > 0) {
            const updated = await client.query(
                `
                UPDATE Review
                SET Rating = $1,
                    ReviewText = $2,
                    SpoilerFlag = $3,
                    EditedAt = CURRENT_TIMESTAMP
                WHERE ReviewID = $4
                RETURNING ReviewID, UserID, MediaID, Rating, ReviewText, SpoilerFlag, PostDate, EditedAt
                `,
                [
                    numericRating,
                    reviewText || null,
                    Boolean(spoilerFlag),
                    existingReview.rows[0].reviewid
                ]
            );

            await client.query('COMMIT');
            transactionStarted = false;

            return res.json({
                success: true,
                message: 'Review updated',
                data: updated.rows[0]
            });
        }

        const inserted = await client.query(
            `
            INSERT INTO Review (UserID, MediaID, ReviewText, Rating, SpoilerFlag)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING ReviewID, UserID, MediaID, Rating, ReviewText, SpoilerFlag, PostDate, EditedAt
            `,
            [
                req.user.userId,
                mediaId,
                reviewText || null,
                numericRating,
                Boolean(spoilerFlag)
            ]
        );

        await client.query('COMMIT');
        transactionStarted = false;

        return res.status(201).json({
            success: true,
            message: 'Review created',
            data: inserted.rows[0]
        });
    } catch (error) {
        if (transactionStarted) {
            await client.query('ROLLBACK');
        }
        console.error('Error creating/updating media review:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to submit review'
        });
    } finally {
        client.release();
    }
});

// GET episode reviews with aggregate rating
app.get('/reviews/episode/:mediaId/:seasonNo/:episodeNo', async (req, res) => {
    try {
        const { mediaId, seasonNo, episodeNo } = req.params;

        const [aggregateResult, reviewsResult] = await Promise.all([
            pool.query(
                `
                SELECT
                    ROUND(AVG(Rating)::numeric, 1) as website_rating,
                    COUNT(*)::int as review_count
                FROM Review
                WHERE EpisodeMediaID = $1 AND EpisodeSeasonNo = $2 AND EpisodeNo = $3
                `,
                [mediaId, seasonNo, episodeNo]
            ),
            pool.query(
                `
                SELECT
                    r.ReviewID,
                    r.ReviewText,
                    r.Rating,
                    r.PostDate,
                    r.SpoilerFlag,
                    r.EditedAt,
                    u.UserID,
                    u.FullName
                FROM Review r
                JOIN Users u ON r.UserID = u.UserID
                WHERE r.EpisodeMediaID = $1 AND r.EpisodeSeasonNo = $2 AND r.EpisodeNo = $3
                ORDER BY r.PostDate DESC
                LIMIT 50
                `,
                [mediaId, seasonNo, episodeNo]
            )
        ]);

        const aggregate = aggregateResult.rows[0] || {};

        return res.json({
            success: true,
            data: {
                websiteRating: aggregate.website_rating,
                reviewCount: aggregate.review_count || 0,
                reviews: reviewsResult.rows
            }
        });
    } catch (error) {
        console.error('Error fetching episode reviews:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch episode reviews'
        });
    }
});

// POST episode review - one review per user per episode (update if existing)
app.post('/reviews/episode/:mediaId/:seasonNo/:episodeNo', requireAuth, async (req, res) => {
    const client = await pool.connect();
    let transactionStarted = false;
    try {
        const { mediaId, seasonNo, episodeNo } = req.params;
        const { rating, reviewText, spoilerFlag } = req.body;

        const numericRating = parseInt(rating, 10);

        if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 10) {
            return res.status(400).json({
                success: false,
                error: 'rating must be an integer between 1 and 10'
            });
        }

        await client.query('BEGIN');
        transactionStarted = true;

        await client.query(
            'SELECT pg_advisory_xact_lock(hashtext($1))',
            [`review_ep:${req.user.userId}:${mediaId}:${seasonNo}:${episodeNo}`]
        );

        const existingReview = await client.query(
            `
            SELECT ReviewID
            FROM Review
            WHERE UserID = $1
              AND EpisodeMediaID = $2
              AND EpisodeSeasonNo = $3
              AND EpisodeNo = $4
            LIMIT 1
            `,
            [req.user.userId, mediaId, seasonNo, episodeNo]
        );

        if (existingReview.rows.length > 0) {
            const updated = await client.query(
                `
                UPDATE Review
                SET Rating = $1,
                    ReviewText = $2,
                    SpoilerFlag = $3,
                    EditedAt = CURRENT_TIMESTAMP
                WHERE ReviewID = $4
                RETURNING ReviewID, UserID, EpisodeMediaID, EpisodeSeasonNo, EpisodeNo, Rating, ReviewText, SpoilerFlag, PostDate, EditedAt
                `,
                [
                    numericRating,
                    reviewText || null,
                    Boolean(spoilerFlag),
                    existingReview.rows[0].reviewid
                ]
            );

            await client.query('COMMIT');
            transactionStarted = false;

            return res.json({
                success: true,
                message: 'Episode review updated',
                data: updated.rows[0]
            });
        }

        const inserted = await client.query(
            `
            INSERT INTO Review (
                UserID,
                MediaID,
                EpisodeMediaID,
                EpisodeSeasonNo,
                EpisodeNo,
                ReviewText,
                Rating,
                SpoilerFlag
            )
            VALUES ($1, NULL, $2, $3, $4, $5, $6, $7)
            RETURNING ReviewID, UserID, EpisodeMediaID, EpisodeSeasonNo, EpisodeNo, Rating, ReviewText, SpoilerFlag, PostDate, EditedAt
            `,
            [
                req.user.userId,
                mediaId,
                seasonNo,
                episodeNo,
                reviewText || null,
                numericRating,
                Boolean(spoilerFlag)
            ]
        );

        await client.query('COMMIT');
        transactionStarted = false;

        return res.status(201).json({
            success: true,
            message: 'Episode review created',
            data: inserted.rows[0]
        });
    } catch (error) {
        if (transactionStarted) {
            await client.query('ROLLBACK');
        }
        console.error('Error creating/updating episode review:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to submit episode review'
        });
    } finally {
        client.release();
    }
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

        const websiteRatingQuery = `
            SELECT
                ROUND(AVG(Rating)::numeric, 1) as website_rating,
                COUNT(*)::int as review_count
            FROM Review
            WHERE MediaID = $1
        `;

        // Execute all queries in parallel (faster!)
        const [movieResult, genreResult, castResult, crewResult, studioResult, websiteRatingResult] = await Promise.all([
            pool.query(movieQuery, [id]),
            pool.query(genreQuery, [id]),
            pool.query(castQuery, [id]),
            pool.query(crewQuery, [id]),
            pool.query(studioQuery, [id]),
            pool.query(websiteRatingQuery, [id])
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
        movie.websiteRating = websiteRatingResult.rows[0]?.website_rating || null;
        movie.reviewCount = websiteRatingResult.rows[0]?.review_count || 0;

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
                Description,
                Duration,
                AvgRating,
                StillPath
            FROM Episode
            WHERE MediaID = $1
            ORDER BY SeasonNo, EpisodeNo
        `;

        const seasonWebsiteRatingQuery = `
            SELECT
                EpisodeSeasonNo as seasonno,
                ROUND(AVG(Rating)::numeric, 1) as website_season_rating,
                COUNT(*)::int as season_review_count
            FROM Review
            WHERE EpisodeMediaID = $1
            GROUP BY EpisodeSeasonNo
        `;

        const showWebsiteRatingQuery = `
            WITH season_scores AS (
                SELECT EpisodeSeasonNo, AVG(Rating) as season_avg
                FROM Review
                WHERE EpisodeMediaID = $1
                GROUP BY EpisodeSeasonNo
            )
            SELECT
                ROUND(AVG(season_avg)::numeric, 1) as website_rating,
                (
                    SELECT COUNT(*)::int
                    FROM Review
                    WHERE EpisodeMediaID = $1
                ) as review_count
            FROM season_scores
        `;

        const [tvResult, seasonsResult, episodesResult, seasonWebsiteResult, showWebsiteResult] = await Promise.all([
            pool.query(tvQuery, [id]),
            pool.query(seasonsQuery, [id]),
            pool.query(episodesQuery, [id]),
            pool.query(seasonWebsiteRatingQuery, [id]),
            pool.query(showWebsiteRatingQuery, [id])
        ]);

        if (tvResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'TV show not found'
            });
        }

        const tvShow = tvResult.rows[0];
        const seasonWebsiteMap = new Map(
            seasonWebsiteResult.rows.map((row) => [
                Number(row.seasonno),
                {
                    websiteSeasonRating: row.website_season_rating,
                    seasonReviewCount: row.season_review_count || 0
                }
            ])
        );
        tvShow.websiteRating = showWebsiteResult.rows[0]?.website_rating || null;
        tvShow.reviewCount = showWebsiteResult.rows[0]?.review_count || 0;
        tvShow.seasons = seasonsResult.rows.map((season) => ({
            ...season,
            ...seasonWebsiteMap.get(Number(season.seasonno)),
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

        const seasonWebsiteRatingQuery = `
            SELECT
                EpisodeSeasonNo as seasonno,
                ROUND(AVG(Rating)::numeric, 1) as website_season_rating,
                COUNT(*)::int as season_review_count
            FROM Review
            WHERE EpisodeMediaID = $1
            GROUP BY EpisodeSeasonNo
        `;

        const showWebsiteRatingQuery = `
            WITH season_scores AS (
                SELECT EpisodeSeasonNo, AVG(Rating) as season_avg
                FROM Review
                WHERE EpisodeMediaID = $1
                GROUP BY EpisodeSeasonNo
            )
            SELECT
                ROUND(AVG(season_avg)::numeric, 1) as website_rating,
                (
                    SELECT COUNT(*)::int
                    FROM Review
                    WHERE EpisodeMediaID = $1
                ) as review_count
            FROM season_scores
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
        const [tvResult, genreResult, castResult, crewResult, studioResult, seasonsResult, episodesResult, seasonWebsiteResult, showWebsiteResult] = 
            await Promise.all([
                pool.query(tvQuery, [id]),
                pool.query(genreQuery, [id]),
                pool.query(castQuery, [id]),
                pool.query(crewQuery, [id]),
                pool.query(studioQuery, [id]),
                pool.query(seasonsQuery, [id]),
                pool.query(episodesQuery, [id]),
                pool.query(seasonWebsiteRatingQuery, [id]),
                pool.query(showWebsiteRatingQuery, [id])
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
        tvShow.websiteRating = showWebsiteResult.rows[0]?.website_rating || null;
        tvShow.reviewCount = showWebsiteResult.rows[0]?.review_count || 0;
        const seasonWebsiteMap = new Map(
            seasonWebsiteResult.rows.map((row) => [
                Number(row.seasonno),
                {
                    websiteSeasonRating: row.website_season_rating,
                    seasonReviewCount: row.season_review_count || 0
                }
            ])
        );
        
        // Attach episodes to each season  
        tvShow.seasons = seasonsResult.rows.map((season) => ({
            ...season,
            ...seasonWebsiteMap.get(Number(season.seasonno)),
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

// ══════════════════════════════════════════════
// USER ROUTES
// ══════════════════════════════════════════════

// POST create a new user
app.post('/users', async (req, res) => {
    try {
        const { fullName, email, password, dateOfBirth } = req.body;

        // Validate required fields
        if (!fullName || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'fullName, email, and password are required'
            });
        }

        const result = await pool.query(
            `INSERT INTO Users (FullName, Email, PasswordHash, DateOfBirth)
             VALUES ($1, $2, $3, $4)
             RETURNING UserID, FullName, Email, DateOfBirth`,
            [fullName, email, password, dateOfBirth || null]
        );

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        // Handle duplicate email
        if (error.code === '23505') {
            return res.status(409).json({
                success: false,
                error: 'A user with this email already exists'
            });
        }
        console.error('Error creating user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create user'
        });
    }
});

// GET user by ID
app.get('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT UserID, FullName, Email, DateOfBirth
             FROM Users
             WHERE UserID = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user'
        });
    }
});

// ══════════════════════════════════════════════
// BLOG ROUTES
// ══════════════════════════════════════════════

// GET all blogs (paginated)
app.get('/blogs', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const sort = req.query.sort || 'newest'; // 'newest' or 'popular'

        let orderBy;
        if (sort === 'popular') {
            orderBy = 'b.UpvoteCount DESC, b.PostDate DESC';
        } else {
            orderBy = 'b.PostDate DESC';
        }

        const query = `
            SELECT 
                b.BlogID,
                b.BlogTitle,
                LEFT(b.Content, 200) AS ContentPreview,
                b.PostDate,
                b.UpvoteCount,
                b.DownvoteCount,
                b.EditedAt,
                b.UserID,
                u.FullName AS AuthorName,
                (SELECT COUNT(*) FROM Comments WHERE BlogID = b.BlogID) AS CommentCount
            FROM Blog b
            JOIN Users u ON b.UserID = u.UserID
            ORDER BY ${orderBy}
            LIMIT $1 OFFSET $2
        `;

        const countQuery = `SELECT COUNT(*) AS total FROM Blog`;

        const [result, countResult] = await Promise.all([
            pool.query(query, [limit, offset]),
            pool.query(countQuery)
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
        console.error('Error fetching blogs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch blogs'
        });
    }
});

// GET single blog by ID
app.get('/blogs/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [result, mentionsResult] = await Promise.all([
            pool.query(
            `SELECT 
                b.BlogID,
                b.BlogTitle,
                b.Content,
                b.PostDate,
                b.UpvoteCount,
                b.DownvoteCount,
                b.EditedAt,
                b.UserID,
                u.FullName AS AuthorName
            FROM Blog b
            JOIN Users u ON b.UserID = u.UserID
            WHERE b.BlogID = $1`,
            [id]
        ), 
            pool.query(
            `SELECT 
                bm.MentionID,
                bm.MediaID, bm.PersonID, bm.ListID,
                m.Title AS MediaTitle, m.Poster AS MediaPoster, m.MediaType,
                p.FullName AS PersonName, p.Picture AS PersonPicture,
                ul.ListName, ul.IsPublic
            FROM Blog_Mentions bm
            LEFT JOIN Media m ON bm.MediaID = m.MediaID
            LEFT JOIN Person p ON bm.PersonID = p.PersonID
            LEFT JOIN User_List ul ON bm.ListID = ul.ListID
            WHERE bm.BlogID = $1`,
            [id]
        )]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Blog not found'
            });
        }

        // Group mentions by type
        const blog = result.rows[0];
        const allMentions = mentionsResult.rows;
        blog.mentions = {
            media: allMentions.filter(m => m.mediaid).map(m => ({
                mediaId: m.mediaid, title: m.mediatitle, poster: m.mediaposter, mediaType: m.mediatype
            })),
            persons: allMentions.filter(m => m.personid).map(m => ({
                personId: m.personid, name: m.personname, picture: m.personpicture
            })),
            lists: allMentions.filter(m => m.listid).map(m => ({
                listId: m.listid, listName: m.listname, isPublic: m.ispublic
            }))
        };

        res.json({
            success: true,
            data: blog
        });
    } catch (error) {
        console.error('Error fetching blog:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch blog'
        });
    }
});

// POST create a new blog
app.post('/blogs', async (req, res) => {
    try {
        const { userId, blogTitle, content, mentions } = req.body;

        // Validate required fields
        if (!userId || !blogTitle || !content) {
            return res.status(400).json({
                success: false,
                error: 'userId, blogTitle, and content are required'
            });
        }

        const result = await pool.query(
            `INSERT INTO Blog (UserID, BlogTitle, Content)
             VALUES ($1, $2, $3)
             RETURNING BlogID, UserID, BlogTitle, Content, PostDate, UpvoteCount, DownvoteCount`,
            [userId, blogTitle, content]
        );

        const blogId = result.rows[0].blogid;

        // Insert mentions (media, person, or list)
        if (mentions && mentions.length > 0) {
            // Deduplicate by type+id
            const seen = new Set();
            for (const mention of mentions) {
                const key = `${mention.type}:${mention.id}`;
                if (seen.has(key)) continue;
                seen.add(key);

                await pool.query(
                    `INSERT INTO Blog_Mentions (BlogID, MediaID, PersonID, ListID)
                     VALUES ($1, $2, $3, $4)
                     ON CONFLICT DO NOTHING`,
                    [
                        blogId,
                        mention.type === 'media' ? mention.id : null,
                        mention.type === 'person' ? mention.id : null,
                        mention.type === 'list' ? mention.id : null
                    ]);
            }
        }

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        // Handle invalid UserID (foreign key violation)
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                error: 'Invalid userId — user does not exist'
            });
        }
        console.error('Error creating blog:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create blog'
        });
    }
});

// PUT update a blog (only author can edit)
app.put('/blogs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, blogTitle, content, mentions } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required to verify authorship'
            });
        }

        // Check if blog exists and belongs to this user
        const blogCheck = await pool.query(
            'SELECT UserID FROM Blog WHERE BlogID = $1',
            [id]
        );

        if (blogCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Blog not found'
            });
        }

        if (blogCheck.rows[0].userid !== parseInt(userId)) {
            return res.status(403).json({
                success: false,
                error: 'You can only edit your own blogs'
            });
        }

        const result = await pool.query(
            `UPDATE Blog 
             SET BlogTitle = COALESCE($1, BlogTitle),
                 Content = COALESCE($2, Content),
                 EditedAt = CURRENT_TIMESTAMP
             WHERE BlogID = $3
             RETURNING BlogID, BlogTitle, Content, PostDate, EditedAt, UpvoteCount, DownvoteCount`,
            [blogTitle || null, content || null, id]
        );

        // Update mentions if provided
        if (mentions && mentions.length > 0) {
            await pool.query(
                `DELETE FROM Blog_Mentions WHERE BlogID = $1`,
                [id]
            );
            const seen = new Set();
            for (const mention of mentions) {
                const key = `${mention.type}:${mention.id}`;
                if (seen.has(key)) continue;
                seen.add(key);

                await pool.query(
                    `INSERT INTO Blog_Mentions (BlogID, MediaID, PersonID, ListID)
                     VALUES ($1, $2, $3, $4)
                     ON CONFLICT DO NOTHING`,
                    [
                        id,
                        mention.type === 'media' ? mention.id : null,
                        mention.type === 'person' ? mention.id : null,
                        mention.type === 'list' ? mention.id : null
                    ]
                );
            }
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error updating blog:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update blog'
        });
    }
});

// DELETE a blog (only author can delete)
app.delete('/blogs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required to verify authorship'
            });
        }

        // Check ownership
        const blogCheck = await pool.query(
            'SELECT UserID FROM Blog WHERE BlogID = $1',
            [id]
        );

        if (blogCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Blog not found'
            });
        }

        if (blogCheck.rows[0].userid !== parseInt(userId)) {
            return res.status(403).json({
                success: false,
                error: 'You can only delete your own blogs'
            });
        }

        await pool.query('DELETE FROM Blog WHERE BlogID = $1', [id]);

        res.json({
            success: true,
            message: 'Blog deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting blog:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete blog'
        });
    }
});

// POST upvote a blog
app.post('/blogs/:id/upvote', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE Blog 
             SET UpvoteCount = UpvoteCount + 1
             WHERE BlogID = $1
             RETURNING BlogID, UpvoteCount, DownvoteCount`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Blog not found'
            });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error upvoting blog:', error);
        res.status(500).json({ success: false, error: 'Failed to upvote blog' });
    }
});

// POST downvote a blog
app.post('/blogs/:id/downvote', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE Blog 
             SET DownvoteCount = DownvoteCount + 1
             WHERE BlogID = $1
             RETURNING BlogID, UpvoteCount, DownvoteCount`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Blog not found'
            });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error downvoting blog:', error);
        res.status(500).json({ success: false, error: 'Failed to downvote blog' });
    }
});

// ══════════════════════════════════════════════
// COMMENT ROUTES
// ══════════════════════════════════════════════

// GET all comments for a blog
app.get('/blogs/:id/comments', async (req, res) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        const query = `
            SELECT 
                c.CommentID,
                c.CommentText,
                c.PostDate,
                c.UpvoteCount,
                c.DownvoteCount,
                c.EditedAt,
                c.ReplyToCommentID,
                c.UserID,
                u.FullName AS CommenterName
            FROM Comments c
            JOIN Users u ON c.UserID = u.UserID
            WHERE c.BlogID = $1
            ORDER BY c.PostDate ASC
            LIMIT $2 OFFSET $3
        `;

        const countQuery = `
            SELECT COUNT(*) AS total 
            FROM Comments 
            WHERE BlogID = $1
        `;

        // Fetch mentions for all comments in this blog
        const mentionsQuery = `
            SELECT 
                cm.CommentID,
                cm.MediaID, cm.PersonID, cm.ListID,
                m.Title AS MediaTitle, m.Poster AS MediaPoster, m.MediaType,
                p.FullName AS PersonName, p.Picture AS PersonPicture,
                ul.ListName, ul.IsPublic
            FROM Comment_Mentions cm
            LEFT JOIN Media m ON cm.MediaID = m.MediaID
            LEFT JOIN Person p ON cm.PersonID = p.PersonID
            LEFT JOIN User_List ul ON cm.ListID = ul.ListID
            WHERE cm.CommentID IN (
                SELECT CommentID FROM Comments WHERE BlogID = $1
            )
        `;

        const [result, countResult, mentionsResult] = await Promise.all([
            pool.query(query, [id, limit, offset]),
            pool.query(countQuery, [id]),
            pool.query(mentionsQuery, [id])
        ]);

        const total = parseInt(countResult.rows[0].total);
        const allMentions = mentionsResult.rows;

        // Attach mentions to each comment
        const comments = result.rows.map(comment => {
            const commentMentions = allMentions.filter(m => m.commentid === comment.commentid);
            comment.mentions = {
                media: commentMentions.filter(m => m.mediaid).map(m => ({
                    mediaId: m.mediaid, title: m.mediatitle, poster: m.mediaposter, mediaType: m.mediatype
                })),
                persons: commentMentions.filter(m => m.personid).map(m => ({
                    personId: m.personid, name: m.personname, picture: m.personpicture
                })),
                lists: commentMentions.filter(m => m.listid).map(m => ({
                    listId: m.listid, listName: m.listname, isPublic: m.ispublic
                }))
            };
            return comment;
        });

        res.json({
            success: true,
            data: comments,
            pagination: {
                page: page,
                limit: limit,
                total: total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch comments'
        });
    }
});

// GET search User Lists
app.get('/lists/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query || query.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'q is required' });
        }
        
        const limit = parseInt(req.query.limit) || 10;
        
        const result = await pool.query(`
            SELECT ul.ListID, ul.ListName, ul.IsPublic, u.FullName as Creator
            FROM User_List ul
            JOIN Users u ON ul.UserID = u.UserID
            WHERE ul.ListName ILIKE $1 AND ul.IsPublic = TRUE
            LIMIT $2
        `, [`%${query}%`, limit]);
        
        res.json({ success: true, data: result.rows });
    } catch (e) {
        console.error('Error searching lists:', e);
        res.status(500).json({ success: false, error: 'List search failed' });
    }
});

// POST add a comment to a blog
app.post('/blogs/:id/comments', async (req, res) => {
    try {
        const blogId = req.params.id;
        const { userId, commentText, replyToCommentId, mentions } = req.body;

        // Validate required fields
        if (!userId || !commentText) {
            return res.status(400).json({
                success: false,
                error: 'userId and commentText are required'
            });
        }

        // Check if blog exists
        const blogCheck = await pool.query(
            'SELECT BlogID FROM Blog WHERE BlogID = $1',
            [blogId]
        );

        if (blogCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Blog not found'
            });
        }

        const result = await pool.query(
            `INSERT INTO Comments (UserID, BlogID, ReplyToCommentID, CommentText)
             VALUES ($1, $2, $3, $4)
             RETURNING CommentID, UserID, BlogID, ReplyToCommentID, CommentText, PostDate, UpvoteCount, DownvoteCount`,
            [userId, blogId, replyToCommentId || null, commentText]
        );

        // Insert comment mentions
        const commentId = result.rows[0].commentid;
        if (mentions && mentions.length > 0) {
            const seen = new Set();
            for (const mention of mentions) {
                const key = `${mention.type}:${mention.id}`;
                if (seen.has(key)) continue;
                seen.add(key);

                await pool.query(
                    `INSERT INTO Comment_Mentions (CommentID, MediaID, PersonID, ListID)
                     VALUES ($1, $2, $3, $4)
                     ON CONFLICT DO NOTHING`,
                    [
                        commentId,
                        mention.type === 'media' ? mention.id : null,
                        mention.type === 'person' ? mention.id : null,
                        mention.type === 'list' ? mention.id : null
                    ]);
            }
        }

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                error: 'Invalid userId or replyToCommentId — referenced record does not exist'
            });
        }
        console.error('Error creating comment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create comment'
        });
    }
});

// PUT edit a comment (only author can edit)
app.put('/comments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, commentText, mentions } = req.body;

        if (!userId || !commentText) {
            return res.status(400).json({
                success: false,
                error: 'userId and commentText are required'
            });
        }

        // Check ownership
        const commentCheck = await pool.query(
            'SELECT UserID FROM Comments WHERE CommentID = $1',
            [id]
        );

        if (commentCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Comment not found'
            });
        }

        if (commentCheck.rows[0].userid !== parseInt(userId)) {
            return res.status(403).json({
                success: false,
                error: 'You can only edit your own comments'
            });
        }

        const result = await pool.query(
            `UPDATE Comments 
             SET CommentText = $1, EditedAt = CURRENT_TIMESTAMP
             WHERE CommentID = $2
             RETURNING CommentID, CommentText, PostDate, EditedAt, UpvoteCount, DownvoteCount`,
            [commentText, id]
        );

        // Update comment mentions if provided
        if (mentions && mentions.length > 0) {
            await pool.query(
                'DELETE FROM Comment_Mentions WHERE CommentID = $1',
                [id]
            );
            const seen = new Set();
            for (const mention of mentions) {
                const key = `${mention.type}:${mention.id}`;
                if (seen.has(key)) continue;
                seen.add(key);

                await pool.query(
                    `INSERT INTO Comment_Mentions (CommentID, MediaID, PersonID, ListID)
                     VALUES ($1, $2, $3, $4)
                     ON CONFLICT DO NOTHING`,
                    [
                        id,
                        mention.type === 'media' ? mention.id : null,
                        mention.type === 'person' ? mention.id : null,
                        mention.type === 'list' ? mention.id : null
                    ]
                );
            }
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error updating comment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update comment'
        });
    }
});

// DELETE a comment (only author can delete)
app.delete('/comments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required to verify authorship'
            });
        }

        const commentCheck = await pool.query(
            'SELECT UserID FROM Comments WHERE CommentID = $1',
            [id]
        );

        if (commentCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Comment not found'
            });
        }

        if (commentCheck.rows[0].userid !== parseInt(userId)) {
            return res.status(403).json({
                success: false,
                error: 'You can only delete your own comments'
            });
        }

        await pool.query('DELETE FROM Comments WHERE CommentID = $1', [id]);

        res.json({
            success: true,
            message: 'Comment deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete comment'
        });
    }
});

// POST upvote a comment
app.post('/comments/:id/upvote', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE Comments 
             SET UpvoteCount = UpvoteCount + 1
             WHERE CommentID = $1
             RETURNING CommentID, UpvoteCount, DownvoteCount`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Comment not found'
            });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error upvoting comment:', error);
        res.status(500).json({ success: false, error: 'Failed to upvote comment' });
    }
});

// POST downvote a comment
app.post('/comments/:id/downvote', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE Comments 
             SET DownvoteCount = DownvoteCount + 1
             WHERE CommentID = $1
             RETURNING CommentID, UpvoteCount, DownvoteCount`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Comment not found'
            });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error downvoting comment:', error);
        res.status(500).json({ success: false, error: 'Failed to downvote comment' });
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
