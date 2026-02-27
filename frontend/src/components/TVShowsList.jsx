import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const API_BASE = 'http://localhost:3000'
const POSTER_BASE = 'https://image.tmdb.org/t/p/w342'

const getPosterUrl = (posterPath) => {
    if (!posterPath) return null
    return `${POSTER_BASE}${posterPath}`
}

function TVShowsList({
    sectionTitle = 'Trending TV Shows',
    limit = 12,
    queryParams = {},
    emptyMessage = 'No TV shows found.'
}) {
    const [shows, setShows] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const queryKey = JSON.stringify(queryParams)

    useEffect(() => {
        const fetchShows = async () => {
            try {
                const parsedQueryParams = JSON.parse(queryKey)
                const params = new URLSearchParams({
                    page: '1',
                    limit: String(limit),
                    ...parsedQueryParams
                })
                const response = await fetch(`${API_BASE}/tvshows?${params.toString()}`)
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
    }, [limit, queryKey])

    return (
        <section className="panel">
            {sectionTitle ? <h2>{sectionTitle}</h2> : null}

            {loading && <p className="status">Loading TV shows...</p>}
            {error && <p className="status error">{error}</p>}

            {!loading && !error && shows.length === 0 && (
                <p className="status">{emptyMessage}</p>
            )}

            {!loading && !error && shows.length > 0 && (
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
