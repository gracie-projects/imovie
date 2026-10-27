import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiMessageSquare, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { reviewApi } from '../../api/services';
import { getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import useAsync from '../../hooks/useAsync';
import { Stars, StarInput } from '../common/StarRating';
import { EmptyState, ErrorState, LineSkeleton } from '../common/States';
import Pagination from '../common/Pagination';
import ConfirmDialog from '../common/ConfirmDialog';
import { formatDate } from '../../utils/format';

function ReviewForm({ movieId, existing, onSaved, onCancel }) {
  const [rating, setRating] = useState(existing?.rating || 0);
  const [comment, setComment] = useState(existing?.comment || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) {
      setError('Please choose a star rating.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (existing) await reviewApi.update(existing._id, { rating, comment });
      else await reviewApi.create({ movieId, rating, comment });
      toast.success(existing ? 'Review updated' : 'Thanks for your review!');
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="surface-2 p-3 p-md-4 mb-4" noValidate>
      <h3 className="h6 fw-semibold mb-3">{existing ? 'Edit your review' : 'Rate this movie'}</h3>
      <StarInput value={rating} onChange={setRating} />
      <div className="mt-3">
        <label htmlFor="review-comment" className="form-label">
          Your review <span className="text-muted">(optional)</span>
        </label>
        <textarea
          id="review-comment"
          className="form-control"
          rows={3}
          maxLength={1000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What did you think of the story, acting and music?"
        />
        <div className="form-text text-end">{comment.length}/1000</div>
      </div>
      {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}
      <div className="d-flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
          {existing ? 'Save changes' : 'Post review'}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-outline-light" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default function ReviewSection({ movie, onRatingChange }) {
  const { user } = useAuth();
  const location = useLocation();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { data, loading, error, reload } = useAsync(() => reviewApi.forMovie(movie._id, { page, limit: 6 }), [movie._id, page, user?._id]);

  useEffect(() => setEditing(false), [movie._id]);

  const afterChange = () => {
    setEditing(false);
    reload();
    onRatingChange?.();
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await reviewApi.remove(data.myReview._id);
      toast.success('Review deleted');
      setConfirmDelete(false);
      afterChange();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const myReview = data?.myReview;
  const total = data ? Object.values(data.distribution).reduce((a, b) => a + b, 0) : 0;

  return (
    <section aria-labelledby="reviews-title">
      <h2 id="reviews-title" className="section-title mb-3">
        Ratings &amp; <span className="accent">Reviews</span>
      </h2>

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="surface p-4">
            <div className="d-flex align-items-end gap-2 mb-1">
              <span className="display-5 fw-bold">{movie.reviewCount ? movie.avgRating.toFixed(1) : '–'}</span>
              <span className="text-muted mb-2">/ 5</span>
            </div>
            <Stars value={movie.avgRating} size={18} />
            <p className="small text-muted mt-1">
              {movie.reviewCount} review{movie.reviewCount === 1 ? '' : 's'}
            </p>
            {data &&
              [5, 4, 3, 2, 1].map((r) => (
                <div key={r} className="d-flex align-items-center gap-2 small mb-1">
                  <span style={{ width: 14 }}>{r}</span>
                  <div className="bar-track flex-fill" aria-hidden="true">
                    <div className="bar-fill" style={{ width: `${total ? (data.distribution[r] / total) * 100 : 0}%` }} />
                  </div>
                  <span className="text-muted" style={{ width: 24 }}>{data.distribution[r]}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="col-lg-8">
          {movie.status === 'coming-soon' ? (
            <p className="text-muted">Reviews open once the movie is released.</p>
          ) : !user ? (
            <div className="surface-2 p-3 mb-4 d-flex flex-wrap justify-content-between align-items-center gap-2">
              <span>Watched it? Share your rating with other movie-goers.</span>
              <Link to="/login" state={{ from: location }} className="btn btn-primary btn-sm">
                Log in to review
              </Link>
            </div>
          ) : !loading && (!myReview || editing) ? (
            <ReviewForm movieId={movie._id} existing={editing ? myReview : null} onSaved={afterChange} onCancel={editing ? () => setEditing(false) : null} />
          ) : myReview ? (
            <div className="surface-2 p-3 mb-4">
              <div className="d-flex justify-content-between align-items-start gap-2">
                <div>
                  <div className="small text-muted mb-1">Your review</div>
                  <Stars value={myReview.rating} />
                  {myReview.status === 'rejected' && (
                    <span className="badge text-bg-warning ms-2">Hidden by a moderator</span>
                  )}
                  {myReview.comment && <p className="mt-2 mb-0">{myReview.comment}</p>}
                </div>
                <div className="d-flex gap-1">
                  <button type="button" className="btn btn-ghost btn-icon" onClick={() => setEditing(true)} aria-label="Edit your review">
                    <FiEdit2 />
                  </button>
                  <button type="button" className="btn btn-ghost btn-icon text-danger" onClick={() => setConfirmDelete(true)} aria-label="Delete your review">
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {loading && <LineSkeleton lines={4} />}
          {error && <ErrorState message={error} onRetry={reload} />}
          {data && !loading && data.items.length === 0 && (
            <EmptyState icon={<FiMessageSquare />} title="No reviews yet" message="Be the first to share what you thought." />
          )}
          {data && !loading && (
            <ul className="list-unstyled d-grid gap-3 m-0">
              {data.items.map((r) => (
                <li key={r._id} className="surface p-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <div className="d-flex align-items-center gap-2">
                      <span className="avatar" style={{ width: 30, height: 30, fontSize: '.8rem' }} aria-hidden="true">
                        {r.user?.username?.[0]?.toUpperCase() || '?'}
                      </span>
                      <span className="fw-semibold">{r.user?.username || 'Former user'}</span>
                    </div>
                    <span className="small text-muted">{formatDate(r.createdAt)}</span>
                  </div>
                  <Stars value={r.rating} />
                  {r.comment && <p className="mt-2 mb-0 text-light">{r.comment}</p>}
                </li>
              ))}
            </ul>
          )}
          {data && <Pagination page={page} totalPages={data.pagination.totalPages} onChange={setPage} />}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete your review?"
        message="Your rating and comment will be removed permanently."
        confirmLabel="Delete review"
        busy={deleting}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </section>
  );
}
