import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

const API_BASE = 'http://localhost:3000'
const PROFILE_BASE = 'https://image.tmdb.org/t/p/w342'
const POSTER_BASE = 'https://image.tmdb.org/t/p/w185'

const getProfileUrl = (path) => (path ? `${PROFILE_BASE}${path}` : null)
const getPosterUrl = (path) => (path ? `${POSTER_BASE}${path}` : null)

function PersonDetailsPage() {
    const { id } = useParams()
    const [person, setPerson] = useState(null)
    const [credits, setCredits] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchPerson = async () => {
            try {
                const [personRes, creditsRes] = await Promise.all([
                    fetch(`${API_BASE}/persons/${id}`),
                    fetch(`${API_BASE}/persons/${id}/filmography`)
                ])

                if (!personRes.ok) {
                    throw new Error('Failed to fetch person')
                }

                const personData = await personRes.json()
                setPerson(personData.data || null)

                if (creditsRes.ok) {
                    const creditsData = await creditsRes.json()
                    setCredits(creditsData.data || [])
                }
            } catch (err) {
                setError(err.message || 'Something went wrong')
            } finally {
                setLoading(false)
            }
        }

        fetchPerson()
    }, [id])

    if (loading) return <p className="status">Loading person...</p>
    if (error) return <p className="status error">{error}</p>
    if (!person) return <p className="status">Person not found.</p>

    return (
        <main className="page-full">
            <div className="detail-hero">
                <div 
                    className="detail-hero-bg" 
                    style={{ backgroundImage: `url(${getProfileUrl(person.picture)})` }} 
                />
                <div className="detail-hero-content">
                    <Link className="back-link hero-back" to="/celebrities">← Back to Celebrities</Link>
                    {getProfileUrl(person.picture) ? (
                        <img
                            className="detail-hero-poster"
                            src={getProfileUrl(person.picture)}
                            alt={person.fullname}
                            style={{ borderRadius: '50%', width: '250px', height: '250px', objectFit: 'cover' }}
                        />
                    ) : (
                        <div className="detail-hero-poster placeholder" style={{ borderRadius: '50%', width: '250px', height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#333' }}>No photo</div>
                    )}
                    <div className="detail-hero-info">
                        <h2 className="detail-hero-title">{person.fullname}</h2>
                        <div className="detail-hero-meta">
                            <span>{person.nationality || 'Nationality Unknown'}</span>
                            <span>•</span>
                            <span>{person.dateofbirth ? new Date(person.dateofbirth).toLocaleDateString() : 'DOB Unknown'}</span>
                        </div>
                        <p className="detail-hero-overview">
                            {person.biography || 'No biography available.'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="detail-gridLayout single-col">
                <div className="detail-main-col">
                    {credits.length > 0 && (
                        <section className="detail-section">
                            <h3>Filmography</h3>
                            <div className="credits-grid">
                                {credits.map((credit) => (
                                    <Link
                                        className="credit-card"
                                        to={credit.mediatype === 'TVSeries' ? `/tvshows/${credit.mediaid}` : `/movies/${credit.mediaid}`}
                                        key={`${credit.mediatype}-${credit.mediaid}-${credit.crewrole}`}
                                    >
                                        {getPosterUrl(credit.poster) ? (
                                            <img
                                                className="credit-poster"
                                                src={getPosterUrl(credit.poster)}
                                                alt={credit.title}
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="credit-poster placeholder">No poster</div>
                                        )}
                                        <div className="credit-body">
                                            <h4>{credit.title}</h4>
                                            <p>{credit.releaseyear || '—'} · {credit.crewrole}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </main>
    )
}

export default PersonDetailsPage