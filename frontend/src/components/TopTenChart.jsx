import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const API_BASE = 'http://localhost:3000'
const POSTER_BASE = 'https://image.tmdb.org/t/p/w154'

const getPosterUrl = (posterPath) => {
    if (!posterPath) return null
    return `${POSTER_BASE}${posterPath}`
}

function TopTenChart({
    mediaType = 'movies',
    title = 'Top 10 Chart',
    maxItems = 10,
    perPage = 10
}) {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [page, setPage] = useState(1)
    const [totalAvailable, setTotalAvailable] = useState(null)

    const effectiveTotal = totalAvailable === null
        ? maxItems
        : Math.min(maxItems, totalAvailable)
    const totalPages = Math.max(1, Math.ceil(effectiveTotal / perPage))

    useEffect(() => {
        const fetchTop = async () => {
            setLoading(true)
            setError('')
            try {
                const endpoint = mediaType === 'movies' ? '/movies' : '/tvshows'
                const response = await fetch(`${API_BASE}${endpoint}?sort=rating&limit=${perPage}&page=${page}`)
                if (!response.ok) {
                    throw new Error('Failed to load chart')
                }
                const data = await response.json()
                setItems(data.data || [])
                const apiTotal = data?.pagination?.total
                if (typeof apiTotal === 'number') {
                    setTotalAvailable(apiTotal)
                } else {
                    setTotalAvailable(null)
                }
            } catch (err) {
                setError(err.message || 'Something went wrong')
            } finally {
                setLoading(false)
            }
        }

        fetchTop()
    }, [mediaType, page, perPage])

    useEffect(() => {
        setPage(1)
        setTotalAvailable(null)
    }, [mediaType, maxItems, perPage])

    useEffect(() => {
        if (totalAvailable !== null && page > totalPages) {
            setPage(totalPages)
        }
    }, [totalAvailable, page, totalPages])

    const goToPage = (nextPage) => {
        if (nextPage < 1 || nextPage > totalPages) return
        setPage(nextPage)
    }

    return (
        <section className="panel">
            <div className="chart-head">
                <h3>{title}</h3>
            </div>

            {loading && <p className="status">Loading chart...</p>}
            {error && <p className="status error">{error}</p>}

            {!loading && !error && items.length > 0 && (
                <div className="chart-list">
                    {items.map((item, index) => {
                        const rank = (page - 1) * perPage + index + 1
                        if (rank > maxItems) return null
                        const detailPath = mediaType === 'movies' ? `/movies/${item.mediaid}` : `/tvshows/${item.mediaid}`
                        return (
                            <Link className="chart-item" to={detailPath} key={item.mediaid}>
                                <span className={`chart-rank rank-${rank}`}>#{rank}</span>
                                {getPosterUrl(item.poster) ? (
                                    <img
                                        className="chart-poster"
                                        src={getPosterUrl(item.poster)}
                                        alt={item.title}
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="chart-poster placeholder">No poster</div>
                                )}
                                <div className="chart-meta">
                                    <h4>{item.title}</h4>
                                    <p>{item.releaseyear || '—'} • ⭐ {item.rating || 'N/A'}</p>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}

            {!loading && !error && items.length === 0 && (
                <p className="status">No ranked titles available for this page.</p>
            )}

            {!loading && !error && totalPages > 1 && (
                <div className="chart-pagination">
                    <button
                        type="button"
                        onClick={() => goToPage(page - 1)}
                        disabled={page === 1}
                    >
                        Prev
                    </button>
                    <span>Page {page} of {totalPages}</span>
                    <button
                        type="button"
                        onClick={() => goToPage(page + 1)}
                        disabled={page === totalPages}
                    >
                        Next
                    </button>
                </div>
            )}
        </section>
    )
}

export default TopTenChart
