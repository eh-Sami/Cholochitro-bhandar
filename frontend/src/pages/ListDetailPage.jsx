import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getAuthToken, getStoredAuth } from '../utils/auth'

const API_BASE = 'http://localhost:3000'

function ListDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = getStoredAuth()
    const token = getAuthToken()

    const [list, setList] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [newName, setNewName] = useState('')
    const [newVisibility, setNewVisibility] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [searching, setSearching] = useState(false)
    const [saving, setSaving] = useState(false)

    const loadList = useCallback(async () => {
        setLoading(true)
        setError('')

        try {
            const headers = token ? { Authorization: `Bearer ${token}` } : {}
            const response = await fetch(`${API_BASE}/lists/${id}`, { headers })
            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to fetch list')
            }

            setList(data.data)
            setNewName(data.data.listname)
            setNewVisibility(Boolean(data.data.ispublic))
        } catch (err) {
            setError(err.message || 'Failed to fetch list')
        } finally {
            setLoading(false)
        }
    }, [id, token])

    useEffect(() => {
        loadList()
    }, [loadList])

    const isOwner = list && user && Number(list.userid) === Number(user.userId)

    const handleUpdateList = async (event) => {
        event.preventDefault()
        if (!token || !isOwner) return

        setSaving(true)
        setError('')

        try {
            const response = await fetch(`${API_BASE}/lists/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    listName: newName,
                    isPublic: newVisibility
                })
            })

            const data = await response.json()
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to update list')
            }

            await loadList()
        } catch (err) {
            setError(err.message || 'Failed to update list')
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteList = async () => {
        if (!token || !isOwner) return
        if (!window.confirm('Delete this list?')) return

        setSaving(true)
        setError('')

        try {
            const response = await fetch(`${API_BASE}/lists/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            const data = await response.json()
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to delete list')
            }

            navigate('/lists')
        } catch (err) {
            setError(err.message || 'Failed to delete list')
        } finally {
            setSaving(false)
        }
    }

    const addItemByMediaId = async (mediaId) => {
        if (!token || !isOwner) return

        setSaving(true)
        setError('')

        try {
            const response = await fetch(`${API_BASE}/lists/${id}/items`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ mediaId })
            })

            const data = await response.json()
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to add item')
            }

            setSearchResults((prev) => prev.filter((item) => Number(item.mediaid) !== Number(mediaId)))
            await loadList()
        } catch (err) {
            setError(err.message || 'Failed to add item')
        } finally {
            setSaving(false)
        }
    }

    const handleSearchMedia = async (event) => {
        event.preventDefault()
        const query = searchQuery.trim()

        if (!query) {
            setSearchResults([])
            return
        }

        setSearching(true)
        setError('')

        try {
            const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}&limit=10&page=1&titleOnly=true`)
            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to search media')
            }

            const existingIds = new Set((list?.items || []).map((item) => Number(item.mediaid)))
            const filtered = (data.data || []).filter((item) => !existingIds.has(Number(item.mediaid)))
            setSearchResults(filtered)
        } catch (err) {
            setError(err.message || 'Failed to search media')
        } finally {
            setSearching(false)
        }
    }

    const handleRemoveItem = async (mediaId) => {
        if (!token || !isOwner) return

        setSaving(true)
        setError('')

        try {
            const response = await fetch(`${API_BASE}/lists/${id}/items/${mediaId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            const data = await response.json()
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to remove item')
            }

            await loadList()
        } catch (err) {
            setError(err.message || 'Failed to remove item')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <p className="status">Loading list...</p>
    if (error && !list) return <p className="status error">{error}</p>
    if (!list) return <p className="status">List not found.</p>

    return (
        <main className="page">
            <Link className="back-link" to="/lists">← Back to Lists</Link>

            <section className="panel">
                <h2>{list.listname}</h2>
                <p className="meta">
                    <span>By {list.creator}</span>
                    <span>{list.ispublic ? 'Public' : 'Private'}</span>
                    <span>{list.itemCount || 0} items</span>
                </p>

                {error && <p className="status error">{error}</p>}

                {isOwner && (
                    <form onSubmit={handleUpdateList} style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
                        <input
                            type="text"
                            value={newName}
                            onChange={(event) => setNewName(event.target.value)}
                            placeholder="List name"
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="checkbox"
                                checked={newVisibility}
                                onChange={(event) => setNewVisibility(event.target.checked)}
                            />
                            Public list
                        </label>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Saving...' : 'Update List'}
                            </button>
                            <button type="button" className="btn btn-ghost" onClick={handleDeleteList} disabled={saving}>
                                Delete List
                            </button>
                        </div>
                    </form>
                )}
            </section>

            {isOwner && (
                <section className="panel" style={{ marginTop: '1rem' }}>
                    <h3>Add Media By Name</h3>
                    <form onSubmit={handleSearchMedia} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search movie or series title"
                        />
                        <button type="submit" className="btn btn-primary" disabled={searching}>
                            {searching ? 'Searching...' : 'Search'}
                        </button>
                    </form>

                    {searchResults.length > 0 && (
                        <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.5rem' }}>
                            {searchResults.map((item) => (
                                <div
                                    key={item.mediaid}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        gap: '0.75rem',
                                        alignItems: 'center',
                                        padding: '0.65rem 0.75rem',
                                        border: '1px solid #e2e6f0',
                                        borderRadius: '8px'
                                    }}
                                >
                                    <div>
                                        <strong>{item.title}</strong>
                                        <div className="meta">
                                            <span>{item.mediatype}</span>
                                            <span>{item.releaseyear || '—'}</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => addItemByMediaId(item.mediaid)}
                                        disabled={saving}
                                    >
                                        Add
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            <section className="panel" style={{ marginTop: '1rem' }}>
                <h3>Items</h3>

                {(!list.items || list.items.length === 0) && (
                    <p className="status">No items in this list yet.</p>
                )}

                {list.items && list.items.length > 0 && (
                    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                        {list.items.map((item) => {
                            const detailPath = item.mediatype === 'TVSeries'
                                ? `/tvshows/${item.mediaid}`
                                : `/movies/${item.mediaid}`

                            return (
                                <article className="card" key={item.mediaid}>
                                    <div className="card-body">
                                        <h3>
                                            <Link to={detailPath}>{item.title}</Link>
                                        </h3>
                                        <div className="meta">
                                            <span>{item.mediatype}</span>
                                            <span>{item.releaseyear || '—'}</span>
                                        </div>
                                        <p>⭐ {item.rating || 'N/A'}</p>
                                        {isOwner && (
                                            <button
                                                type="button"
                                                className="btn btn-ghost"
                                                onClick={() => handleRemoveItem(item.mediaid)}
                                                disabled={saving}
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                )}
            </section>
        </main>
    )
}

export default ListDetailPage
