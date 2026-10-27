import { useState } from 'react';
import toast from 'react-hot-toast';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { theatreApi } from '../../api/services';
import { getErrorMessage } from '../../api/client';
import useAsync from '../../hooks/useAsync';
import useDebounce from '../../hooks/useDebounce';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import FormField, { fieldErrors } from '../../components/forms/FormField';
import { AdminHeader, SearchInput, TableState } from '../../components/admin/AdminToolbar';
import { formatCurrency, SECTION_LABELS } from '../../utils/format';

const SECTIONS = ['lower', 'middle', 'balcony'];
const DEFAULT_LAYOUT = {
  lower: { rows: 3, seatsPerRow: 14, price: 180 },
  middle: { rows: 5, seatsPerRow: 16, price: 250 },
  balcony: { rows: 3, seatsPerRow: 14, price: 350 },
};

function TheatreForm({ theatre, onSaved, onCancel }) {
  const [form, setForm] = useState(() => ({
    theatreName: theatre?.theatreName || '',
    city: theatre?.city || '',
    address: theatre?.address || '',
    screens: theatre?.screens.join(', ') || 'Screen 1',
    amenities: theatre?.amenities.join(', ') || '',
    isActive: theatre ? theatre.isActive : true,
    seatLayout: structuredClone(theatre?.seatLayout || DEFAULT_LAYOUT),
  }));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const setLayout = (section, key) => (e) =>
    setForm((f) => ({ ...f, seatLayout: { ...f.seatLayout, [section]: { ...f.seatLayout[section], [key]: e.target.value } } }));

  const layoutNumbers = Object.fromEntries(
    SECTIONS.map((s) => [s, { rows: Number(form.seatLayout[s].rows), seatsPerRow: Number(form.seatLayout[s].seatsPerRow), price: Number(form.seatLayout[s].price) }])
  );
  const totalRows = SECTIONS.reduce((n, s) => n + (layoutNumbers[s].rows || 0), 0);
  const totalSeats = SECTIONS.reduce((n, s) => n + (layoutNumbers[s].rows || 0) * (layoutNumbers[s].seatsPerRow || 0), 0);

  const validate = () => {
    const e = {};
    if (form.theatreName.trim().length < 2) e.theatreName = 'Theatre name is required';
    if (form.city.trim().length < 2) e.city = 'City is required';
    if (form.address.trim().length < 5) e.address = 'Address is required';
    if (!form.screens.split(',').map((s) => s.trim()).filter(Boolean).length) e.screens = 'Add at least one screen';
    for (const s of SECTIONS) {
      const l = layoutNumbers[s];
      if (!Number.isInteger(l.rows) || l.rows < 0) e[`${s}.rows`] = 'Whole number ≥ 0';
      if (!Number.isInteger(l.seatsPerRow) || l.seatsPerRow < 1 || l.seatsPerRow > 30) e[`${s}.seatsPerRow`] = '1–30';
      if (!(l.price >= 0 && l.price <= 10000)) e[`${s}.price`] = '0–10000';
    }
    if (totalRows < 1 || totalRows > 26) e.layout = 'The layout must have between 1 and 26 rows in total.';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (saving || !validate()) return;
    setSaving(true);
    setFormError('');
    const body = {
      theatreName: form.theatreName.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
      screens: [...new Set(form.screens.split(',').map((s) => s.trim()).filter(Boolean))],
      amenities: form.amenities.split(',').map((s) => s.trim()).filter(Boolean),
      isActive: form.isActive,
      seatLayout: layoutNumbers,
    };
    try {
      const res = theatre ? await theatreApi.update(theatre._id, body) : await theatreApi.create(body);
      onSaved(res.theatre);
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
        <FormField className="col-md-7" label="Theatre name" value={form.theatreName} onChange={set('theatreName')} error={errors.theatreName} />
        <FormField className="col-md-5" label="City" value={form.city} onChange={set('city')} error={errors.city} />
      </div>
      <FormField label="Address" value={form.address} onChange={set('address')} error={errors.address} />
      <div className="row">
        <FormField className="col-md-6" label="Screens" hint="Comma-separated, e.g. Screen 1, Screen 2" value={form.screens} onChange={set('screens')} error={errors.screens} />
        <FormField className="col-md-6" label="Amenities" hint="Comma-separated" value={form.amenities} onChange={set('amenities')} />
      </div>

      <fieldset className="surface-2 p-3 mb-3">
        <legend className="form-label float-none w-auto px-1 mb-2">Seat layout</legend>
        <p className="small text-muted">Rows are lettered from the screen: lower stall first, then middle, then balcony.</p>
        <div className="table-responsive">
          <table className="table table-sm">
            <thead><tr><th scope="col">Section</th><th scope="col">Rows</th><th scope="col">Seats / row</th><th scope="col">Price (₹)</th></tr></thead>
            <tbody>
              {SECTIONS.map((s) => (
                <tr key={s}>
                  <th scope="row" className="fw-normal">{SECTION_LABELS[s]}</th>
                  {['rows', 'seatsPerRow', 'price'].map((k) => (
                    <td key={k}>
                      <input
                        type="number"
                        min={k === 'seatsPerRow' ? 1 : 0}
                        className={`form-control form-control-sm${errors[`${s}.${k}`] ? ' is-invalid' : ''}`}
                        value={form.seatLayout[s][k]}
                        onChange={setLayout(s, k)}
                        aria-label={`${SECTION_LABELS[s]} ${k === 'seatsPerRow' ? 'seats per row' : k}`}
                      />
                      {errors[`${s}.${k}`] && <div className="invalid-feedback d-block">{errors[`${s}.${k}`]}</div>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={`small m-0 ${errors.layout ? 'text-danger' : 'text-muted'}`}>
          {errors.layout || `${totalRows} rows · ${totalSeats} seats in total.`} {theatre && 'Changes apply to shows created after saving.'}
        </p>
      </fieldset>

      <div className="form-check form-switch mb-3">
        <input className="form-check-input" type="checkbox" role="switch" id="theatre-active" checked={form.isActive} onChange={set('isActive')} />
        <label className="form-check-label" htmlFor="theatre-active">Active (visible to customers)</label>
      </div>
      <div className="d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-outline-light" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
          {theatre ? 'Save theatre' : 'Create theatre'}
        </button>
      </div>
    </form>
  );
}

export default function AdminTheatres() {
  useDocumentTitle('Manage theatres');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(q.trim());
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useAsync(
    () => theatreApi.list({ q: debounced || undefined, includeInactive: 'true', page, limit: 10 }),
    [debounced, page]
  );

  const remove = async () => {
    setBusy(true);
    try {
      await theatreApi.remove(deleting._id);
      toast.success(`${deleting.theatreName} deleted`);
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
      <AdminHeader title="Theatres" subtitle="Manage cinemas, screens and seat layouts." actionLabel="Add theatre" onAction={() => setEditing('new')} />
      <div className="surface">
        <div className="p-3 border-bottom border-secondary-subtle d-flex">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search name, city or address" />
        </div>
        <TableState loading={loading} error={error} onRetry={reload} empty={!data?.items.length} emptyText="No theatres yet.">
          <table className="table table-hover">
            <thead>
              <tr><th scope="col">Theatre</th><th scope="col">Screens</th><th scope="col">Seats</th><th scope="col">Prices</th><th scope="col">Status</th><th scope="col" className="text-end">Actions</th></tr>
            </thead>
            <tbody>
              {data?.items.map((t) => (
                <tr key={t._id}>
                  <td><div className="fw-semibold">{t.theatreName}</div><div className="small text-muted">{t.city} · {t.address}</div></td>
                  <td className="small">{t.screens.join(', ')}</td>
                  <td>{t.totalSeats}</td>
                  <td className="small text-nowrap">{SECTIONS.map((s) => formatCurrency(t.seatLayout[s].price)).join(' / ')}</td>
                  <td>{t.isActive ? <span className="badge text-bg-success">Active</span> : <span className="badge text-bg-secondary">Inactive</span>}</td>
                  <td className="text-end text-nowrap">
                    <button type="button" className="btn btn-ghost btn-icon" onClick={() => setEditing(t)} aria-label={`Edit ${t.theatreName}`}><FiEdit2 /></button>
                    <button type="button" className="btn btn-ghost btn-icon text-danger" onClick={() => setDeleting(t)} aria-label={`Delete ${t.theatreName}`}><FiTrash2 /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableState>
      </div>
      {data && <Pagination page={page} totalPages={data.pagination.totalPages} onChange={setPage} />}

      <Modal open={Boolean(editing)} title={editing === 'new' ? 'Add theatre' : `Edit ${editing?.theatreName || ''}`} onClose={() => setEditing(null)} size={760}>
        {editing && (
          <TheatreForm
            theatre={editing === 'new' ? null : editing}
            onCancel={() => setEditing(null)}
            onSaved={(t) => {
              toast.success(`${t.theatreName} saved`);
              setEditing(null);
              reload();
            }}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete theatre?"
        message={`${deleting?.theatreName} and all of its shows will be deleted. Theatres with active bookings cannot be deleted — mark them inactive instead.`}
        confirmLabel="Delete theatre"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
