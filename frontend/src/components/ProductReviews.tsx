import React, { useState } from 'react';
import { MessageSquareText, Pencil, Trash2 } from 'lucide-react';
import { ReviewService } from '../services/endpoints';
import { useAsync } from '../lib/useAsync';
import { getErrorMessage } from '../lib/errors';
import { formatDate } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { ReviewResponse, ReviewSort } from '../types/api';
import { Field } from './ui/Common';
import { Alert, EmptyState, Spinner } from './ui/Feedback';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { Pagination } from './ui/Pagination';
import { StarInput, Stars } from './Stars';

const PAGE_SIZE = 5;

const ReviewForm: React.FC<{
  productId: string;
  existing?: ReviewResponse | null;
  onSaved: () => void;
  onCancel?: () => void;
}> = ({ productId, existing, onSaved, onCancel }) => {
  const toast = useToast();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return;
    setSaving(true);
    setError(null);
    const payload = { rating, title: title.trim() || null, comment: comment.trim() || null };
    try {
      if (existing) await ReviewService.update(existing.id, payload);
      else await ReviewService.create(productId, payload);
      toast.success(existing ? 'Review updated' : 'Thanks for your review!');
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form className="card card-body stack review-form" onSubmit={submit}>
      <div style={{ fontWeight: 600 }}>{existing ? 'Edit your review' : 'Write a review'}</div>
      {error && <Alert>{error}</Alert>}
      <StarInput value={rating} onChange={setRating} />
      <Field label="Headline" hint="Optional">
        <input className="input" maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sum it up in a few words" />
      </Field>
      <Field label="Your review" hint="Optional">
        <textarea className="textarea" maxLength={5000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What did you like or dislike?" />
      </Field>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-primary" disabled={saving || !rating}>
          {saving && <Spinner />}
          {existing ? 'Save changes' : 'Submit review'}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

/** Rating summary, the customer's own review (or a form to write one) and the paginated review list. */
export const ProductReviews: React.FC<{ productId: string; onChange?: () => void }> = ({ productId, onChange }) => {
  const { user, role } = useAuth();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<ReviewSort>('newest');
  const [rating, setRating] = useState<number | undefined>();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState<ReviewResponse | null>(null);

  const summary = useAsync(() => ReviewService.summary(productId).then((r) => r.data), [productId]);
  const eligibility = useAsync(
    () => (role === 'CUSTOMER' ? ReviewService.eligibility(productId).then((r) => r.data) : Promise.resolve(null)),
    [productId, role],
  );
  const reviews = useAsync(
    () => ReviewService.list(productId, { page, size: PAGE_SIZE, sort, rating }).then((r) => r.data),
    [productId, page, sort, rating],
  );

  const refresh = () => {
    setEditing(false);
    void summary.reload({ silent: true });
    void eligibility.reload({ silent: true });
    void reviews.reload({ silent: true });
    onChange?.();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await ReviewService.delete(deleting.id);
      toast.success('Review deleted');
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(null);
    }
  };

  const filterBy = (star?: number) => {
    setRating(star);
    setPage(1);
  };

  const s = summary.data;
  const own = eligibility.data?.existing_review;

  return (
    <section id="reviews" className="reviews">
      <h2 className="section-title">Customer reviews</h2>

      <div className="reviews-layout">
        <aside className="card card-body review-summary">
          {s && s.review_count > 0 && s.average_rating != null ? (
            <>
              <div className="review-avg">
                <span className="review-avg-value">{s.average_rating.toFixed(1)}</span>
                <div>
                  <Stars value={s.average_rating} size={18} />
                  <div className="muted" style={{ fontSize: 13 }}>
                    {s.review_count} {s.review_count === 1 ? 'review' : 'reviews'}
                  </div>
                </div>
              </div>
              <div className="review-bars">
                {(['5', '4', '3', '2', '1'] as const).map((star) => {
                  const n = s.distribution[star];
                  const pct = s.review_count ? (n / s.review_count) * 100 : 0;
                  const active = rating === Number(star);
                  return (
                    <button
                      key={star}
                      className={`review-bar ${active ? 'active' : ''}`}
                      onClick={() => filterBy(active ? undefined : Number(star))}
                      aria-pressed={active}
                      title={active ? 'Show all reviews' : `Show ${star}-star reviews`}
                    >
                      <span>{star}★</span>
                      <span className="progress"><span style={{ width: `${pct}%` }} /></span>
                      <span className="subtle">{n}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="muted">No ratings yet.</p>
          )}
        </aside>

        <div className="stack">
          {role === 'CUSTOMER' && eligibility.data && (
            own && !editing ? null : eligibility.data.can_review || editing ? (
              <ReviewForm
                key={own?.id ?? 'new'}
                productId={productId}
                existing={editing ? own : null}
                onSaved={refresh}
                onCancel={editing ? () => setEditing(false) : undefined}
              />
            ) : (
              <p className="muted review-hint">{eligibility.data.reason}</p>
            )
          )}

          {reviews.data && reviews.data.total > 0 && (
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted" style={{ fontSize: 13 }}>
                {rating ? `${rating}-star reviews` : 'All reviews'}
                {rating && (
                  <>
                    {' · '}
                    <button className="link-btn" onClick={() => filterBy(undefined)}>Show all</button>
                  </>
                )}
              </span>
              <select className="select" style={{ width: 'auto' }} value={sort} onChange={(e) => { setSort(e.target.value as ReviewSort); setPage(1); }} aria-label="Sort reviews">
                <option value="newest">Newest</option>
                <option value="highest">Highest rated</option>
                <option value="lowest">Lowest rated</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
          )}

          {reviews.error ? (
            <Alert>{reviews.error}</Alert>
          ) : reviews.data && reviews.data.total === 0 ? (
            <div className="card">
              <EmptyState
                icon={MessageSquareText}
                title={rating ? `No ${rating}-star reviews` : 'No reviews yet'}
                description={rating ? undefined : 'Customers who receive this product can share what they think.'}
              />
            </div>
          ) : (
            reviews.data?.items.map((r) => {
              const mine = r.user_id === user?.id;
              return (
                <article key={r.id} className={`card card-body review ${mine ? 'is-mine' : ''}`}>
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <Stars value={r.rating} />
                      {r.title && <div className="review-title">{r.title}</div>}
                    </div>
                    {(mine || role === 'BUSINESS') && (
                      <div className="row" style={{ gap: 4 }}>
                        {mine && (
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditing(true)} aria-label="Edit review">
                            <Pencil />
                          </button>
                        )}
                        <button className="btn btn-danger-ghost btn-icon btn-sm" onClick={() => setDeleting(r)} aria-label="Delete review">
                          <Trash2 />
                        </button>
                      </div>
                    )}
                  </div>
                  {r.comment && <p className="review-body">{r.comment}</p>}
                  <div className="subtle" style={{ fontSize: 12.5 }}>
                    {mine ? 'You' : r.reviewer_name} · {formatDate(r.created_at)}
                    {r.updated_at !== r.created_at && ' · edited'}
                  </div>
                </article>
              );
            })
          )}

          {reviews.data && (
            <Pagination
              page={reviews.data.page}
              pages={reviews.data.pages}
              total={reviews.data.total}
              size={reviews.data.size}
              onChange={setPage}
              noun="reviews"
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleting}
        title="Delete review?"
        message="This review will be removed permanently."
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </section>
  );
};
