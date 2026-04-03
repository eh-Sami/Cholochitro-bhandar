import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import MediaReviewsSection from '../components/MediaReviewsSection'
import { getAuthToken, getStoredAuth } from '../utils/auth'

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
    const { user } = getStoredAuth()
    const token = getAuthToken()
    const [movie, setMovie] = useState(null)
    const [rank, setRank] = useState(null)
    const [myLists, setMyLists] = useState([])
    const [selectedListId, setSelectedListId] = useState('')
    const [listActionStatus, setListActionStatus] = useState('')
    const [addingToList, setAddingToList] = useState(false)
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

    useEffect(() => {
        const fetchMyLists = async () => {
            if (!token) {
                setMyLists([])
                setSelectedListId('')
                return
            }

            try {
                const response = await fetch(`${API_BASE}/lists?mine=true&limit=100&page=1`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })
                const data = await response.json()

                if (!response.ok || !data.success) {
                    return
                }

                const rows = data.data || []
                setMyLists(rows)

                if (rows.length > 0) {
                    setSelectedListId(String(rows[0].listid))
                }
            } catch {
                setMyLists([])
                setSelectedListId('')
            }
        }

        fetchMyLists()
    }, [token])

    const handleAddToList = async () => {
        if (!token) {
            setListActionStatus('Please login to add this title to a list.')
            return
        }

        if (!selectedListId) {
            setListActionStatus('Please select a list first.')
            return
        }

        setAddingToList(true)
        setListActionStatus('')

        try {
            const response = await fetch(`${API_BASE}/lists/${selectedListId}/items`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ mediaId: Number(id) })
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to add title to list')
            }

            setListActionStatus('Added to list successfully.')
        } catch (err) {
            setListActionStatus(err.message || 'Failed to add title to list')
        } finally {
            setAddingToList(false)
        }
    }

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
                    <div className="detail-stack">
                        <div className="detail-left-panel">
                            {movie.genres?.length > 0 && (
                                <div className="detail-section genres-large">
                                    <h3>Genres</h3>
                                    <div className="genre-chips">
                                        {movie.genres.map((genre) => (
                                            <span className="genre-chip" key={genre.genreid}>{genre.genrename}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="detail-section detail-facts">
                                <div className="detail-facts-grid detail-facts-row">
                                    <div className="detail-fact">
                                        <span className="detail-fact-icon">📅</span>
                                        <span className="detail-fact-label">Release Year</span>
                                        <strong className="detail-fact-value">{movie.releaseyear || '—'}</strong>
                                    </div>
                                    <div className="detail-fact">
                                        <span className="detail-fact-icon">🌐</span>
                                        <span className="detail-fact-label">Language</span>
                                        <strong className="detail-fact-value">{movie.languagename || '—'}</strong>
                                    </div>
                                    <div className="detail-fact">
                                        <span className="detail-fact-icon">⏱️</span>
                                        <span className="detail-fact-label">Runtime</span>
                                        <strong className="detail-fact-value">{movie.duration ? `${movie.duration} min` : 'N/A'}</strong>
                                    </div>
                                    <div className="detail-fact">
                                        <span className="detail-fact-icon">⭐</span>
                                        <span className="detail-fact-label">Rating</span>
                                        <strong className="detail-fact-value">
                                            {movie.rating ? `⭐ ${movie.rating}` : 'N/A'}
                                        </strong>
                                        <small>{movie.ratingcount || 0} ratings</small>
                                    </div>
                                    <div className="detail-fact">
                                        <span className="detail-fact-icon">🏆</span>
                                        <span className="detail-fact-label">Top Rank</span>
                                        <strong className="detail-fact-value">{rank ? `#${rank} / 200` : 'Outside Top 200'}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h3>Synopsis</h3>
                                <p className="detail-desc detail-desc-large">
                                    {movie.description || 'No description available.'}
                                </p>
                            </div>

                            <div className="detail-section">
                                <h3>Add To List</h3>
                                {!user && (
                                    <p className="status">Please <Link to="/login">login</Link> to add this title to your lists.</p>
                                )}

                                {user && myLists.length === 0 && (
                                    <p className="status">You have no lists yet. <Link to="/lists">Create one first</Link>.</p>
                                )}

                                {user && myLists.length > 0 && (
                                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <select value={selectedListId} onChange={(event) => setSelectedListId(event.target.value)}>
                                            {myLists.map((list) => (
                                                <option key={list.listid} value={list.listid}>
                                                    {list.listname}
                                                </option>
                                            ))}
                                        </select>
                                        <button type="button" className="btn btn-primary btn-sm" onClick={handleAddToList} disabled={addingToList}>
                                            {addingToList ? 'Adding...' : 'Add'}
                                        </button>
                                        <Link className="btn btn-ghost btn-sm" to="/lists">Manage Lists</Link>
                                    </div>
                                )}

                                {listActionStatus && <p className="status" style={{ marginTop: '0.5rem' }}>{listActionStatus}</p>}
                            </div>

                            <MediaReviewsSection mediaId={id} />

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
                        </div>
                    </div>

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

                                    const content = (
                                        <>
                                            {logoUrl ? (
                                                <img
                                                    src={logoUrl}
                                                    alt={studio.studioname}
                                                    className="studio-logo"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="studio-logo placeholder">
                                                    No Logo
                                                </div>
                                            )}
                                            <span className="studio-name">{studio.studioname}</span>
                                        </>
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
