import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

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
    const [searchParams, setSearchParams] = useSearchParams()
    
    // State reflects current form input
    const [query, setQuery] = useState(searchParams.get('q') || '')
    const [searchType, setSearchType] = useState(searchParams.get('type') || 'all') // 'all', 'movies', 'tvshows', 'people'
    
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // URL params drive the API fetch
    useEffect(() => {
        const urlQ = searchParams.get('q')
        const urlType = searchParams.get('type') || 'all'
        
        // Sync state from URL
        setQuery(urlQ || '')
        setSearchType(urlType)

        if (!urlQ?.trim()) {
            setResults([])
            return
        }

        const fetchResults = async () => {
            setLoading(true)
            setError('')

            try {
                let fetchedResults = []
                const searchQ = encodeURIComponent(urlQ.trim())
                
                if (urlType === 'people') {
                    const res = await fetch(`${API_BASE}/persons/search?q=${searchQ}&page=1&limit=12`)
                    if(res.ok) fetchedResults = (await res.json()).data || []
                } else if (urlType === 'movies' || urlType === 'tvshows') {
                    const res = await fetch(`${API_BASE}/search?q=${searchQ}&page=1&limit=12`)
                    if(res.ok) {
                        let data = (await res.json()).data || []
                        if (urlType === 'movies') data = data.filter(r => r.mediatype === 'Movie')
                        if (urlType === 'tvshows') data = data.filter(r => r.mediatype === 'TVSeries')
                        fetchedResults = data
                    }
                } else {
                    // urlType === 'all'
                    const [resMedia, resPeople] = await Promise.all([
                        fetch(`${API_BASE}/search?q=${searchQ}&page=1&limit=12`),
                        fetch(`${API_BASE}/persons/search?q=${searchQ}&page=1&limit=12`)
                    ])
                    let mediaData = [], peopleData = []
                    if(resMedia.ok) mediaData = (await resMedia.json()).data || []
                    if(resPeople.ok) peopleData = (await resPeople.json()).data || []
                    fetchedResults = [...mediaData, ...peopleData]
                }

                setResults(fetchedResults)
            } catch (err) {
                setError(err.message || 'Something went wrong')
            } finally {
                setLoading(false)
            }
        }

        fetchResults()
    }, [searchParams])

    const handleSearch = (event) => {
        event.preventDefault()
        if (query.trim()) {
            setSearchParams({ q: query, type: searchType })
        }
    }

    return (
        <main className="page">
            <h2 style={{ marginBottom: '1.5rem' }}>Search Results</h2>

            {loading && <p className="status">Searching...</p>}
            {error && <p className="status error">{error}</p>}

            {!loading && !error && results.length > 0 && (
                <div className="grid">
                    {results.map((item, index) => {
                        if (item.fullname !== undefined) {
                            return (
                                <Link
                                    className="card-link"
                                    to={`/persons/${item.personid}`}
                                    key={`person-${item.personid}-${index}`}
                                >
                                    <article className="card">
                                        {getProfileUrl(item.picture) ? (
                                            <img
                                                className="poster"
                                                src={getProfileUrl(item.picture)}
                                                alt={item.fullname}
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="poster placeholder">No photo</div>
                                        )}
                                        <div className="card-body">
                                            <h3>{item.fullname}</h3>
                                            <div className="meta">
                                                <span>Celebrity</span>
                                            </div>
                                        </div>
                                    </article>
                                </Link>
                            )
                        } else {
                            const basePath = item.mediatype === 'TVSeries' ? '/tvshows' : '/movies'
                            return (
                                <Link
                                    className="card-link"
                                    to={`${basePath}/${item.mediaid}`}
                                    key={`media-${item.mediaid}-${index}`}
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
                        }
                    })}
                </div>
            )}

            {!loading && !error && results.length === 0 && query && (
                <p className="status">No results found for "{query}"</p>
            )}
        </main>
    )
}

export default SearchPage
