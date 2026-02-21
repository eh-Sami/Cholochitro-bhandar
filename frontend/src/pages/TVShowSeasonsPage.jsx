import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

const API_BASE = 'http://localhost:3000'
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500'

const getPosterUrl = (posterPath) => {
    if (!posterPath) return null
    return `${POSTER_BASE}${posterPath}`
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

    return (
        <main className="page">
            <Link className="back-link" to={`/tvshows/${id}`}>← Back to TV Show</Link>
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
                        {show.releaseyear || '—'} · {show.languagename || '—'}
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
                                                {selectedSeason.avgrating && (
                                                    <span className="season-rating">⭐ {selectedSeason.avgrating}</span>
                                                )}
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

                                        {selectedSeason.episodes?.length > 0 && (
                                            <div className="episodes-section">
                                                <h5 className="episodes-header">Episodes ({selectedSeason.episodes.length})</h5>
                                                <div className="episodes-list">
                                                    {selectedSeason.episodes.map((episode) => {
                                                        const episodeKey = `${selectedSeason.seasonno}-${episode.episodeno}`
                                                        const isOpen = openEpisodes.has(episodeKey)
                                                        return (
                                                            <div key={episode.episodeno} className="episode-item">
                                                                <button
                                                                    type="button"
                                                                    className="episode-toggle"
                                                                    onClick={() => toggleEpisode(episodeKey)}
                                                                    aria-expanded={isOpen}
                                                                >
                                                                    <span className="episode-number">EP {episode.episodeno}</span>
                                                                    <span className="episode-title">{episode.episodetitle || `Episode ${episode.episodeno}`}</span>
                                                                    <span className="episode-toggle-icon">{isOpen ? '-' : '+'}</span>
                                                                </button>
                                                                {isOpen && (
                                                                    <div className="episode-body">
                                                                        <div className="episode-meta">
                                                                            {episode.duration && (
                                                                                <span className="episode-duration">⏱️ {episode.duration} min</span>
                                                                            )}
                                                                            {episode.avgrating && (
                                                                                <span className="episode-rating">⭐ {episode.avgrating}</span>
                                                                            )}
                                                                        </div>
                                                                        <div className="episode-actions">
                                                                            <span className="episode-note">Reviews and ratings coming soon.</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
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
