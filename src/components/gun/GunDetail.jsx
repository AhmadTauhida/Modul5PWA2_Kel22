import { useState, useEffect, useRef } from 'react'
import {
  ArrowLeft,
  Star,
  Send,
  Loader,
  Share2,
  Pencil,
  Trash2,
  X,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
} from 'lucide-react'
import FavoriteButton from '../common/FavoriteButton'
import ConfirmModal from '../modals/ConfirmModal'
import {
  useReviews,
  useCreateReview,
  useUpdateReview,
  useDeleteReview,
} from '../../hooks/useReviews'
import { getUserIdentifier } from '../../services/userService'
import { formatPrice, averageRating } from '../../utils/helpers'
import { buildGunShareUrl } from '../../utils/share'

const REVIEW_VOTES_KEY = 'bore_barrel_review_votes'
const REVIEW_VOTE_COUNTS_KEY = 'bore_barrel_review_vote_counts'
const SELLER_WHATSAPP_NUMBER = import.meta.env.VITE_SELLER_WHATSAPP_NUMBER || ''

const readReviewVotes = (userId) => {
  try {
    const raw = localStorage.getItem(`${REVIEW_VOTES_KEY}:${userId}`)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

const saveReviewVotes = (userId, votes) => {
  try {
    localStorage.setItem(`${REVIEW_VOTES_KEY}:${userId}`, JSON.stringify(votes))
  } catch {
    // Voting remains available for the current view if storage is unavailable.
  }
}

const readReviewVoteCounts = () => {
  try {
    const raw = localStorage.getItem(REVIEW_VOTE_COUNTS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

const saveReviewVoteCounts = (counts) => {
  try {
    localStorage.setItem(REVIEW_VOTE_COUNTS_KEY, JSON.stringify(counts))
  } catch {
    // Keep counters available in memory when storage is unavailable.
  }
}

/**
 * Full-screen product detail view.
 *
 * @param {Object}   props
 * @param {Object}   props.gun       — product data
 * @param {Function} props.onBack    — return to catalog
 * @param {Function} [props.onEdit]  — navigate to edit page
 * @param {Function} [props.onDelete]— trigger delete flow
 */
export default function GunDetail({ gun, onBack, onEdit, onDelete }) {
  const imageUrls = Array.isArray(gun.image_urls) && gun.image_urls.length > 0
    ? gun.image_urls
    : [gun.image_url || gun.image || '/guns/pistol.svg']
  const [activeImage, setActiveImage] = useState(0)
  const imgSrc = imageUrls[activeImage] || imageUrls[0]
  const category = gun.type || gun.category || '—'
  const caliber = gun.caliber || gun.difficulty || ''
  const price = gun.price ?? gun.cook_time ?? 0

  // Reviews
  const { reviews, loading: reviewsLoading, refetch: refetchReviews } = useReviews(gun.id)
  const { createReview, loading: submitting } = useCreateReview()
  const { updateReview, loading: updating } = useUpdateReview()
  const { deleteReview, loading: deleting } = useDeleteReview()
  const currentUserId = getUserIdentifier()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState('')
  const [editingReview, setEditingReview] = useState(null)
  const [editRating, setEditRating] = useState(5)
  const [editComment, setEditComment] = useState('')
  const [reviewToDelete, setReviewToDelete] = useState(null)
  const [reviewVotes, setReviewVotes] = useState(() => readReviewVotes(currentUserId))
  const [reviewVoteCounts, setReviewVoteCounts] = useState(readReviewVoteCounts)

  // Share link feedback
  const [shareStatus, setShareStatus] = useState('')
  const shareTimerRef = useRef(null)

  useEffect(() => {
    return () => clearTimeout(shareTimerRef.current)
  }, [])

  const showShareStatus = (message) => {
    setShareStatus(message)
    clearTimeout(shareTimerRef.current)
    shareTimerRef.current = setTimeout(() => setShareStatus(''), 2500)
  }

  const handleShare = async () => {
    if (gun.id === undefined || gun.id === null) {
      showShareStatus('This product cannot be shared yet.')
      return
    }

    const url = buildGunShareUrl(gun)

    if (navigator.share) {
      try {
        await navigator.share({
          title: gun.name,
          text: `Check out ${gun.name} — ${formatPrice(price)} at Bore & Barrel`,
          url,
        })
        showShareStatus('Shared successfully!')
        return
      } catch (err) {
        if (err?.name === 'AbortError') return
      }
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url)
        showShareStatus('Product link copied to clipboard!')
        return
      } catch {
        /* fall through to manual copy */
      }
    }

    window.prompt('Copy this product link:', url)
  }

  const handleContactSeller = () => {
    const phoneNumber = SELLER_WHATSAPP_NUMBER.replace(/\D/g, '')
    if (!phoneNumber) {
      showShareStatus('WhatsApp seller number is not configured yet.')
      return
    }

    const message = encodeURIComponent(
      `Hello, I am interested in ${gun.name}. Is it still available?`,
    )
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank', 'noopener,noreferrer')
  }

  const avgRating = gun.average_rating || averageRating(reviews)
  const reviewCount = gun.review_count ?? reviews.length

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    setReviewError('')
    setReviewSuccess('')

    if (rating < 1 || rating > 5) {
      setReviewError('Rating must be between 1 and 5.')
      return
    }

    const result = await createReview(gun.id, {
      user_identifier: getUserIdentifier(),
      rating,
      comment: comment.trim(),
    })

    if (result) {
      setReviewSuccess('Review submitted!')
      setComment('')
      setRating(5)
      refetchReviews()
    } else {
      setReviewError('Could not submit review. The server may be unavailable.')
    }
  }

  const isOwnReview = (review) =>
    review.user_id === currentUserId || review.user_identifier === currentUserId

  const startEditingReview = (review) => {
    setEditingReview(review.id)
    setEditRating(Number(review.rating) || 5)
    setEditComment(review.comment || '')
    setReviewError('')
  }

  const cancelEditingReview = () => {
    setEditingReview(null)
    setEditComment('')
    setEditRating(5)
  }

  const handleUpdateReview = async (e) => {
    e.preventDefault()
    if (editRating < 1 || editRating > 5) {
      setReviewError('Rating must be between 1 and 5.')
      return
    }

    const result = await updateReview(editingReview, {
      user_identifier: currentUserId,
      rating: editRating,
      comment: editComment.trim(),
    })

    if (result !== null) {
      setReviewSuccess('Review updated!')
      cancelEditingReview()
      refetchReviews()
    } else {
      setReviewError('Could not update review. The server may be unavailable.')
    }
  }

  const handleDeleteReview = async () => {
    if (!reviewToDelete) return

    const deleted = await deleteReview(reviewToDelete.id)
    if (deleted) {
      setReviewToDelete(null)
      setReviewSuccess('Review deleted.')
      refetchReviews()
    } else {
      setReviewError('Could not delete review. The server may be unavailable.')
    }
  }

  const handleReviewVote = (reviewId, vote) => {
    const previousVote = reviewVotes[reviewId]
    const nextVote = previousVote === vote ? null : vote
    const nextVotes = { ...reviewVotes }
    const nextCounts = { ...reviewVoteCounts }
    const currentCounts = nextCounts[reviewId] || { up: 0, down: 0 }
    const updatedCounts = { ...currentCounts }

    if (previousVote) {
      updatedCounts[previousVote] = Math.max(0, updatedCounts[previousVote] - 1)
    }

    if (nextVote) {
      updatedCounts[nextVote] += 1
    }

    nextCounts[reviewId] = updatedCounts

    if (nextVote) {
      nextVotes[reviewId] = nextVote
    } else {
      delete nextVotes[reviewId]
    }

    setReviewVotes(nextVotes)
    setReviewVoteCounts(nextCounts)
    saveReviewVotes(currentUserId, nextVotes)
    saveReviewVoteCounts(nextCounts)
  }

  return (
    <div className="detail">
      {/* Back button */}
      <button type="button" className="detail-back" onClick={onBack}>
        <ArrowLeft size={18} /> Back to Catalog
      </button>

      {/* Hero */}
      <div className="detail-hero">
        <div className="detail-gallery">
          <img className="detail-img" src={imgSrc} alt={`${gun.name} view ${activeImage + 1}`} />
          {imageUrls.length > 1 && (
            <div className="detail-thumbnails" aria-label="Product images">
              {imageUrls.map((url, index) => (
                <button
                  key={`${url}-${index}`}
                  type="button"
                  className={`detail-thumbnail ${index === activeImage ? 'active' : ''}`}
                  onClick={() => setActiveImage(index)}
                  aria-label={`View product image ${index + 1}`}
                >
                  <img src={url} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="detail-info">
          <h1 className="display">{gun.name}</h1>
          <p className="type">
            {category}
            {caliber ? ` · ${caliber}` : ''}
          </p>
          <p className="price detail-price">{formatPrice(price)}</p>

          {avgRating > 0 && (
            <p className="detail-rating">
              <Star size={16} fill="var(--brass)" stroke="var(--brass)" />
              {avgRating.toFixed(1)} ({reviewCount} review{reviewCount !== 1 ? 's' : ''})
            </p>
          )}

          <div className="detail-actions">
            <FavoriteButton gunId={gun.id || gun.name} />
            <button type="button" className="btn btn--outline" onClick={handleContactSeller}>
              <MessageCircle size={16} /> Contact Seller
            </button>
            <button type="button" className="btn btn--outline" onClick={handleShare}>
              <Share2 size={16} /> Share
            </button>
            {onEdit && (
              <button type="button" className="btn btn--outline" onClick={() => onEdit(gun)}>
                Edit
              </button>
            )}
            {onDelete && (
              <button type="button" className="btn btn--danger" onClick={() => onDelete(gun)}>
                Delete
              </button>
            )}
          </div>

          {shareStatus && (
            <p className="share-status" role="status" aria-live="polite">
              {shareStatus}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      <section className="detail-section">
        <h2>Description</h2>
        <p>{gun.description || 'No description available.'}</p>
      </section>

      {/* Specifications (from ingredients / steps if present) */}
      {gun.ingredients && gun.ingredients.length > 0 && (
        <section className="detail-section">
          <h2>Specifications</h2>
          <ul className="detail-specs">
            {gun.ingredients.map((ing, i) => (
              <li key={ing.id || i}>
                <strong>{ing.name}</strong> — {ing.quantity}
              </li>
            ))}
          </ul>
        </section>
      )}

      {gun.steps && gun.steps.length > 0 && (
        <section className="detail-section">
          <h2>Assembly / Maintenance Steps</h2>
          <ol className="detail-steps">
            {gun.steps.map((step, i) => (
              <li key={step.id || i}>
                {step.instruction || step}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Reviews Section */}
      <section className="detail-section">
        <h2>Reviews</h2>

        {/* Submit review */}
        <form className="review-form" onSubmit={handleSubmitReview}>
          <div className="review-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className="star-btn"
                onClick={() => setRating(n)}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
              >
                <Star
                  size={22}
                  fill={n <= rating ? 'var(--brass)' : 'none'}
                  stroke={n <= rating ? 'var(--brass)' : 'var(--steel)'}
                />
              </button>
            ))}
          </div>

          <textarea
            className="review-input"
            rows="3"
            placeholder="Write a short review (optional)…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
          />

          <button
            type="submit"
            className="btn btn--primary"
            disabled={submitting || !gun.id}
          >
            {submitting ? (
              <><Loader size={16} className="spin" /> Submitting…</>
            ) : (
              <><Send size={16} /> Submit Review</>
            )}
          </button>

          {reviewError && <p className="form-error">{reviewError}</p>}
          {reviewSuccess && <p className="form-success">{reviewSuccess}</p>}
          {!gun.id && (
            <p className="form-hint">
              Reviews require a server-generated product ID. This product is local-only.
            </p>
          )}
        </form>

        {/* Existing reviews */}
        {reviewsLoading ? (
          <p className="detail-loading">Loading reviews…</p>
        ) : reviews.length > 0 ? (
          <ul className="review-list">
            {reviews.map((rev) => (
              <li key={rev.id} className="review-item">
                <div className="review-head">
                  <span className="review-user">{rev.user_identifier || 'Anonymous'}</span>
                  <div className="review-meta">
                    <span className="review-stars-display">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          size={14}
                          fill={i < rev.rating ? 'var(--brass)' : 'none'}
                          stroke={i < rev.rating ? 'var(--brass)' : 'var(--line)'}
                        />
                      ))}
                    </span>
                    {isOwnReview(rev) && (
                      <div className="review-actions">
                        <button type="button" className="icon-btn" onClick={() => startEditingReview(rev)} aria-label="Edit review" title="Edit review">
                          <Pencil size={14} />
                        </button>
                        <button type="button" className="icon-btn icon-btn--danger" onClick={() => setReviewToDelete(rev)} aria-label="Delete review" title="Delete review">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {editingReview === rev.id ? (
                  <form className="review-edit-form" onSubmit={handleUpdateReview}>
                    <div className="review-stars">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} type="button" className="star-btn" onClick={() => setEditRating(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`}>
                          <Star size={20} fill={n <= editRating ? 'var(--brass)' : 'none'} stroke={n <= editRating ? 'var(--brass)' : 'var(--steel)'} />
                        </button>
                      ))}
                    </div>
                    <textarea className="review-input" rows="3" value={editComment} onChange={(e) => setEditComment(e.target.value)} maxLength={500} />
                    <div className="review-edit-actions">
                      <button type="submit" className="btn btn--primary" disabled={updating}>
                        {updating ? <><Loader size={16} className="spin" /> Saving…</> : <><Send size={16} /> Save Review</>}
                      </button>
                      <button type="button" className="btn btn--outline" onClick={cancelEditingReview} disabled={updating}><X size={16} /> Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    {rev.comment && <p className="review-comment">{rev.comment}</p>}
                    <div className="review-vote-actions" aria-label="Rate this review">
                      <button
                        type="button"
                        className={`review-vote-btn ${reviewVotes[rev.id] === 'up' ? 'active' : ''}`}
                        onClick={() => handleReviewVote(rev.id, 'up')}
                        aria-pressed={reviewVotes[rev.id] === 'up'}
                        title="Helpful review"
                      >
                        <ThumbsUp size={15} />
                        <span>Helpful {reviewVoteCounts[rev.id]?.up || 0}</span>
                      </button>
                      <button
                        type="button"
                        className={`review-vote-btn ${reviewVotes[rev.id] === 'down' ? 'active review-vote-btn--down' : ''}`}
                        onClick={() => handleReviewVote(rev.id, 'down')}
                        aria-pressed={reviewVotes[rev.id] === 'down'}
                        title="Not helpful review"
                      >
                        <ThumbsDown size={15} />
                        <span>Not helpful {reviewVoteCounts[rev.id]?.down || 0}</span>
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="detail-empty">No reviews yet. Be the first!</p>
        )}
      </section>

      <ConfirmModal
        open={Boolean(reviewToDelete)}
        title="Delete review?"
        message="This review will be permanently removed."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        loading={deleting}
        onConfirm={handleDeleteReview}
        onCancel={() => setReviewToDelete(null)}
      />
    </div>
  )
}
