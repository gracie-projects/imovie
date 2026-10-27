import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiEdit2, FiTrash2, FiEye, FiEyeOff } from 'react-icons/fi';
import { movieApi, showApi, theatreApi } from '../../api/services';
import { getErrorMessage } from '../../api/client';
import useAsync from '../../hooks/useAsync';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import FormField, { fieldErrors } from '../../components/forms/FormField';
import { AdminHeader, TableState } from '../../components/admin/AdminToolbar';
import { formatCurrency, formatDateTime, toDateTimeLocal, SECTION_LABELS } from '../../utils/format';

const FORMATS = ['2D', '3D', 'IMAX', '4DX'];
const SECTIONS = ['lower', 'middle', 'balcony'];

function ShowForm({ show, movies, theatres, onSaved, onCancel }) {
  const [form, setForm] = useState(() => ({
    movie: show?.movie?._id || '',
    theatre: show?.theatre?._id || '',
    screen: show?.screen || '',
    startsAt: show ? toDateTimeLocal(show.startsAt) : '',
    format: show?.format || '2D',
    language: show?.language || '',
    isActive: show ? show.isActive : true,
    prices: show ? Object.fromEntries(SECTIONS.map((s) => [s, show.seatLayout[s].price])) : { lower: '', middle: '', balcony: '' },
  }));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const theatre = useMemo(() => theatres.find((t) => t._id === form.theatre), [theatres, form.theatre]);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const validate = () => {
    const e = {};
    if (!show && !form.movie) e.movie = 'Select a movie';
    if (!show && !form.theatre) e.theatre = 'Select a theatre';
    if (!form.screen) e.screen = 'Select a screen';
    if (!form.startsAt) e.startsAt = 'Choose the date and time';
    else if (new Date(form.startsAt) <= new Date() && (!show || toDateTimeLocal(show.startsAt) !== form.startsAt)) e.startsAt = 'Show time must be in the future';
    SECTIONS.forEach((s) => {
      const v = form.prices[s];
      if (v !== '' && !(Number(v) >= 0 && Number(v) <= 10000)) e[`prices.${s}`] = '0–10000';
    });
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (saving || !validate()) return;
    setSaving(true);
    setFormError('');
    const prices = Object.fromEntries(SECTIONS.filter((s) => form.prices[s] !== '').map((s) => [s, Number(form.prices[s])]));
    const body = {
      screen: form.screen,
      startsAt: new Date(form.startsAt).toISOString(),
      format: form.format,
      language: form.language.trim() || undefined,
      prices,
    };
    try {
      const res = show
        ? await showApi.update(show._id, { ...body, isActive: form.isActive })
        : await showApi.create({ ...body, movie: form.movie, theatre: form.theatre });
      onSaved(res.show);
    } catch (err) {
      setErrors(fieldErrors(err));
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      {formError && <div className="alert alert-danger py-2 small" role="alert">{formError}</div>}
      <div className="row">
        <FormField className="col-md-6" label="Movie" error={errors.movie}>
          {({ id, invalid }) => (
            <select id={id} className={`form-select${invalid ? ' is-invalid' : ''}`} value={form.movie} onChange={set('movie')} disabled={Boolean(show)}>
              <option value="">Select a movie…</option>
              {movies.map((m) => <option key={m._id} value={m._id}>{m.movieName} ({m.language})</option>)}
            </select>
          )}
        </FormField>
        <FormField className="col-md-6" label="Theatre" error={errors.theatre}>
          {({ id, invalid }) => (
            <select
              id={id}
              className={`form-select${invalid ? ' is-invalid' : ''}`}
              value={form.theatre}
              onChange={(e) => setForm((f) => ({ ...f, theatre: e.target.value, screen: '' }))}
              disabled={Boolean(show)}
            >
              <option value="">Select a theatre…</option>
              {theatres.map((t) => <option key={t._id} value={t._id}>{t.theatreName}, {t.city}{t.isActive ? '' : ' (inactive)'}</option>)}
            </select>
          )}
        </FormField>
      </div>
      <div className="row">
        <FormField className="col-md-4" label="Screen" error={errors.screen}>
          {({ id, invalid }) => (
            <select id={id} className={`form-select${invalid ? ' is-invalid' : ''}`} value={form.screen} onChange={set('screen')} disabled={!theatre}>
              <option value="">{theatre ? 'Select…' : 'Choose a theatre first'}</option>
              {theatre?.screens.map((s) => <option key={s}>{s}</option>)}
            </select>
          )}
        </FormField>
        <FormField className="col-md-5" label="Date & time" type="datetime-local" value={form.startsAt} onChange={set('startsAt')} error={errors.startsAt} />
        <FormField className="col-md-3" label="Format">
          {({ id }) => (
            <select id={id} className="form-select" value={form.format} onChange={set('format')}>
              {FORMATS.map((f) => <option key={f}>{f}</option>)}
            </select>
          )}
        </FormField>
      </div>
      <FormField label="Language" hint="Defaults to the movie's language" value={form.language} onChange={set('language')} />
      <fieldset className="surface-2 p-3 mb-3">
        <legend className="form-label float-none w-auto px-1 mb-2">Ticket prices (₹)</legend>
        <div className="row g-2">
          {SECTIONS.map((s) => (
            <div className="col-4" key={s}>
              <label htmlFor={`price-${s}`} className="small text-muted">{SECTION_LABELS[s]}</label>
              <input
                id={`price-${s}`}
                type="number"
                min={0}
                className={`form-control${errors[`prices.${s}`] ? ' is-invalid' : ''}`}
                placeholder={theatre ? String(theatre.seatLayout[s].price) : 'Theatre default'}
                value={form.prices[s]}
                onChange={(e) => setForm((f) => ({ ...f, prices: { ...f.prices, [s]: e.target.value } }))}
              />
            </div>
          ))}
        </div>
        <p className="small text-muted mt-2 mb-0">
          {show ? 'New prices apply to future bookings only.' : 'Leave blank to use the theatre’s standard prices.'}
        </p>
      </fieldset>
      {show && (
        <div className="form-check form-switch mb-3">
          <input className="form-check-input" type="checkbox" role="switch" id="show-active" checked={form.isActive} onChange={set('isActive')} />
          <label className="form-check-label" htmlFor="show-active">Open for booking</label>
        </div>
      )}
      <div className="d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-outline-light" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
          {show ? 'Save show' : 'Create show'}
        </button>
      </div>
    </form>
  );
}

export default function AdminShows() {
  useDocumentTitle('Manage shows');
  const [movie, setMovie] = useState('');
  const [theatre, setTheatre] = useState('');
  const [includePast, setIncludePast] = useState(false);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const movies = useAsync(() => movieApi.list({ status: 'all', sort: 'title', limit: 60 }), []);
  const theatres = useAsync(() => theatreApi.list({ includeInactive: 'true', limit: 100 }), []);
  const { data, loading, error, reload } = useAsync(
    () =>
      showApi.list({
        movie: movie || undefined,
        theatre: theatre || undefined,
        includeInactive: 'true',
        includePast: includePast ? 'true' : undefined,
        page,
        limit: 15,
      }),
    [movie, theatre, includePast, page]
  );

  const toggleActive = async (show) => {
    try {
      await showApi.update(show._id, { isActive: !show.isActive });
      toast.success(show.isActive ? 'Show closed for booking' : 'Show opened for booking');
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await showApi.remove(deleting._id);
      toast.success('Show deleted');
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const resetPage = (fn) => (e) => {
    fn(e.target.type === 'checkbox' ? e.target.checked : e.target.value);
    setPage(1);
  };

  return (
    <>
      <AdminHeader title="Shows" subtitle="Schedule screenings and set prices." actionLabel="Add show" onAction={() => setEditing('new')} />
      <div className="surface">
        <div className="d-flex flex-wrap gap-2 p-3 border-bottom border-secondary-subtle align-items-center">
          <label htmlFor="f-movie" className="visually-hidden">Filter by movie</label>
          <select id="f-movie" className="form-select w-auto" value={movie} onChange={resetPage(setMovie)}>
            <option value="">All movies</option>
            {movies.data?.items.map((m) => <option key={m._id} value={m._id}>{m.movieName}</option>)}
          </select>
          <label htmlFor="f-theatre" className="visually-hidden">Filter by theatre</label>
          <select id="f-theatre" className="form-select w-auto" value={theatre} onChange={resetPage(setTheatre)}>
            <option value="">All theatres</option>
            {theatres.data?.items.map((t) => <option key={t._id} value={t._id}>{t.theatreName}</option>)}
          </select>
          <div className="form-check form-switch ms-1">
            <input className="form-check-input" type="checkbox" role="switch" id="f-past" checked={includePast} onChange={resetPage(setIncludePast)} />
            <label className="form-check-label small" htmlFor="f-past">Include past shows</label>
          </div>
        </div>
        <TableState loading={loading} error={error} onRetry={reload} empty={!data?.items.length} emptyText="No shows match these filters.">
          <table className="table table-hover">
            <thead>
              <tr><th scope="col">When</th><th scope="col">Movie</th><th scope="col">Theatre</th><th scope="col">Seats left</th><th scope="col">Prices</th><th scope="col">Status</th><th scope="col" className="text-end">Actions</th></tr>
            </thead>
            <tbody>
              {data?.items.map((s) => (
                <tr key={s._id}>
                  <td className="small text-nowrap">{formatDateTime(s.startsAt)}</td>
                  <td className="small">{s.movie?.movieName || <em className="text-muted">deleted</em>}<div className="text-muted">{s.format} · {s.language}</div></td>
                  <td className="small">{s.theatre?.theatreName}<div className="text-muted">{s.screen}</div></td>
                  <td>{s.seatsAvailable}/{s.seatsTotal}</td>
                  <td className="small text-nowrap">{SECTIONS.map((k) => formatCurrency(s.seatLayout[k].price)).join(' / ')}</td>
                  <td>
                    {new Date(s.startsAt) < new Date() ? <span className="badge text-bg-secondary">Past</span> : s.isActive ? <span className="badge text-bg-success">Open</span> : <span className="badge text-bg-warning">Closed</span>}
                  </td>
                  <td className="text-end text-nowrap">
                    <Link to={`/shows/${s._id}/seats`} className="btn btn-ghost btn-icon" aria-label="View seat map" title="View seat map"><FiEye /></Link>
                    <button type="button" className="btn btn-ghost btn-icon" onClick={() => toggleActive(s)} aria-label={s.isActive ? 'Close for booking' : 'Open for booking'} title={s.isActive ? 'Close for booking' : 'Open for booking'}>
                      {s.isActive ? <FiEyeOff /> : <FiEye />}
                    </button>
                    <button type="button" className="btn btn-ghost btn-icon" onClick={() => setEditing(s)} aria-label="Edit show"><FiEdit2 /></button>
                    <button type="button" className="btn btn-ghost btn-icon text-danger" onClick={() => setDeleting(s)} aria-label="Delete show"><FiTrash2 /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableState>
      </div>
      {data && <Pagination page={page} totalPages={data.pagination.totalPages} onChange={setPage} />}

      <Modal open={Boolean(editing)} title={editing === 'new' ? 'Add show' : 'Edit show'} onClose={() => setEditing(null)} size={720}>
        {editing && (
          <ShowForm
            show={editing === 'new' ? null : editing}
            movies={(movies.data?.items || []).filter((m) => m.status !== 'archived' || m._id === editing?.movie?._id)}
            theatres={theatres.data?.items || []}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              toast.success('Show saved');
              setEditing(null);
              reload();
            }}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete show?"
        message="This show will be removed. Shows that already have bookings cannot be deleted — close them for booking instead."
        confirmLabel="Delete show"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
