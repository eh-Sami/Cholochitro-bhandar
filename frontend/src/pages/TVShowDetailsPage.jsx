import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

const API_BASE = 'http://localhost:3000'
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500'

const getPosterUrl = (posterPath) => {
    if (!posterPath) return null
    return `${POSTER_BASE}${posterPath}`
}

function TVShowDetailsPage() {
    const { id } = useParams()
    const [show, setShow] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchShow = async () => {
            try {
                const response = await fetch(`${API_BASE}/tvshows/${id}`)
                if (!response.ok) {
                    throw new Error('Failed to fetch TV show details')
                }
                const data = await response.json()
                setShow(data.data || null)
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
                        {show.releaseyear || '—'} · {show.languagename || '—'} · ⭐ {show.rating || 'N/A'}
                    </p>
                    <p className="detail-desc">{show.description || 'No description available.'}</p>

                    <div className="detail-section">
                        <h3>Status</h3>
                        <p>{show.isongoing ? 'Ongoing' : 'Ended'}</p>
                        <p>Seasons: {show.numberofseasons || 0}</p>
                    </div>

                    {show.genres?.length > 0 && (
                        <div className="detail-section">
                            <h3>Genres</h3>
                            <p>{show.genres.map((g) => g.genrename).join(', ')}</p>
                        </div>
                    )}

                    {show.cast?.length > 0 && (
                        <div className="detail-section">
                            <h3>Cast</h3>
                            <ul>
                                {show.cast.map((person) => (
                                    <li key={person.personid}>
                                        {person.fullname}
                                        {person.charactername ? ` as ${person.charactername}` : ''}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {show.crew?.length > 0 && (
                        <div className="detail-section">
                            <h3>Crew</h3>
                            <ul>
                                {show.crew.map((person) => (
                                    <li key={`${person.personid}-${person.crewrole}`}>
                                        {person.fullname} · {person.crewrole}
                                    </li>
                                ))}
                            </ul>
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
