import { useState } from 'react';
import toast from 'react-hot-toast';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { movieApi } from '../../api/services';
import { getErrorMessage } from '../../api/client';
import useAsync from '../../hooks/useAsync';
import useDebounce from '../../hooks/useDebounce';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import Poster from '../../components/common/Poster';
import { AdminHeader, SearchInput, TableState } from '../../components/admin/AdminToolbar';
import MovieForm from './MovieForm';
import { formatDate, formatDuration } from '../../utils/format';

const STATUS_LABEL = { 'now-showing': 'Now showing', 'coming-soon': 'Coming soon', archived: 'Archived' };

export default function AdminMovies() {
  useDocumentTitle('Manage movies');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(q.trim());
  const [editing, setEditing] = useState(null); // null | 'new' | movie
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const filters = useAsync(() => movieApi.filters(), []);
  const { data, loading, error, reload } = useAsync(
    () => movieApi.list({ q: debounced || undefined, status, page, limit: 10, sort: 'title' }),
    [debounced, status, page]
  );

  const remove = async () => {
    setBusy(true);
    try {
      await movieApi.remove(deleting._id);
      toast.success(`"${deleting.movieName}" deleted`);
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
      <AdminHeader title="Movies" subtitle="Add, edit, archive or delete movies." actionLabel="Add movie" onAction={() => setEditing('new')} />
      <div className="surface">
        <div className="d-flex flex-wrap gap-2 p-3 border-bottom border-secondary-subtle">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search title, cast or director" />
          <label htmlFor="movie-status" className="visually-hidden">Status</label>
          <select id="movie-status" className="form-select w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="all">All statuses</option>
            <option value="now-showing">Now showing</option>
            <option value="coming-soon">Coming soon</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <TableState loading={loading} error={error} onRetry={reload} empty={!data?.items.length} emptyText="No movies match.">
          <table className="table table-hover">
            <thead>
              <tr><th scope="col">Movie</th><th scope="col">Language</th><th scope="col">Release</th><th scope="col">Status</th><th scope="col">Rating</th><th scope="col" className="text-end">Actions</th></tr>
            </thead>
            <tbody>
              {data?.items.map((m) => (
                <tr key={m._id}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <Poster src={m.posterUrl} alt="" className="table-thumb" />
                      <div>
                        <div className="fw-semibold">{m.movieName} {m.featured && <span className="badge text-bg-danger ms-1">Featured</span>}</div>
                        <div className="small text-muted">{m.genres.join(', ')} · {formatDuration(m.durationMins)} · {m.certification}</div>
                      </div>
                    </div>
                  </td>
                  <td>{m.language}</td>
                  <td className="small">{formatDate(m.releaseDate)}</td>
                  <td><span className="badge text-bg-dark border border-secondary">{STATUS_LABEL[m.status]}</span></td>
                  <td className="small">{m.reviewCount ? `${m.avgRating.toFixed(1)} (${m.reviewCount})` : '—'}</td>
                  <td className="text-end text-nowrap">
                    <button type="button" className="btn btn-ghost btn-icon" onClick={() => setEditing(m)} aria-label={`Edit ${m.movieName}`}><FiEdit2 /></button>
                    <button type="button" className="btn btn-ghost btn-icon text-danger" onClick={() => setDeleting(m)} aria-label={`Delete ${m.movieName}`}><FiTrash2 /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableState>
      </div>
      {data && <Pagination page={page} totalPages={data.pagination.totalPages} onChange={setPage} />}

      <Modal open={Boolean(editing)} title={editing === 'new' ? 'Add movie' : `Edit ${editing?.movieName || ''}`} onClose={() => setEditing(null)} size={760}>
        {editing && (
          <MovieForm
            movie={editing === 'new' ? null : editing}
            genres={filters.data?.genres || []}
            onCancel={() => setEditing(null)}
            onSaved={(m) => {
              toast.success(`"${m.movieName}" saved`);
              setEditing(null);
              reload();
            }}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete movie?"
        message={`"${deleting?.movieName}" and its shows, reviews and favourites will be deleted. Movies with active bookings cannot be deleted — archive them instead.`}
        confirmLabel="Delete movie"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
