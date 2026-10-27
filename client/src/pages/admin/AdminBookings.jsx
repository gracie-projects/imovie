import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiXCircle, FiExternalLink } from 'react-icons/fi';
import { adminApi, bookingApi } from '../../api/services';
import { getErrorMessage } from '../../api/client';
import useAsync from '../../hooks/useAsync';
import useDebounce from '../../hooks/useDebounce';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import { BookingStatusBadge, PaymentStatusBadge } from '../../components/common/StatusBadge';
import { AdminHeader, SearchInput, TableState } from '../../components/admin/AdminToolbar';
import { formatCurrency, formatDateTime } from '../../utils/format';

export default function AdminBookings() {
  useDocumentTitle('Manage bookings');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(q.trim());
  const [cancelling, setCancelling] = useState(null);
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useAsync(
    () => adminApi.bookings({ q: debounced || undefined, status: status || undefined, page, limit: 15 }),
    [debounced, status, page]
  );

  const cancel = async () => {
    setBusy(true);
    try {
      await bookingApi.cancel(cancelling._id, 'Cancelled by administrator');
      toast.success(`Booking ${cancelling.bookingReference} cancelled`);
      setCancelling(null);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AdminHeader title="Bookings" subtitle="Search, inspect and cancel customer bookings." />
      <div className="surface">
        <div className="d-flex flex-wrap gap-2 p-3 border-bottom border-secondary-subtle">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Reference, movie, customer name or email" />
          <label htmlFor="b-status" className="visually-hidden">Status</label>
          <select id="b-status" className="form-select w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Awaiting payment</option>
            <option value="cancelled">Cancelled</option>
            <option value="failed">Payment failed</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <TableState loading={loading} error={error} onRetry={reload} empty={!data?.items.length} emptyText="No bookings found.">
          <table className="table table-hover">
            <thead>
              <tr><th scope="col">Reference</th><th scope="col">Customer</th><th scope="col">Show</th><th scope="col">Seats</th><th scope="col">Amount</th><th scope="col">Status</th><th scope="col" className="text-end">Actions</th></tr>
            </thead>
            <tbody>
              {data?.items.map((b) => (
                <tr key={b._id}>
                  <td className="font-monospace small">{b.bookingReference}<div className="text-muted">{formatDateTime(b.createdAt)}</div></td>
                  <td className="small">{b.user?.username || '—'}<div className="text-muted">{b.user?.email}</div></td>
                  <td className="small">{b.snapshot?.movieName}<div className="text-muted">{b.snapshot?.theatreName} · {formatDateTime(b.showStartsAt)}</div></td>
                  <td className="small">{b.seats.join(', ')}</td>
                  <td>{formatCurrency(b.totalAmount)}</td>
                  <td>
                    <div className="d-flex flex-column gap-1 align-items-start">
                      <BookingStatusBadge status={b.status} />
                      <PaymentStatusBadge status={b.paymentStatus} isDemo={b.isDemoPayment} />
                    </div>
                  </td>
                  <td className="text-end text-nowrap">
                    <Link to={`/bookings/${b._id}`} className="btn btn-ghost btn-icon" aria-label={`Open booking ${b.bookingReference}`}><FiExternalLink /></Link>
                    {(b.status === 'confirmed' || b.status === 'pending') && (
                      <button type="button" className="btn btn-ghost btn-icon text-danger" onClick={() => setCancelling(b)} aria-label={`Cancel booking ${b.bookingReference}`}>
                        <FiXCircle />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableState>
      </div>
      {data && <Pagination page={page} totalPages={data.pagination.totalPages} onChange={setPage} />}
      <ConfirmDialog
        open={Boolean(cancelling)}
        title="Cancel booking?"
        message={`Booking ${cancelling?.bookingReference} will be cancelled, its seats released and any payment refunded.`}
        confirmLabel="Cancel booking"
        cancelLabel="Keep"
        busy={busy}
        onConfirm={cancel}
        onCancel={() => setCancelling(null)}
      />
    </>
  );
}
