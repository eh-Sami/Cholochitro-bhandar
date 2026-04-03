import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAuthToken, getStoredAuth } from '../utils/auth'

const API_BASE = 'http://localhost:3000'

function EpisodeReviewsSection({ mediaId, seasonNo, episodeNo }) {
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

    const loadReviews = useCallback(async () => {
        setLoading(true)
        setError('')

        try {
            const response = await fetch(`${API_BASE}/reviews/episode/${mediaId}/${seasonNo}/${episodeNo}`)
            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to fetch episode reviews')
            }

            setCurrentRating(data.data.rating)
            setReviewCount(data.data.reviewCount || 0)
            setRatingCount(data.data.ratingCount || 0)
            setReviews(data.data.reviews || [])
        } catch (err) {
            setError(err.message || 'Failed to fetch episode reviews')
        } finally {
            setLoading(false)
        }
    }, [mediaId, seasonNo, episodeNo])

    useEffect(() => {
        loadReviews()
    }, [loadReviews])

    const existingUserReview = user
        ? reviews.find((item) => Number(item.userid) === Number(user.userId))
        : null

    const handleSubmit = async (event) => {
        event.preventDefault()
        setSubmitError('')

        if (!token) {
            setSubmitError('Please login to submit an episode rating')
            return
        }

        setSubmitting(true)

        try {
            const response = await fetch(`${API_BASE}/reviews/episode/${mediaId}/${seasonNo}/${episodeNo}`, {
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
                throw new Error(data.error || 'Failed to submit episode review')
            }

            setReviewText('')
            await loadReviews()
        } catch (err) {
            setSubmitError(err.message || 'Failed to submit episode review')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="episode-reviews-section">
            <div className="website-rating-box">
                <span className="website-rating-label">Episode Rating</span>
                <strong className="website-rating-value">
                    {currentRating ? `⭐ ${currentRating}` : 'Not enough ratings yet'}
                </strong>
                <span className="website-rating-count">
                    {(ratingCount || reviewCount)} {((ratingCount || reviewCount) === 1) ? 'rating' : 'ratings'}
                </span>
            </div>

            {user ? (
                <form className="review-form" onSubmit={handleSubmit}>
                    <label htmlFor={`episode-rating-${mediaId}-${seasonNo}-${episodeNo}`}>Your Rating (1-10)</label>
                    <input
                        id={`episode-rating-${mediaId}-${seasonNo}-${episodeNo}`}
                        type="number"
                        min="1"
                        max="10"
                        value={rating}
                        onChange={(event) => setRating(event.target.value)}
                        required
                    />

                    <label htmlFor={`episode-review-${mediaId}-${seasonNo}-${episodeNo}`}>Your Review (optional)</label>
                    <textarea
                        id={`episode-review-${mediaId}-${seasonNo}-${episodeNo}`}
                        value={reviewText}
                        onChange={(event) => setReviewText(event.target.value)}
                        rows={3}
                    />

                    <label htmlFor={`episode-spoiler-${mediaId}-${seasonNo}-${episodeNo}`} className="spoiler-checkbox">
                        <input
                            id={`episode-spoiler-${mediaId}-${seasonNo}-${episodeNo}`}
                            type="checkbox"
                            checked={spoilerFlag}
                            onChange={(event) => setSpoilerFlag(event.target.checked)}
                        />
                        Contains spoilers
                    </label>

                    {submitError && <p className="status error">{submitError}</p>}

                    <button className="btn btn-primary btn-sm" type="submit" disabled={submitting}>
                        {submitting
                            ? (existingUserReview ? 'Updating...' : 'Submitting...')
                            : (existingUserReview ? 'Update Your Review' : 'Submit Review')}
                    </button>
                </form>
            ) : (
                <p className="status">Please <Link to="/login">login</Link> to rate this episode.</p>
            )}

            {loading && <p className="status">Loading episode reviews...</p>}
            {error && <p className="status error">{error}</p>}

            {!loading && !error && reviews.length > 0 && (
                <div className="reviews-list">
                    {reviews.slice(0, 3).map((item) => (
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
        </div>
    )
}

export default EpisodeReviewsSection
