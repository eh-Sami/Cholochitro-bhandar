import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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

const hexToRgb = (hex) => {
    const normalized = hex.replace('#', '')
    const value = parseInt(normalized, 16)
    return {
        r: (value >> 16) & 255,
        g: (value >> 8) & 255,
        b: value & 255
    }
}

const rgbToHex = ({ r, g, b }) => {
    const toHex = (channel) => Math.round(channel).toString(16).padStart(2, '0')
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

const interpolateRgb = (start, end, factor) => ({
    r: start.r + (end.r - start.r) * factor,
    g: start.g + (end.g - start.g) * factor,
    b: start.b + (end.b - start.b) * factor
})

const getTextColorForBackground = ({ r, g, b }) => {
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance < 0.52 ? '#ffffff' : '#111827'
}

const getColorForRating = (rating) => {
    const minRating = 7.5
    const midRating = 8.7
    const maxRating = 9.5
    const lowColor = hexToRgb('#f97316')
    const midColor = hexToRgb('#cbd5f5')
    const highColor = hexToRgb('#1e3a8a')

    const clampedRating = Math.max(minRating, Math.min(maxRating, rating))

    let rgb
    if (clampedRating <= midRating) {
        const factor = (clampedRating - minRating) / (midRating - minRating)
        rgb = interpolateRgb(lowColor, midColor, factor)
    } else {
        const factor = (clampedRating - midRating) / (maxRating - midRating)
        rgb = interpolateRgb(midColor, highColor, factor)
    }

    return {
        bg: rgbToHex(rgb),
        text: getTextColorForBackground(rgb)
    }
}

function TVShowDetailsPage() {
    const { id } = useParams()
    const { user } = getStoredAuth()
    const token = getAuthToken()
    const [show, setShow] = useState(null)
    const [rank, setRank] = useState(null)
    const [myLists, setMyLists] = useState([])
    const [selectedListId, setSelectedListId] = useState('')
    const [listActionStatus, setListActionStatus] = useState('')
    const [addingToList, setAddingToList] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [selectedSeasonNo, setSelectedSeasonNo] = useState(null)
    const [showRatingsModal, setShowRatingsModal] = useState(false)

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

    useEffect(() => {
        if (show?.seasons?.length && selectedSeasonNo === null) {
            setSelectedSeasonNo(show.seasons[0].seasonno)
        }
    }, [show, selectedSeasonNo])

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
        return <p className="status">Loading TV show...</p>
    }

    if (error) {
        return <p className="status error">{error}</p>
    }

    if (!show) {
        return <p className="status">TV show not found.</p>
    }

    const selectedSeason = show.seasons?.find((season) => season.seasonno === selectedSeasonNo)
        || show.seasons?.[0]
        || null
    const globalSeasonRating = selectedSeason?.avgrating !== null && selectedSeason?.avgrating !== undefined
        ? Number(selectedSeason.avgrating).toFixed(1)
        : 'N/A'

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
                    <div className="detail-stack">
                        <div className="detail-left-panel">
                            {show.genres?.length > 0 && (
                                <div className="detail-section genres-large">
                                    <h3>Genres</h3>
                                    <div className="genre-chips">
                                        {show.genres.map((genre) => (
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
                                        <strong className="detail-fact-value">{show.releaseyear || '—'}</strong>
                                    </div>
                                    <div className="detail-fact">
                                        <span className="detail-fact-icon">🌐</span>
                                        <span className="detail-fact-label">Language</span>
                                        <strong className="detail-fact-value">{show.languagename || '—'}</strong>
                                    </div>
                                    <div className="detail-fact">
                                        <span className="detail-fact-icon">📺</span>
                                        <span className="detail-fact-label">Seasons</span>
                                        <strong className="detail-fact-value">{show.numberofseasons || 0}</strong>
                                    </div>
                                    <div className="detail-fact">
                                        <span className="detail-fact-icon">📡</span>
                                        <span className="detail-fact-label">Status</span>
                                        <strong className="detail-fact-value">{show.isongoing ? 'Ongoing' : 'Ended'}</strong>
                                    </div>
                                    <div className="detail-fact">
                                        <span className="detail-fact-icon">⭐</span>
                                        <span className="detail-fact-label">Rating</span>
                                        <strong className="detail-fact-value">
                                            {show.rating ? `⭐ ${show.rating}` : 'N/A'}
                                        </strong>
                                        <small>{show.ratingcount || 0} ratings</small>
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
                                    {show.description || 'No description available.'}
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

                            <div className="detail-section">
                                <h3>Episode Reviews</h3>
                                <p className="status">For TV series, users rate and review episodes. Season ratings are shown separately.</p>
                                <Link className="btn btn-primary btn-sm" to={`/tvshows/${id}/seasons`}>
                                    Go To Episode Reviews
                                </Link>
                            </div>
                        </div>
                    </div>

                    {show.seasons?.length > 0 && (
                        <div className="detail-section">
                            <div className="season-header-row">
                                <div className="season-picker">
                                    <span className="season-label">Select season</span>
                                    <div className="season-circles" role="tablist" aria-label="Select season">
                                        {show.seasons.map((season) => (
                                            <button
                                                key={season.seasonno}
                                                type="button"
                                                className={`season-circle ${selectedSeason?.seasonno === season.seasonno ? 'active' : ''}`}
                                                onClick={() => setSelectedSeasonNo(season.seasonno)}
                                                aria-pressed={selectedSeason?.seasonno === season.seasonno}
                                                title={`Season ${season.seasonno}`}
                                            >
                                                {season.seasonno}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {selectedSeason && (() => {
                                const seasonTrailerUrl = getYouTubeEmbedUrl(selectedSeason.trailerlink)
                                const episodeCount = selectedSeason.episodes?.length || selectedSeason.episodecount || 0
                                const totalDuration = selectedSeason.episodes?.reduce((sum, ep) => sum + (ep.duration || 0), 0) || 0
                                const avgDuration = episodeCount > 0 ? Math.round(totalDuration / episodeCount) : 0

                                return (
                                    <div className="season-panel">
                                        <div className="season-panel-header">
                                            <h4 className="season-panel-title">
                                                Season {selectedSeason.seasonno}{selectedSeason.seasontitle ? `: ${selectedSeason.seasontitle}` : ''}
                                            </h4>
                                            <div className="season-stats">
                                                {episodeCount > 0 && (
                                                    <span className="season-episodes">{episodeCount} Episodes</span>
                                                )}
                                                {avgDuration > 0 && (
                                                    <span className="season-duration">~{avgDuration} min/ep</span>
                                                )}
                                                <span className="season-rating">Global ⭐ {globalSeasonRating}</span>
                                            </div>
                                        </div>

                                        {selectedSeason.releasedate && (
                                            <p className="season-meta">Released: {new Date(selectedSeason.releasedate).toLocaleDateString()}</p>
                                        )}

                                        {selectedSeason.description && (
                                            <p className="season-desc">{selectedSeason.description}</p>
                                        )}

                                        {selectedSeason.trailerlink && (
                                            <div className="season-trailer">
                                                <a
                                                    className="btn btn-secondary btn-sm"
                                                    href={selectedSeason.trailerlink}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    Watch Season Trailer
                                                </a>
                                                {seasonTrailerUrl && (
                                                    <div className="trailer-frame-wrap">
                                                        <iframe
                                                            className="trailer-frame"
                                                            src={seasonTrailerUrl}
                                                            title={`Season ${selectedSeason.seasonno} trailer`}
                                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                            allowFullScreen
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="season-actions">
                                            <Link className="btn btn-primary btn-sm" to={`/tvshows/${id}/seasons`}>
                                                View episodes
                                            </Link>
                                            {show.seasons?.some(s => s.episodes?.length > 0) && (
                                                <button 
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => setShowRatingsModal(!showRatingsModal)}
                                                >
                                                    📊 {showRatingsModal ? 'Hide' : 'Show'} Episode Ratings
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })()}
                        </div>
                    )}

                    {showRatingsModal && show.seasons?.some(s => s.episodes?.length > 0) && (
                        <div className="detail-section">
                            <h3>Episode Ratings</h3>
                            
                            {/* Color Legend */}
                            <div className="ratings-legend">
                                <div className="ratings-legend-title">Rating Scale</div>
                                <div className="ratings-legend-items">
                                    <div className="ratings-legend-item">
                                        <div className="ratings-legend-box" style={{ backgroundColor: getColorForRating(7.5).bg }}></div>
                                        <span>Low 7.5-8.0</span>
                                    </div>
                                    <div className="ratings-legend-item">
                                        <div className="ratings-legend-box" style={{ backgroundColor: getColorForRating(8.35).bg }}></div>
                                        <span>Medium 8.0-8.7</span>
                                    </div>
                                    <div className="ratings-legend-item">
                                        <div className="ratings-legend-box" style={{ backgroundColor: getColorForRating(9.5).bg }}></div>
                                        <span>High 8.7-9.5</span>
                                    </div>
                                </div>
                            </div>

                            <div className="ratings-grid-container">
                                {(() => {
                                    // Filter seasons that have episodes
                                    const seasonsWithEpisodes = show.seasons.filter(s => s.episodes && s.episodes.length > 0)
                                    
                                    if (seasonsWithEpisodes.length === 0) {
                                        return <p style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>No episode ratings available.</p>
                                    }
                                    
                                    const maxEpisodes = Math.max(...seasonsWithEpisodes.map(s => s.episodes.length))
                                    
                                    return (
                                        <div className="ratings-grid">
                                            {/* Header row with season numbers */}
                                            <div className="ratings-grid-header">
                                                <div className="ratings-grid-cell ratings-grid-season-label"></div>
                                                {seasonsWithEpisodes.map((season) => (
                                                    <div key={season.seasonno} className="ratings-grid-cell ratings-grid-ep-header">
                                                        S{season.seasonno}
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            {/* Episode rows */}
                                            {Array.from({ length: maxEpisodes }, (_, episodeIndex) => (
                                                <div key={episodeIndex} className="ratings-grid-row">
                                                    <div className="ratings-grid-cell ratings-grid-season-label">
                                                        E{episodeIndex + 1}
                                                    </div>
                                                    {seasonsWithEpisodes.map((season) => {
                                                        const episode = season.episodes[episodeIndex]
                                                        if (!episode) {
                                                            return <div key={season.seasonno} className="ratings-grid-cell ratings-grid-empty"></div>
                                                        }
                                                        const rating = parseFloat(episode.avgrating) || 0
                                                        const { bg: bgColor, text: textColor } = getColorForRating(rating)
                                                        
                                                        return (
                                                            <div 
                                                                key={season.seasonno} 
                                                                className="ratings-grid-cell ratings-grid-rating"
                                                                style={{ 
                                                                    backgroundColor: bgColor,
                                                                    color: textColor
                                                                }}
                                                                title={`S${season.seasonno}E${episode.episodeno}: ${episode.episodetitle || 'Episode ' + episode.episodeno} - ${rating.toFixed(1)}`}
                                                            >
                                                                {rating > 0 ? rating.toFixed(1) : '—'}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                    )
                                })()}
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
                            <div className="studios-grid">
                                {show.studios.map((studio) => {
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

export default TVShowDetailsPage
