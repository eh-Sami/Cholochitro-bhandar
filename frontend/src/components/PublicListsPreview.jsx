import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const API_BASE = 'http://localhost:3000'

function PublicListsPreview({ limit = 6 }) {
    const [lists, setLists] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const loadPublicLists = async () => {
            try {
                const response = await fetch(`${API_BASE}/lists?page=1&limit=${limit}`)
                const data = await response.json()

                if (!response.ok || !data.success) {
                    throw new Error(data.error || 'Failed to fetch public lists')
                }

                const onlyPublic = (data.data || []).filter((item) => item.ispublic)
                setLists(onlyPublic)
            } catch (err) {
                setError(err.message || 'Failed to fetch public lists')
            } finally {
                setLoading(false)
            }
        }

        loadPublicLists()
    }, [limit])

    return (
        <section className="panel">
            <div className="section-head">
                <h3>Public Lists</h3>
                <Link to="/lists">View all</Link>
            </div>

            {loading && <p className="status">Loading public lists...</p>}
            {error && <p className="status error">{error}</p>}

            {!loading && !error && lists.length === 0 && (
                <p className="status">No public lists yet.</p>
            )}

            {!loading && !error && lists.length > 0 && (
                <div className="lists-grid">
                    {lists.map((list) => (
                        <Link key={list.listid} className="card-link" to={`/lists/${list.listid}`}>
                            <article className="card list-card">
                                <div className="card-body">
                                    <h3>{list.listname}</h3>
                                    <p className="meta">
                                        <span>{list.creator}</span>
                                        <span className="list-badge public">Public</span>
                                    </p>
                                    <p>{list.itemcount || 0} items</p>
                                </div>
                            </article>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    )
}

export default PublicListsPreview
