import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAuthToken, getStoredAuth } from '../utils/auth'

const API_BASE = 'http://localhost:3000'

function MediaReviewsSection({ mediaId }) {
    const [currentRating, setCurrentRating] = useState(null)
    const [reviewCount, setReviewCount] = useState(0)
    const [ratingCount, setRatingCount] = useState(0)
    const [reviews, setReviews] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [submitError, setSubmitError] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [rating, setRating] = useState(8)
    const [reviewText, setReviewText] = useState('')
    const [spoilerFlag, setSpoilerFlag] = useState(false)

    const { user } = getStoredAuth()
    const token = getAuthToken()
    const existingUserReview = user
        ? reviews.find((item) => Number(item.userid) === Number(user.userId))
        : null

    const loadReviews = useCallback(async () => {
        setLoading(true)
        setError('')

        try {
            const response = await fetch(`${API_BASE}/reviews/media/${mediaId}`)
            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to fetch reviews')
            }

            setCurrentRating(data.data.rating)
            setReviewCount(data.data.reviewCount || 0)
            setRatingCount(data.data.ratingCount || 0)
            setReviews(data.data.reviews || [])
        } catch (err) {
            setError(err.message || 'Failed to fetch reviews')
        } finally {
            setLoading(false)
        }
    }, [mediaId])

    useEffect(() => {
        loadReviews()
    }, [loadReviews])

    const handleSubmit = async (event) => {
        event.preventDefault()
        setSubmitError('')

        if (!token) {
            setSubmitError('Please login to submit a rating and review')
            return
        }

        setSubmitting(true)

        try {
            const response = await fetch(`${API_BASE}/reviews/media/${mediaId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    rating,
                    reviewText,
                    spoilerFlag
                })
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to submit review')
            }

            setReviewText('')
            await loadReviews()
        } catch (err) {
            setSubmitError(err.message || 'Failed to submit review')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <section className="detail-section reviews-section">
            <h3>Rating & Reviews</h3>

            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.9rem', color: '#6a7488', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overall Rating</span>
                    <strong style={{ fontSize: '2.5rem', fontFamily: 'Outfit, sans-serif', color: '#1f2635', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {currentRating ? <><span style={{color: 'var(--accent-strong)'}}>★</span> {currentRating}<span style={{fontSize: '1rem', color: '#8a94a6'}}>/10</span></> : <span style={{fontSize:'1.2rem', fontWeight:500, color:'#8a94a6'}}>No ratings yet</span>}
                    </strong>
                    {currentRating && <span style={{ fontSize: '0.9rem', color: '#8a94a6' }}>
                        {ratingCount || reviewCount} {((ratingCount || reviewCount) === 1) ? 'rating' : 'ratings'}
                    </span>}
                </div>
            </div>

            {user ? (
                <form className="review-form" onSubmit={handleSubmit} style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', border: '1px solid #edf0f6', boxShadow: '0 10px 25px rgba(0,0,0,0.03)' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label htmlFor={`rating-${mediaId}`} style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#1f2635' }}>Your Rating</label>
                        <select
                            id={`rating-${mediaId}`}
                            className="sleek-dropdown"
                            value={rating}
                            onChange={(event) => setRating(Number(event.target.value))}
                            required
                            style={{ 
                                width: '100px', 
                                padding: '0.8rem', 
                                background: 'white', 
                                border: '2px solid #e2e6f0', 
                                borderRadius: '12px', 
                                fontSize: '1.1rem',
                                color: 'var(--accent-strong)',
                                fontWeight: 600,
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(num => (
                                <option key={num} value={num}>{num}</option>
                            ))}
                        </select>
                    </div>

                    <label htmlFor={`review-${mediaId}`}>Your Review (optional)</label>
                    <textarea
                        id={`review-${mediaId}`}
                        value={reviewText}
                        onChange={(event) => setReviewText(event.target.value)}
                        rows={3}
                        placeholder="Share your thoughts about this title..."
                    />

                    <label htmlFor={`spoiler-${mediaId}`} className="spoiler-checkbox">
                        <input
                            id={`spoiler-${mediaId}`}
                            type="checkbox"
                            checked={spoilerFlag}
                            onChange={(event) => setSpoilerFlag(event.target.checked)}
                        />
                        Contains spoilers
                    </label>

                    {submitError && <p className="status error">{submitError}</p>}

                    <button className="btn btn-primary" type="submit" disabled={submitting}>
                        {submitting
                            ? (existingUserReview ? 'Updating...' : 'Submitting...')
                            : (existingUserReview ? 'Update Your Review' : 'Submit Review')}
                    </button>
                </form>
            ) : (
                <p className="status">Please <Link to="/login">login</Link> to add your rating.</p>
            )}

            {loading && <p className="status">Loading reviews...</p>}
            {error && <p className="status error">{error}</p>}

            {!loading && !error && reviews.length === 0 && (
                <p className="status">No reviews yet. Be the first to rate this title.</p>
            )}

            {!loading && !error && reviews.length > 0 && (
                <div className="reviews-list">
                    {reviews.map((item) => (
                        <article key={item.reviewid} className="review-card">
                            <div className="review-head">
                                <strong>{item.fullname}</strong>
                                <span>⭐ {item.rating}/10</span>
                                {item.spoilerflag && <span className="spoiler-badge">⚠️ SPOILER</span>}
                            </div>
                            <p className="review-date">{new Date(item.postdate).toLocaleDateString()}</p>
                            <p>{item.reviewtext || 'No written review.'}</p>
                        </article>
                    ))}
                </div>
            )}
        </section>
    )
}

export default MediaReviewsSection
