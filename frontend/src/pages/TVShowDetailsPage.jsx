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

function TVShowDetailsPage() {
    const { id } = useParams()
    const [show, setShow] = useState(null)
    const [rank, setRank] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [selectedSeasonNo, setSelectedSeasonNo] = useState(null)

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
                                        <strong className="detail-fact-value">{show.rating ? `⭐ ${show.rating}` : 'N/A'}</strong>
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
                                        <Link className="btn btn-primary btn-sm" to={`/tvshows/${id}/seasons`}>
                                            View episodes
                                        </Link>
                                    </div>
                                )
                            })()}
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
