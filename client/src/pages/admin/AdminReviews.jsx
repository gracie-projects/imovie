import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiCheck, FiEyeOff, FiTrash2 } from 'react-icons/fi';
import { adminApi, reviewApi } from '../../api/services';
import { getErrorMessage } from '../../api/client';
import useAsync from '../../hooks/useAsync';
import useDebounce from '../../hooks/useDebounce';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import { Stars } from '../../components/common/StarRating';
import { AdminHeader, SearchInput, TableState } from '../../components/admin/AdminToolbar';
import { formatDate } from '../../utils/format';

export default function AdminReviews() {
  useDocumentTitle('Moderate reviews');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(q.trim());
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useAsync(
    () => adminApi.reviews({ q: debounced || undefined, status: status || undefined, page, limit: 15 }),
    [debounced, status, page]
  );

  const moderate = async (review, next) => {
    try {
      await adminApi.moderateReview(review._id, next);
      toast.success(next === 'approved' ? 'Review published' : 'Review hidden');
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await reviewApi.remove(deleting._id);
      toast.success('Review deleted');
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AdminHeader title="Reviews" subtitle="Reviews are published immediately. Hide inappropriate ones or delete them." />
      <div className="surface">
        <div className="d-flex flex-wrap gap-2 p-3 border-bottom border-secondary-subtle">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search review text" />
          <label htmlFor="r-status" className="visually-hidden">Status</label>
          <select id="r-status" className="form-select w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All reviews</option>
            <option value="approved">Published</option>
            <option value="rejected">Hidden</option>
          </select>
        </div>
        <TableState loading={loading} error={error} onRetry={reload} empty={!data?.items.length} emptyText="No reviews found.">
          <table className="table table-hover">
            <thead>
              <tr><th scope="col">Movie</th><th scope="col">Author</th><th scope="col">Rating</th><th scope="col" style={{ minWidth: 240 }}>Review</th><th scope="col">Status</th><th scope="col" className="text-end">Actions</th></tr>
            </thead>
            <tbody>
              {data?.items.map((r) => (
                <tr key={r._id}>
                  <td className="small">{r.movie ? <Link to={`/movies/${r.movie._id}`}>{r.movie.movieName}</Link> : '—'}<div className="text-muted">{formatDate(r.createdAt)}</div></td>
                  <td className="small">{r.user?.username || '—'}<div className="text-muted">{r.user?.email}</div></td>
                  <td><Stars value={r.rating} size={12} /></td>
                  <td className="small">{r.comment || <em className="text-muted">No comment</em>}</td>
                  <td>{r.status === 'approved' ? <span className="badge text-bg-success">Published</span> : <span className="badge text-bg-warning">Hidden</span>}</td>
                  <td className="text-end text-nowrap">
                    {r.status === 'approved' ? (
                      <button type="button" className="btn btn-ghost btn-icon" onClick={() => moderate(r, 'rejected')} aria-label="Hide review" title="Hide review"><FiEyeOff /></button>
                    ) : (
                      <button type="button" className="btn btn-ghost btn-icon text-success" onClick={() => moderate(r, 'approved')} aria-label="Publish review" title="Publish review"><FiCheck /></button>
                    )}
                    <button type="button" className="btn btn-ghost btn-icon text-danger" onClick={() => setDeleting(r)} aria-label="Delete review"><FiTrash2 /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableState>
      </div>
      {data && <Pagination page={page} totalPages={data.pagination.totalPages} onChange={setPage} />}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete review?"
        message="The review will be permanently removed and the movie's rating recalculated."
        confirmLabel="Delete review"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
