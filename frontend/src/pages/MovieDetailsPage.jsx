import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

const API_BASE = 'http://localhost:3000'
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500'

const getPosterUrl = (posterPath) => {
    if (!posterPath) return null
    return `${POSTER_BASE}${posterPath}`
}

function MovieDetailsPage() {
    const { id } = useParams()
    const [movie, setMovie] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchMovie = async () => {
            try {
                const response = await fetch(`${API_BASE}/movies/${id}`)
                if (!response.ok) {
                    throw new Error('Failed to fetch movie details')
                }
                const data = await response.json()
                setMovie(data.data || null)
            } catch (err) {
                setError(err.message || 'Something went wrong')
            } finally {
                setLoading(false)
            }
        }

        fetchMovie()
    }, [id])

    if (loading) {
        return <p className="status">Loading movie...</p>
    }

    if (error) {
        return <p className="status error">{error}</p>
    }

    if (!movie) {
        return <p className="status">Movie not found.</p>
    }

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
                    <p className="detail-meta">
                        {movie.releaseyear || '—'} · {movie.languagename || '—'} · ⭐ {movie.rating || 'N/A'}
                    </p>
                    <p className="detail-desc">{movie.description || 'No description available.'}</p>

                    {movie.genres?.length > 0 && (
                        <div className="detail-section">
                            <h3>Genres</h3>
                            <p>{movie.genres.map((g) => g.genrename).join(', ')}</p>
                        </div>
                    )}

                    {movie.cast?.length > 0 && (
                        <div className="detail-section">
                            <h3>Cast</h3>
                            <ul>
                                {movie.cast.map((person) => (
                                    <li key={person.personid}>
                                        {person.fullname}
                                        {person.charactername ? ` as ${person.charactername}` : ''}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {movie.crew?.length > 0 && (
                        <div className="detail-section">
                            <h3>Crew</h3>
                            <ul>
                                {movie.crew.map((person) => (
                                    <li key={`${person.personid}-${person.crewrole}`}>
                                        {person.fullname} · {person.crewrole}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {movie.studios?.length > 0 && (
                        <div className="detail-section">
                            <h3>Studios</h3>
                            <p>{movie.studios.map((s) => s.studioname).join(', ')}</p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    )
}

export default MovieDetailsPage
