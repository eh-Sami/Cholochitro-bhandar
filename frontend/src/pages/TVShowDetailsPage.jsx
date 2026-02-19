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

const getSeriesTrailer = (show) => {
    if (!show?.seasons || show.seasons.length === 0) return null
    const withTrailer = show.seasons.find((season) => season.trailerlink)
    return withTrailer?.trailerlink || null
}

function TVShowDetailsPage() {
    const { id } = useParams()
    const [show, setShow] = useState(null)
    const [rank, setRank] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchShow = async () => {
            try {
                const [showResponse, rankResponse] = await Promise.all([
                    fetch(`${API_BASE}/tvshows/${id}`),
                    fetch(`${API_BASE}/tvshows?sort=rating&limit=200&page=1`)
                ])

                if (!showResponse.ok) {
                    throw new Error('Failed to fetch TV show details')
                }

                const showData = await showResponse.json()
                setShow(showData.data || null)

                if (rankResponse.ok) {
                    const rankData = await rankResponse.json()
                    const rankedShows = rankData.data || []
                    const index = rankedShows.findIndex((item) => String(item.mediaid) === String(id))
                    setRank(index >= 0 ? index + 1 : null)
                }
            } catch (err) {
                setError(err.message || 'Something went wrong')
            } finally {
                setLoading(false)
            }
        }

        fetchShow()
    }, [id])

    if (loading) {
        return <p className="status">Loading TV show...</p>
    }

    if (error) {
        return <p className="status error">{error}</p>
    }

    if (!show) {
        return <p className="status">TV show not found.</p>
    }

    const trailerLink = getSeriesTrailer(show)
    const trailerEmbedUrl = getYouTubeEmbedUrl(trailerLink)

    return (
        <main className="page">
            <Link className="back-link" to="/tvshows">← Back to TV Shows</Link>
            <div className="detail">
                {getPosterUrl(show.poster) ? (
                    <img
                        className="detail-poster"
                        src={getPosterUrl(show.poster)}
                        alt={show.title}
                    />
                ) : (
                    <div className="detail-poster placeholder">No poster</div>
                )}
                <div className="detail-body">
                    <h2>{show.title}</h2>
                    <p className="detail-meta">
                        {show.releaseyear || '—'} · {show.languagename || '—'}
                    </p>

                    <div className="detail-stats">
                        <div className="stat-box">
                            <span>Rating</span>
                            <strong>⭐ {show.rating || 'N/A'}</strong>
                        </div>
                        <div className="stat-box">
                            <span>Status</span>
                            <strong>{show.isongoing ? 'Ongoing' : 'Ended'}</strong>
                        </div>
                        <div className="stat-box">
                            <span>Seasons</span>
                            <strong>{show.numberofseasons || 0}</strong>
                        </div>
                        <div className="stat-box">
                            <span>Top Rank</span>
                            <strong>{rank ? `#${rank} / 200` : 'Outside Top 200'}</strong>
                        </div>
                    </div>

                    <p className="detail-desc">{show.description || 'No description available.'}</p>

                    {trailerLink && (
                        <div className="detail-section trailer-section">
                            <h3>Trailer</h3>
                            <a
                                className="btn btn-primary trailer-btn"
                                href={trailerLink}
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
                                        title={`${show.title} trailer`}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {show.genres?.length > 0 && (
                        <div className="detail-section">
                            <h3>Genres</h3>
                            <div className="genre-chips">
                                {show.genres.map((genre) => (
                                    <span className="genre-chip" key={genre.genreid}>{genre.genrename}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {show.cast?.length > 0 && (
                        <div className="detail-section">
                            <h3>Cast</h3>
                            <div className="people-grid">
                                {show.cast.map((person) => (
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

                    {show.crew?.length > 0 && (
                        <div className="detail-section">
                            <h3>Crew</h3>
                            <div className="people-grid">
                                {show.crew.map((person) => (
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

                    {show.studios?.length > 0 && (
                        <div className="detail-section">
                            <h3>Studios</h3>
                            <p>{show.studios.map((s) => s.studioname).join(', ')}</p>
                        </div>
                    )}

                    {show.seasons?.length > 0 && (
                        <div className="detail-section">
                            <h3>Seasons</h3>
                            <ul>
                                {show.seasons.map((season) => (
                                    <li key={season.seasonno}>
                                        Season {season.seasonno}: {season.seasontitle || 'Untitled'}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </main>
    )
}

export default TVShowDetailsPage
