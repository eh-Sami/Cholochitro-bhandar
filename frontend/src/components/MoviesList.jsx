import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const API_BASE = 'http://localhost:3000'
const POSTER_BASE = 'https://image.tmdb.org/t/p/w342'

const getPosterUrl = (posterPath) => {
    if (!posterPath) return null
    return `${POSTER_BASE}${posterPath}`
}

function MoviesList({
    sectionTitle = 'Now Playing',
    limit = 12,
    queryParams = {},
    emptyMessage = 'No movies found.'
}) {
    const [movies, setMovies] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const queryKey = JSON.stringify(queryParams)

    useEffect(() => {
        const fetchMovies = async () => {
            try {
                const params = new URLSearchParams({
                    page: '1',
                    limit: String(limit),
                    ...queryParams
                })
                const response = await fetch(`${API_BASE}/movies?${params.toString()}`)
                if (!response.ok) {
                    throw new Error('Failed to fetch movies')
                }
                const data = await response.json()
                setMovies(data.data || [])
            } catch (err) {
                setError(err.message || 'Something went wrong')
            } finally {
                setLoading(false)
            }
        }

        fetchMovies()
    }, [limit, queryKey])

    return (
        <section className="panel">
            {sectionTitle ? <h2>{sectionTitle}</h2> : null}

            {loading && <p className="status">Loading movies...</p>}
            {error && <p className="status error">{error}</p>}

            {!loading && !error && movies.length === 0 && (
                <p className="status">{emptyMessage}</p>
            )}

            {!loading && !error && movies.length > 0 && (
                <div className="grid">
                    {movies.map((movie) => (
                        <Link className="card-link" to={`/movies/${movie.mediaid}`} key={movie.mediaid}>
                            <article className="card">
                                {getPosterUrl(movie.poster) ? (
                                    <img
                                        className="poster"
                                        src={getPosterUrl(movie.poster)}
                                        alt={movie.title}
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="poster placeholder">No poster</div>
                                )}
                                <div className="card-body">
                                    <h3>{movie.title}</h3>
                                    <div className="meta">
                                        <span>{movie.releaseyear || '—'}</span>
                                        <span>⭐ {movie.rating || 'N/A'}</span>
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

export default MoviesList
