import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

const API_BASE = 'http://localhost:3000'
const POSTER_BASE = 'https://image.tmdb.org/t/p/w154' // Use smaller poster for list

const getPosterUrl = (posterPath) => {
    if (!posterPath) return null
    return `${POSTER_BASE}${posterPath}`
}

export default function MoviesPage() {
    const [searchParams, setSearchParams] = useSearchParams()
    
    const sort = searchParams.get('sort') || 'rating'
    const genre = searchParams.get('genre') || ''
    const year = searchParams.get('year') || ''
    const page = parseInt(searchParams.get('page') || '1', 10)
    
    const [movies, setMovies] = useState([])
    const [genresList, setGenresList] = useState([])
    const [loading, setLoading] = useState(true)
    const [totalPages, setTotalPages] = useState(1)

    const currentYear = new Date().getFullYear()
    const yearsList = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => currentYear - i)

    useEffect(() => {
        fetch(`${API_BASE}/genres?type=Movie`)
            .then(res => res.json())
            .then(data => setGenresList(data.data || []))
            .catch(() => {})
    }, [])

    useEffect(() => {
        setLoading(true)
        const params = new URLSearchParams()
        params.append('page', page.toString())
        params.append('limit', '20')
        params.append('sort', sort)
        if (genre) params.append('genre', genre)
        if (year) params.append('year', year)

        fetch(`${API_BASE}/movies?${params.toString()}`)
            .then(res => res.json())
            .then(data => {
                setMovies(data.data || [])
                setTotalPages(data.pagination?.pages || 1)
            })
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [sort, genre, year, page])

    const handleParamChange = (key, value) => {
        const newParams = new URLSearchParams(searchParams)
        if (value) {
            newParams.set(key, value)
        } else {
            newParams.delete(key)
        }
        if (key !== 'page') newParams.set('page', '1')
        setSearchParams(newParams)
    }

    return (
        <main className="page">
            <div className="domain-header">
                <h2>Movies</h2>
                <div className="domain-filters">
                    <div className="filter-group">
                        <select 
                            className="sleek-dropdown" 
                            value={genre} 
                            onChange={(e) => handleParamChange('genre', e.target.value)}
                        >
                            <option value="">All Genres</option>
                            {genresList.map(g => (
                                <option key={g.genreid} value={g.genrename}>{g.genrename}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <select 
                            className="sleek-dropdown" 
                            value={year} 
                            onChange={(e) => handleParamChange('year', e.target.value)}
                        >
                            <option value="">All Years</option>
                            {yearsList.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <select 
                            className="sleek-dropdown" 
                            value={sort} 
                            onChange={(e) => handleParamChange('sort', e.target.value)}
                        >
                            <option value="rating">Top Rated</option>
                            <option value="year">Release Year (Sort)</option>
                            <option value="title">Alphabetical</option>
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <p className="status">Loading movies...</p>
            ) : movies.length === 0 ? (
                <p className="status">No movies found.</p>
            ) : (
                <>
                    <div className="domain-list">
                        {movies.map((item, index) => {
                            const rank = (page - 1) * 20 + index + 1
                            return (
                                <Link
                                    className="domain-item"
                                    to={`/movies/${item.mediaid}`}
                                    key={item.mediaid}
                                >
                                    <span className={`domain-rank ${rank <= 3 ? `rank-${rank}` : ''}`}>#{rank}</span>
                                    {getPosterUrl(item.poster) ? (
                                        <img className="domain-poster" src={getPosterUrl(item.poster)} alt={item.title} loading="lazy" />
                                    ) : (
                                        <div className="domain-poster placeholder">No poster</div>
                                    )}
                                    <div className="domain-meta">
                                        <h4>{item.title}</h4>
                                        <p>{item.releaseyear || '—'} • ⭐ {item.rating || 'N/A'}</p>
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
