import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BarChart3, CalendarDays, Star } from 'lucide-react'
import EpisodeReviewsSection from '../components/EpisodeReviewsSection'

const API_BASE = 'http://localhost:3000'
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500'
const STILL_BASE = 'https://image.tmdb.org/t/p/w300'

const getPosterUrl = (posterPath) => {
    if (!posterPath) return null
    return `${POSTER_BASE}${posterPath}`
}

const getStillUrl = (stillPath) => {
    if (!stillPath) return null
    return `${STILL_BASE}${stillPath}`
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

function TVShowSeasonsPage() {
    const { id } = useParams()
    const [show, setShow] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [selectedSeasonNo, setSelectedSeasonNo] = useState(null)
    const [openEpisodes, setOpenEpisodes] = useState(new Set())
    const [showEpisodeRatings, setShowEpisodeRatings] = useState(false)

    const toggleEpisode = (episodeKey) => {
        setOpenEpisodes((prev) => {
            const next = new Set(prev)
            if (next.has(episodeKey)) {
                next.delete(episodeKey)
            } else {
                next.add(episodeKey)
            }
            return next
        })
    }

    useEffect(() => {
        const fetchSeasons = async () => {
            try {
                const response = await fetch(`${API_BASE}/tvshows/${id}/seasons`)
                if (!response.ok) {
                    throw new Error('Failed to fetch season details')
                }
                const data = await response.json()
                setShow(data.data || null)
            } catch (err) {
                setError(err.message || 'Something went wrong')
            } finally {
                setLoading(false)
            }
        }

        fetchSeasons()
    }, [id])

    useEffect(() => {
        if (show?.seasons?.length && selectedSeasonNo === null) {
            setSelectedSeasonNo(show.seasons[0].seasonno)
        }
    }, [show, selectedSeasonNo])

    if (loading) {
        return <p className="status">Loading seasons...</p>
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
            <Link className="back-link" to={`/tvshows/${id}`}>TV Show</Link>
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
                    <h2>{show.title} Seasons & Episodes</h2>
                    <p className="detail-meta">
                        {show.releaseyear || '—'}
                    </p>

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
                                    <div className="tvs-season-card">
                                        <div className="tvs-season-head">
                                            <h4 className="tvs-season-title">
                                                Season {selectedSeason.seasonno}{selectedSeason.seasontitle ? `: ${selectedSeason.seasontitle}` : ''}
                                            </h4>

                                            {selectedSeason.releasedate && (
                                                <span className="tvs-season-release-badge">
                                                    <CalendarDays size={14} aria-hidden="true" />
                                                    Released {new Date(selectedSeason.releasedate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                                                </span>
                                            )}
                                        </div>

                                        <div className="tvs-season-badges">
                                                {episodeCount > 0 && (
                                                    <span className="tvs-meta-badge">{episodeCount} Episodes</span>
                                                )}
                                                {avgDuration > 0 && (
                                                    <span className="tvs-meta-badge">~{avgDuration} min/ep</span>
                                                )}
                                                <span className="tvs-meta-badge tvs-rating-badge">
                                                    <Star size={13} aria-hidden="true" />
                                                    Rating {globalSeasonRating}
                                                </span>
                                        </div>

                                        {selectedSeason.description && (
                                            <p className="tvs-season-desc">{selectedSeason.description}</p>
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

                                        <div className="tvs-season-actions">
                                            <Link className="tvs-btn tvs-btn-primary" to={`/tvshows/${id}/seasons`}>
                                                View Episodes
                                            </Link>
                                            <button
                                                type="button"
                                                className="tvs-btn tvs-btn-secondary"
                                                onClick={() => setShowEpisodeRatings((prev) => !prev)}
                                            >
                                                <BarChart3 size={16} aria-hidden="true" />
                                                {showEpisodeRatings ? 'Hide Episode Ratings' : 'Show Episode Ratings'}
                                            </button>
                                        </div>

                                        {selectedSeason.episodes?.length > 0 && (
                                            <div className="episodes-section tvs-episodes">
                                                <h5 className="episodes-header">Episodes ({selectedSeason.episodes.length})</h5>
                                                <div className="episodes-list">
                                                    {selectedSeason.episodes.map((episode) => {
                                                        const episodeKey = `${selectedSeason.seasonno}-${episode.episodeno}`
                                                        const isOpen = openEpisodes.has(episodeKey)
                                                        return (
                                                            <article key={episode.episodeno} className={`episode-item tvs-episode-item ${isOpen ? 'open' : ''}`}>
                                                                <button
                                                                    type="button"
                                                                    className="episode-header"
                                                                    onClick={() => toggleEpisode(episodeKey)}
                                                                    aria-expanded={isOpen}
                                                                >
                                                                    <div className="header-left">
                                                                        <span className="episode-number badge-accent">EP {episode.episodeno}</span>
                                                                        <span className="episode-title">{episode.episodetitle || `Episode ${episode.episodeno}`}</span>
                                                                    </div>

                                                                    <div className="header-right">
                                                                        {episode.duration && <span className="episode-duration-pill">{episode.duration} min</span>}
                                                                        <span className={`episode-toggle-icon ${isOpen ? 'open' : ''}`}>
                                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                                <polyline points="6 9 12 15 18 9"></polyline>
                                                                            </svg>
                                                                        </span>
                                                                    </div>
                                                                </button>

                                                                {isOpen && (
                                                                    <div className="episode-body">
                                                                        <div className="episode-content">
                                                                            <div className="left-column">
                                                                                {episode.stillpath && (
                                                                                    <div className="episode-image-wrapper">
                                                                                        <img 
                                                                                            className="episode-image" 
                                                                                            src={getStillUrl(episode.stillpath)} 
                                                                                            alt={episode.episodetitle || `Episode ${episode.episodeno}`}
                                                                                        />
                                                                                    </div>
                                                                                )}

                                                                                {episode.description && (
                                                                                    <p className="episode-description">{episode.description}</p>
                                                                                )}
                                                                            </div>

                                                                            <div className="right-column">
                                                                                <div className="episode-actions">
                                                                                    <EpisodeReviewsSection
                                                                                        mediaId={id}
                                                                                        seasonNo={selectedSeason.seasonno}
                                                                                        episodeNo={episode.episodeno}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </article>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })()}
                        </div>
                    )}
                </div>
            </div>
        </main>
    )
}

export default TVShowSeasonsPage
