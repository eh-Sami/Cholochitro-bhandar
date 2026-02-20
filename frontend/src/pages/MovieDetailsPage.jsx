import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

const API_BASE = 'http://localhost:3000'
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500'

const getPosterUrl = (posterPath) => {
    if (!posterPath) return null
    return `${POSTER_BASE}${posterPath}`
}

const PROFILE_BASE = 'https://image.tmdb.org/t/p/w185'
const getProfileUrl = (profilePath) => (profilePath ? `${PROFILE_BASE}${profilePath}` : null)
const STUDIO_LOGO_BASE = 'https://image.tmdb.org/t/p/w300'

const getStudioLogoUrl = (logoPath) => {
    if (!logoPath) return null
    if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) return logoPath
    return `${STUDIO_LOGO_BASE}${logoPath}`
}

const getStudioWebsiteUrl = (websiteUrl) => {
    if (!websiteUrl) return null
    if (websiteUrl.startsWith('http://') || websiteUrl.startsWith('https://')) return websiteUrl
    return `https://${websiteUrl}`
}

const getYouTubeEmbedUrl = (trailerUrl) => {
    if (!trailerUrl) return null
    try {
        const url = new URL(trailerUrl)
        if (url.hostname.includes('youtu.be')) {
            const videoId = url.pathname.replace('/', '')
            return videoId ? `https://www.youtube.com/embed/${videoId}` : null
        }
        const videoId = url.searchParams.get('v')
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null
    } catch {
        return null
    }
}

function MovieDetailsPage() {
    const { id } = useParams()
    const [movie, setMovie] = useState(null)
    const [rank, setRank] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchMovie = async () => {
            try {
                const [movieResponse, rankResponse] = await Promise.all([
                    fetch(`${API_BASE}/movies/${id}`),
                    fetch(`${API_BASE}/movies?sort=rating&limit=200&page=1`)
                ])

                if (!movieResponse.ok) {
                    throw new Error('Failed to fetch movie details')
                }

                const movieData = await movieResponse.json()
                setMovie(movieData.data || null)

                if (rankResponse.ok) {
                    const rankData = await rankResponse.json()
                    const rankedMovies = rankData.data || []
                    const index = rankedMovies.findIndex((item) => String(item.mediaid) === String(id))
                    setRank(index >= 0 ? index + 1 : null)
                }
            } catch (err) {
                setError(err.message || 'Something went wrong')
            } finally {
                setLoading(false)
            }
        }

        fetchMovie()
    }, [id])

    if (loading) {
        return <p className="status">Loading movie...</p>
    }

    if (error) {
        return <p className="status error">{error}</p>
    }

    if (!movie) {
        return <p className="status">Movie not found.</p>
    }

    const trailerEmbedUrl = getYouTubeEmbedUrl(movie.trailerlink)

    return (
        <main className="page">
            <Link className="back-link" to="/movies">← Back to Movies</Link>
            <div className="detail">
                {getPosterUrl(movie.poster) ? (
                    <img
                        className="detail-poster"
                        src={getPosterUrl(movie.poster)}
                        alt={movie.title}
                    />
                ) : (
                    <div className="detail-poster placeholder">No poster</div>
                )}
                <div className="detail-body">
                    <h2>{movie.title}</h2>
                    <p className="detail-meta">
                        {movie.releaseyear || '—'} · {movie.languagename || '—'}
                    </p>

                    <div className="detail-stats">
                        <div className="stat-box">
                            <span>Rating</span>
                            <strong>⭐ {movie.rating || 'N/A'}</strong>
                        </div>
                        <div className="stat-box">
                            <span>Runtime</span>
                            <strong>{movie.duration ? `${movie.duration} min` : 'N/A'}</strong>
                        </div>
                        <div className="stat-box">
                            <span>Top Rank</span>
                            <strong>{rank ? `#${rank} / 200` : 'Outside Top 200'}</strong>
                        </div>
                    </div>

                    <p className="detail-desc">{movie.description || 'No description available.'}</p>

                    {movie.trailerlink && (
                        <div className="detail-section trailer-section">
                            <h3>Trailer</h3>
                            <a
                                className="btn btn-primary trailer-btn"
                                href={movie.trailerlink}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Watch Trailer
                            </a>
                            {trailerEmbedUrl && (
                                <div className="trailer-frame-wrap">
                                    <iframe
                                        className="trailer-frame"
                                        src={trailerEmbedUrl}
                                        title={`${movie.title} trailer`}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {movie.genres?.length > 0 && (
                        <div className="detail-section">
                            <h3>Genres</h3>
                            <div className="genre-chips">
                                {movie.genres.map((genre) => (
                                    <span className="genre-chip" key={genre.genreid}>{genre.genrename}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {movie.cast?.length > 0 && (
                        <div className="detail-section">
                            <h3>Cast</h3>
                            <div className="people-grid">
                                {movie.cast.map((person) => (
                                    <Link
                                        className="person-card"
                                        to={`/persons/${person.personid}`}
                                        key={person.personid}
                                    >
                                        {getProfileUrl(person.picture) ? (
                                            <img
                                                className="person-photo"
                                                src={getProfileUrl(person.picture)}
                                                alt={person.fullname}
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="person-photo placeholder">No photo</div>
                                        )}
                                        <div className="person-info">
                                            <h4>{person.fullname}</h4>
                                            <p>{person.charactername ? `as ${person.charactername}` : 'Actor'}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {movie.crew?.length > 0 && (
                        <div className="detail-section">
                            <h3>Crew</h3>
                            <div className="people-grid">
                                {movie.crew.map((person) => (
                                    <Link
                                        className="person-card"
                                        to={`/persons/${person.personid}`}
                                        key={`${person.personid}-${person.crewrole}`}
                                    >
                                        {getProfileUrl(person.picture) ? (
                                            <img
                                                className="person-photo"
                                                src={getProfileUrl(person.picture)}
                                                alt={person.fullname}
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="person-photo placeholder">No photo</div>
                                        )}
                                        <div className="person-info">
                                            <h4>{person.fullname}</h4>
                                            <p>{person.crewrole}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {movie.studios?.length > 0 && (
                        <div className="detail-section">
                            <h3>Studios</h3>
                            <div className="studios-grid">
                                {movie.studios.map((studio) => {
                                    const logoUrl = getStudioLogoUrl(studio.logourl)
                                    const websiteUrl = getStudioWebsiteUrl(studio.websiteurl)

                                    const content = logoUrl ? (
                                        <img
                                            src={logoUrl}
                                            alt={studio.studioname}
                                            className="studio-logo"
                                            title={studio.studioname}
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="studio-logo placeholder">
                                            {studio.studioname}
                                        </div>
                                    )

                                    if (websiteUrl) {
                                        return (
                                            <a
                                                key={studio.studioid}
                                                className="studio-card studio-link"
                                                href={websiteUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                title={`Visit ${studio.studioname}`}
                                            >
                                                {content}
                                            </a>
                                        )
                                    }

                                    return (
                                        <div key={studio.studioid} className="studio-card">
                                            {content}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    )
}

export default MovieDetailsPage
