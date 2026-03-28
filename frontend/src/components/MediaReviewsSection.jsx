import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAuthToken, getStoredAuth } from '../utils/auth'

const API_BASE = 'http://localhost:3000'

function MediaReviewsSection({ mediaId }) {
    const [websiteRating, setWebsiteRating] = useState(null)
    const [reviewCount, setReviewCount] = useState(0)
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

            setWebsiteRating(data.data.websiteRating)
            setReviewCount(data.data.reviewCount || 0)
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
            <h3>Website Rating & Reviews</h3>

            <div className="website-rating-box">
                <span className="website-rating-label">Website Rating</span>
                <strong className="website-rating-value">
                    {websiteRating ? `⭐ ${websiteRating}` : 'Not enough ratings yet'}
                </strong>
                <span className="website-rating-count">
                    {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
                </span>
            </div>

            {user ? (
                <form className="review-form" onSubmit={handleSubmit}>
                    <label htmlFor={`rating-${mediaId}`}>Your Rating (1-10)</label>
                    <input
                        id={`rating-${mediaId}`}
                        type="number"
                        min="1"
                        max="10"
                        value={rating}
                        onChange={(event) => setRating(event.target.value)}
                        required
                    />

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
                <p className="status">Please <Link to="/login">login</Link> to add your website rating.</p>
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
