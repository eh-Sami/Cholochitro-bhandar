import { useState } from 'react'
import { Link } from 'react-router-dom'

const API_BASE = 'http://localhost:3000'
const POSTER_BASE = 'https://image.tmdb.org/t/p/w342'

const getPosterUrl = (posterPath) => {
    if (!posterPath) return null
    return `${POSTER_BASE}${posterPath}`
}

function SearchPage() {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSearch = async (event) => {
        event.preventDefault()
        const trimmed = query.trim()
        if (!trimmed) {
            setError('Please enter a search term')
            setResults([])
            return
        }

        setLoading(true)
        setError('')

        try {
            const response = await fetch(
                `${API_BASE}/search?q=${encodeURIComponent(trimmed)}&page=1&limit=12`
            )
            if (!response.ok) {
                throw new Error('Search failed')
            }
            const data = await response.json()
            setResults(data.data || [])
        } catch (err) {
            setError(err.message || 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="page">
            <h2>Search</h2>
            <form className="search-bar" onSubmit={handleSearch}>
                <input
                    type="text"
                    placeholder="Search movies or TV shows..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                />
                <button type="submit">Search</button>
            </form>

            {loading && <p className="status">Searching...</p>}
            {error && <p className="status error">{error}</p>}

            {!loading && !error && results.length > 0 && (
                <div className="grid">
                    {results.map((item) => {
                        const basePath = item.mediatype === 'TVSeries' ? '/tvshows' : '/movies'
                        return (
                            <Link
                                className="card-link"
                                to={`${basePath}/${item.mediaid}`}
                                key={`${item.mediatype}-${item.mediaid}`}
                            >
                                <article className="card">
                                    {getPosterUrl(item.poster) ? (
                                        <img
                                            className="poster"
                                            src={getPosterUrl(item.poster)}
                                            alt={item.title}
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="poster placeholder">No poster</div>
                                    )}
                                    <div className="card-body">
                                        <h3>{item.title}</h3>
                                        <div className="meta">
                                            <span>{item.releaseyear || '—'}</span>
                                            <span>{item.mediatype}</span>
                                        </div>
                                    </div>
                                </article>
                            </Link>
                        )
                    })}
                </div>
            )}
        </main>
    )
}

export default SearchPage
