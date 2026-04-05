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
        <main className="page-full">
            <div className="detail-hero">
                <div 
                    className="detail-hero-bg" 
                    style={{ backgroundImage: `url(${getPosterUrl(movie.poster)})` }} 
                />
                <div className="detail-hero-content">
                    <Link className="back-link hero-back" to="/movies">Movies</Link>
                    {getPosterUrl(movie.poster) ? (
                        <img
                            className="detail-hero-poster"
                            src={getPosterUrl(movie.poster)}
                            alt={movie.title}
                        />
                    ) : (
                        <div className="detail-hero-poster placeholder">No poster</div>
                    )}
                    <div className="detail-hero-info">
                        <h2 className="detail-hero-title">{movie.title}</h2>
                        <div className="detail-hero-meta">
                            <span>{movie.releaseyear || '—'}</span>
                            <span>•</span>
                            <span>{movie.languagename || '—'}</span>
                            <span>•</span>
                            <span>{movie.duration ? `${movie.duration} min` : 'N/A'}</span>
                            <span>•</span>
                            <div className="detail-hero-rating">
                                ⭐ {movie.rating ? movie.rating : 'N/A'}
                                <small>({movie.ratingcount || 0} reviews)</small>
                            </div>
                        </div>
                        <p className="detail-hero-overview">
                            {movie.description || 'No description available.'}
                        </p>
                        
                        {movie.genres?.length > 0 && (
                            <div className="genre-chips">
                                {movie.genres.map((genre) => (
                                    <span className="genre-chip glass-chip" key={genre.genreid}>{genre.genrename}</span>
                                ))}
                            </div>
                        )}
                        
                        <div className="hero-actions" style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            {movie.trailerlink && (
                                <a className="btn btn-primary trailer-btn" href={movie.trailerlink} target="_blank" rel="noreferrer">
                                    Watch Trailer
                                </a>
                            )}
                            
                            {user && myLists.length > 0 && (
                                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', background: 'rgba(255,255,255,0.1)', padding: '0.3rem 0.5rem', borderRadius: '8px' }}>
                                    <select className="sleek-dropdown small-dropdown" style={{background: 'rgba(255,255,255,0.9)'}} value={selectedListId} onChange={(event) => setSelectedListId(event.target.value)}>
                                        {myLists.map((list) => (
                                            <option key={list.listid} value={list.listid}>{list.listname}</option>
                                        ))}
                                    </select>
                                    <button type="button" className="btn btn-primary btn-sm" onClick={handleAddToList} disabled={addingToList}>
                                        {addingToList ? 'Adding...' : 'Add to List'}
                                    </button>
                                </div>
                            )}
                            {listActionStatus && <span className="status inline-status">{listActionStatus}</span>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="detail-gridLayout">
                <div className="detail-main-col">
                    {/* Trailer frame if available */}
                    {trailerEmbedUrl && (
                        <div className="detail-section trailer-section">
                            <h3>Trailer</h3>
                            <div className="trailer-frame-wrap">
                                <iframe
                                    className="trailer-frame"
                                    src={trailerEmbedUrl}
                                    title={`${movie.title} trailer`}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        </div>
                    )}

                    {movie.cast?.length > 0 && (
                        <div className="detail-section">
                            <h3>Cast</h3>
                            <div className="people-grid-circular">
                                {movie.cast.slice(0, 10).map((person) => (
                                    <Link className="person-card-circular" to={`/persons/${person.personid}`} key={person.personid}>
                                        {getProfileUrl(person.picture) ? (
                                            <img className="person-photo-circular" src={getProfileUrl(person.picture)} alt={person.fullname} loading="lazy" />
                                        ) : (
                                            <div className="person-photo-circular placeholder">Photo</div>
                                        )}
                                        <div className="person-info">
                                            <h4>{person.fullname}</h4>
                                            <p>{person.charactername ? `${person.charactername}` : 'Actor'}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {movie.crew?.length > 0 && (
                        <div className="detail-section">
                            <h3>Crew</h3>
                            <div className="people-grid-circular">
                                {movie.crew.slice(0, 10).map((person) => (
                                    <Link className="person-card-circular" to={`/persons/${person.personid}`} key={`${person.personid}-${person.crewrole}`}>
                                        {getProfileUrl(person.picture) ? (
                                            <img className="person-photo-circular" src={getProfileUrl(person.picture)} alt={person.fullname} loading="lazy" />
                                        ) : (
                                            <div className="person-photo-circular placeholder">Photo</div>
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
                        <div className="detail-section" style={{marginBottom: '3rem'}}>
                            <h3>Studios</h3>
                            <div className="studios-grid">
                                {movie.studios.map((studio) => {
                                    const logoUrl = getStudioLogoUrl(studio.logourl)
                                    const websiteUrl = getStudioWebsiteUrl(studio.websiteurl)
                                    const content = (
                                        <>
                                            {logoUrl ? (
                                                <img src={logoUrl} alt={studio.studioname} className="studio-logo" loading="lazy" />
                                            ) : (
                                                <div className="studio-logo placeholder">No Logo</div>
                                            )}
                                            <span className="studio-name">{studio.studioname}</span>
                                        </>
                                    )
                                    return websiteUrl ? (
                                        <a key={studio.studioid} className="studio-card studio-link" href={websiteUrl} target="_blank" rel="noreferrer" title={`Visit ${studio.studioname}`}>
                                            {content}
                                        </a>
                                    ) : (
                                        <div key={studio.studioid} className="studio-card">{content}</div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Align Review Column */}
                <div className="detail-sidebar-col">
                    <div className="sidebar-sticky">
                        <MediaReviewsSection mediaId={id} />
                    </div>
                </div>
            </div>
        </main>
    )
}

export default MovieDetailsPage
