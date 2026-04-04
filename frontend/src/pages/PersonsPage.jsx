import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

const API_BASE = 'http://localhost:3000'
const PROFILE_BASE = 'https://image.tmdb.org/t/p/w154' // Use smaller profile for list

const getProfileUrl = (profilePath) => {
    if (!profilePath) return null
    return `${PROFILE_BASE}${profilePath}`
}

export default function PersonsPage() {
    const [searchParams, setSearchParams] = useSearchParams()
    
    // Celebrities page only has a default sorting for now
    const page = parseInt(searchParams.get('page') || '1', 10)
    
    const [persons, setPersons] = useState([])
    const [loading, setLoading] = useState(true)
    const [totalPages, setTotalPages] = useState(1)

    useEffect(() => {
        setLoading(true)
        
        fetch(`${API_BASE}/actors/top?limit=200`)
            .then(res => res.json())
            .then(data => {
                const allActors = data.data || []
                const limit = 20
                setTotalPages(Math.ceil(allActors.length / limit) || 1)
                
                const startIndex = (page - 1) * limit
                const sliced = allActors.slice(startIndex, startIndex + limit)
                setPersons(sliced)
            })
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [page])

    const handleParamChange = (key, value) => {
        const newParams = new URLSearchParams(searchParams)
        if (value) {
            newParams.set(key, value)
        } else {
            newParams.delete(key)
        }
        setSearchParams(newParams)
    }

    return (
        <main className="page">
            <div className="domain-header">
                <h2>Celebrities</h2>
                <div className="domain-filters">
                    <span style={{color: '#8b95a5', fontWeight: 500}}>Top Rated</span>
                </div>
            </div>

            {loading ? (
                <p className="status">Loading celebrities...</p>
            ) : persons.length === 0 ? (
                <p className="status">No celebrities found.</p>
            ) : (
                <>
                    <div className="domain-list">
                        {persons.map((actor, index) => {
                            const rank = (page - 1) * 20 + index + 1
                            return (
                                <Link
                                    className="domain-item"
                                    to={`/persons/${actor.personid}`}
                                    key={actor.personid}
                                >
                                    <span className={`domain-rank ${rank <= 3 ? `rank-${rank}` : ''}`}>#{rank}</span>
                                    {getProfileUrl(actor.picture) ? (
                                        <img className="domain-poster person-pic" src={getProfileUrl(actor.picture)} alt={actor.fullname} loading="lazy" />
                                    ) : (
                                        <div className="domain-poster person-pic placeholder">No photo</div>
                                    )}
                                    <div className="domain-meta">
                                        <h4>{actor.fullname}</h4>
                                        <p>{actor.title_count} titles • Avg rating: {actor.avg_rating || 'N/A'}</p>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>

                    {totalPages > 1 && (
                        <div className="domain-pagination">
                            <button className="nav-btn auth-btn" disabled={page <= 1} onClick={() => handleParamChange('page', (page - 1).toString())}>Prev</button>
                            <span className="page-indicator">Page {page} of {totalPages}</span>
                            <button className="nav-btn auth-btn" disabled={page >= totalPages} onClick={() => handleParamChange('page', (page + 1).toString())}>Next</button>
                        </div>
                    )}
                </>
            )}
        </main>
    )
}
