import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const API_BASE = 'http://localhost:3000'
const PROFILE_BASE = 'https://image.tmdb.org/t/p/w342'

const getProfileUrl = (profilePath) => {
    if (!profilePath) return null
    return `${PROFILE_BASE}${profilePath}`
}

function TopActorsPage() {
    const [actors, setActors] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [page, setPage] = useState(1)
    const [pagination, setPagination] = useState(null)
    const limit = 20

    useEffect(() => {
        const fetchTopActors = async () => {
            try {
                setLoading(true)
                const response = await fetch(`${API_BASE}/actors/top?page=${page}&limit=${limit}`)
                if (!response.ok) {
                    throw new Error('Failed to fetch top actors')
                }
                const data = await response.json()
                setActors(data.data || [])
                setPagination(data.pagination)
                setError('')
            } catch (err) {
                setError(err.message || 'Something went wrong')
                setActors([])
            } finally {
                setLoading(false)
            }
        }

        fetchTopActors()
    }, [page])

    const handlePrevPage = () => {
        if (page > 1) setPage(page - 1)
    }

    const handleNextPage = () => {
        if (pagination && page < pagination.pages) setPage(page + 1)
    }

    return (
        <main className="page">
            <h2>Top 200 Actors</h2>

            {loading && <p className="status">Loading top actors...</p>}
            {error && <p className="status error">{error}</p>}

            {!loading && !error && (
                <>
                    <section className="panel">
                        {actors.length > 0 ? (
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
                                        {actor.avg_rating && (
                                            <span>⭐ {actor.avg_rating}</span>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p>No actors found.</p>
                        )}
                    </section>

                    {pagination && (
                        <div className="pagination">
                            <button 
                                onClick={handlePrevPage}
                                disabled={page === 1}
                                className="pagination-btn"
                            >
                                ← Previous
                            </button>
                            <span className="pagination-info">
                                Page {pagination.page} of {pagination.pages} 
                                ({pagination.total} actors total)
                            </span>
                            <button 
                                onClick={handleNextPage}
                                disabled={page === pagination.pages}
                                className="pagination-btn"
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </>
            )}
        </main>
    )
}

export default TopActorsPage


