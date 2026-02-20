import { useState } from 'react'
import { Link } from 'react-router-dom'

const API_BASE = 'http://localhost:3000'
const POSTER_BASE = 'https://image.tmdb.org/t/p/w342'
const PROFILE_BASE = 'https://image.tmdb.org/t/p/w185'

const getPosterUrl = (posterPath) => {
    if (!posterPath) return null
    return `${POSTER_BASE}${posterPath}`
}

const getProfileUrl = (profilePath) => {
    if (!profilePath) return null
    return `${PROFILE_BASE}${profilePath}`
}

function SearchPage() {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [searchType, setSearchType] = useState('all') // 'all', 'movies', 'tvshows', 'people'

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
            let endpoint = `${API_BASE}/search?q=${encodeURIComponent(trimmed)}&page=1&limit=12`
            
            if (searchType === 'people') {
                endpoint = `${API_BASE}/persons/search?q=${encodeURIComponent(trimmed)}&page=1&limit=12`
            }

            const response = await fetch(endpoint)
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
                    placeholder={
                        searchType === 'people'
                            ? 'Search actors, directors, crew...'
                            : 'Search movies or TV shows...'
                    }
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                />
                <button type="submit">Search</button>
            </form>

            <div className="search-filters">
                <button
                    className={`filter-btn ${searchType === 'all' ? 'active' : ''}`}
                    onClick={() => setSearchType('all')}
                >
                    All
                </button>
                <button
                    className={`filter-btn ${searchType === 'movies' ? 'active' : ''}`}
                    onClick={() => setSearchType('movies')}
                >
                    Movies
                </button>
                <button
                    className={`filter-btn ${searchType === 'tvshows' ? 'active' : ''}`}
                    onClick={() => setSearchType('tvshows')}
                >
                    TV Shows
                </button>
                <button
                    className={`filter-btn ${searchType === 'people' ? 'active' : ''}`}
                    onClick={() => setSearchType('people')}
                >
                    People
                </button>
            </div>

            {loading && <p className="status">Searching...</p>}
            {error && <p className="status error">{error}</p>}

            {!loading && !error && results.length > 0 && (
                <div className={searchType === 'people' ? 'people-grid' : 'grid'}>
                    {searchType === 'people' ? (
                        // Person search results
                        results.map((person) => (
                            <Link
                                className="person-card-link"
                                to={`/persons/${person.personid}`}
                                key={person.personid}
                            >
                                <article className="person-card">
                                    {getProfileUrl(person.picture) ? (
                                        <img
                                            className="person-avatar"
                                            src={getProfileUrl(person.picture)}
                                            alt={person.fullname}
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="person-avatar placeholder">No photo</div>
                                    )}
                                    <div className="person-card-body">
                                        <h3>{person.fullname}</h3>
                                        <p className="title-count">
                                            {person.title_count || 0} {person.title_count === 1 ? 'title' : 'titles'}
                                        </p>
                                    </div>
                                </article>
                            </Link>
                        ))
                    ) : (
                        // Movie/TV show search results
                        results.map((item) => {
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
                        })
                    )}
                </div>
            )}

            {!loading && !error && results.length === 0 && query && (
                <p className="status">No results found for "{query}"</p>
            )}
        </main>
    )
}

export default SearchPage
