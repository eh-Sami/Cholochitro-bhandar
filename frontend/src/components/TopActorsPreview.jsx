import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const API_BASE = 'http://localhost:3000'
const PROFILE_BASE = 'https://image.tmdb.org/t/p/w185'

const getProfileUrl = (profilePath) => {
    if (!profilePath) return null
    return `${PROFILE_BASE}${profilePath}`
}

function TopActorsPreview({ limit = 8 }) {
    const [actors, setActors] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchActors = async () => {
            try {
                const response = await fetch(`${API_BASE}/actors/top?limit=${limit}`)
                if (!response.ok) {
                    throw new Error('Failed to fetch top actors')
                }
                const data = await response.json()
                setActors(data.data || [])
            } catch (err) {
                setError(err.message || 'Something went wrong')
            } finally {
                setLoading(false)
            }
        }

        fetchActors()
    }, [limit])

    return (
        <section className="panel">
            <h3>Top Actors Right Now</h3>

            {loading && <p className="status">Loading top actors...</p>}
            {error && <p className="status error">{error}</p>}

            {!loading && !error && actors.length === 0 && (
                <p className="status">No actor data available.</p>
            )}

            {!loading && !error && actors.length > 0 && (
                <div className="actor-grid">
                    {actors.map((actor) => (
                        <Link
                            className="actor-card"
                            to={`/persons/${actor.personid}`}
                            key={actor.personid}
                        >
                            {getProfileUrl(actor.picture) ? (
                                <img
                                    className="actor-pic"
                                    src={getProfileUrl(actor.picture)}
                                    alt={actor.fullname}
                                    loading="lazy"
                                />
                            ) : (
                                <div className="actor-pic placeholder">No photo</div>
                            )}
                            <h4>{actor.fullname}</h4>
                            <p>{actor.title_count} titles</p>
                            <span>Avg rating: {actor.avg_rating || 'N/A'}</span>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    )
}

export default TopActorsPreview
