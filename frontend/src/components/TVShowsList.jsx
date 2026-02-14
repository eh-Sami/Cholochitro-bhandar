import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const API_BASE = 'http://localhost:3000'
const POSTER_BASE = 'https://image.tmdb.org/t/p/w342'

const getPosterUrl = (posterPath) => {
    if (!posterPath) return null
    return `${POSTER_BASE}${posterPath}`
}

function TVShowsList() {
    const [shows, setShows] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchShows = async () => {
            try {
                const response = await fetch(`${API_BASE}/tvshows?page=1&limit=12`)
                if (!response.ok) {
                    throw new Error('Failed to fetch TV shows')
                }
                const data = await response.json()
                setShows(data.data || [])
            } catch (err) {
                setError(err.message || 'Something went wrong')
            } finally {
                setLoading(false)
            }
        }

        fetchShows()
    }, [])

    return (
        <section className="panel">
            <h2>Trending TV Shows</h2>

            {loading && <p className="status">Loading TV shows...</p>}
            {error && <p className="status error">{error}</p>}

            {!loading && !error && (
                <div className="grid">
                    {shows.map((show) => (
                        <Link className="card-link" to={`/tvshows/${show.mediaid}`} key={show.mediaid}>
                            <article className="card">
                                {getPosterUrl(show.poster) ? (
                                    <img
                                        className="poster"
                                        src={getPosterUrl(show.poster)}
                                        alt={show.title}
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="poster placeholder">No poster</div>
                                )}
                                <div className="card-body">
                                    <h3>{show.title}</h3>
                                    <div className="meta">
                                        <span>{show.releaseyear || '—'}</span>
                                        <span>⭐ {show.rating || 'N/A'}</span>
                                    </div>
                                </div>
                            </article>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    )
}

export default TVShowsList
