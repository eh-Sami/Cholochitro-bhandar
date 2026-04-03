import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAuthToken, getStoredAuth } from '../utils/auth'

const API_BASE = 'http://localhost:3000'

function ListsPage() {
    const { user } = getStoredAuth()
    const token = getAuthToken()

    const [publicLists, setPublicLists] = useState([])
    const [myLists, setMyLists] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [newListName, setNewListName] = useState('')
    const [isPublic, setIsPublic] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const loadLists = useCallback(async () => {
        setLoading(true)
        setError('')

        try {
            const headers = token ? { Authorization: `Bearer ${token}` } : {}
            const publicResponse = await fetch(`${API_BASE}/lists`, { headers })
            const publicData = await publicResponse.json()

            if (!publicResponse.ok || !publicData.success) {
                throw new Error(publicData.error || 'Failed to fetch lists')
            }

            setPublicLists((publicData.data || []).filter((list) => list.ispublic))

            if (token) {
                const myResponse = await fetch(`${API_BASE}/lists?mine=true`, { headers })
                const myData = await myResponse.json()

                if (!myResponse.ok || !myData.success) {
                    throw new Error(myData.error || 'Failed to fetch your lists')
                }

                setMyLists(myData.data || [])
            } else {
                setMyLists([])
            }
        } catch (err) {
            setError(err.message || 'Failed to fetch lists')
        } finally {
            setLoading(false)
        }
    }, [token])

    useEffect(() => {
        loadLists()
    }, [loadLists])

    const handleCreateList = async (event) => {
        event.preventDefault()

        if (!token) {
            setError('Please login to create a list')
            return
        }

        if (!newListName.trim()) {
            setError('List name is required')
            return
        }

        setSubmitting(true)
        setError('')

        try {
            const response = await fetch(`${API_BASE}/lists`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    listName: newListName.trim(),
                    isPublic
                })
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to create list')
            }

            setNewListName('')
            setIsPublic(false)
            await loadLists()
        } catch (err) {
            setError(err.message || 'Failed to create list')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <main className="page lists-page">
            <section className="lists-hero">
                <div>
                    <h2>User Lists</h2>
                    <p>Build your own collections and discover public lists from the community.</p>
                </div>
                <span className="lists-hero-chip">Public lists appear here and on the home page</span>
            </section>

            {user ? (
                <section className="panel lists-create-panel" style={{ marginBottom: '1.25rem' }}>
                    <h3>Create New List</h3>
                    <form onSubmit={handleCreateList} className="lists-create-form">
                        <input
                            type="text"
                            placeholder="My Favorite Titles"
                            value={newListName}
                            onChange={(event) => setNewListName(event.target.value)}
                        />

                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="checkbox"
                                checked={isPublic}
                                onChange={(event) => setIsPublic(event.target.checked)}
                            />
                            Make this list public
                        </label>

                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Creating...' : 'Create List'}
                        </button>
                    </form>
                </section>
            ) : (
                <p className="status">Please <Link to="/login">login</Link> to create your own lists.</p>
            )}

            {loading && <p className="status">Loading lists...</p>}
            {error && <p className="status error">{error}</p>}

            {!loading && !error && user && (
                <section className="panel lists-panel">
                    <div className="section-head">
                        <h3>My Lists</h3>
                        <span className="lists-count-pill">{myLists.length}</span>
                    </div>

                    {myLists.length === 0 && (
                        <p className="status">You have not created any lists yet.</p>
                    )}

                    {myLists.length > 0 && (
                        <div className="lists-grid">
                            {myLists.map((list) => (
                                <Link key={list.listid} className="card-link" to={`/lists/${list.listid}`}>
                                    <article className="card list-card">
                                        <div className="card-body">
                                            <h3>{list.listname}</h3>
                                            <p className="meta">
                                                <span>{list.creator}</span>
                                                <span className={list.ispublic ? 'list-badge public' : 'list-badge private'}>
                                                    {list.ispublic ? 'Public' : 'Private'}
                                                </span>
                                            </p>
                                            <p>{list.itemcount || 0} items</p>
                                        </div>
                                    </article>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {!loading && !error && (
                <section className="panel lists-panel">
                    <div className="section-head">
                        <h3>Public Lists</h3>
                        <span className="lists-count-pill">{publicLists.length}</span>
                    </div>

                    {publicLists.length === 0 && (
                        <p className="status">No public lists yet.</p>
                    )}

                    {publicLists.length > 0 && (
                        <div className="lists-grid">
                            {publicLists.map((list) => (
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
            )}
        </main>
    )
}

export default ListsPage
