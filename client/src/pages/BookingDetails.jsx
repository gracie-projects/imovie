import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiPrinter, FiXCircle } from 'react-icons/fi';
import { bookingApi } from '../api/services';
import { getErrorMessage } from '../api/client';
import useAsync from '../hooks/useAsync';
import useDocumentTitle from '../hooks/useDocumentTitle';
import Ticket from '../components/booking/Ticket';
import PriceBreakdown from '../components/booking/PriceBreakdown';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { PaymentStatusBadge } from '../components/common/StatusBadge';
import { ErrorState, Spinner } from '../components/common/States';
import NotFound from './NotFound';
import { formatCurrency, formatDateTime } from '../utils/format';

export default function BookingDetails() {
  useDocumentTitle('Booking details');
  const { id } = useParams();
  const { data, error, status, reload } = useAsync(() => bookingApi.get(id), [id]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  if (status === 404 || status === 400) return <NotFound message="This booking does not exist or belongs to another account." />;
  if (error) return <div className="container py-5"><ErrorState message={error} onRetry={reload} /></div>;
  if (!data) return <Spinner />;

  const { booking, payments, cancellation } = data;

  const cancel = async () => {
    setCancelling(true);
    try {
      await bookingApi.cancel(booking._id);
      toast.success(booking.status === 'confirmed' ? 'Booking cancelled. The (demo) amount has been refunded.' : 'Booking cancelled');
      setConfirmOpen(false);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 960 }}>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 no-print">
        <Link to="/bookings" className="btn btn-ghost btn-sm">
          <FiArrowLeft aria-hidden="true" /> My bookings
        </Link>
        <div className="d-flex gap-2">
          {booking.status === 'pending' && (
            <Link to={`/checkout/${booking._id}`} className="btn btn-primary btn-sm">Complete payment</Link>
          )}
          {booking.status === 'confirmed' && (
            <button type="button" className="btn btn-outline-light btn-sm" onClick={() => window.print()}>
              <FiPrinter className="me-1" aria-hidden="true" /> Print ticket
            </button>
          )}
          {cancellation.canCancel && (
            <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setConfirmOpen(true)}>
              <FiXCircle className="me-1" aria-hidden="true" /> Cancel booking
            </button>
          )}
        </div>
      </div>

      <Ticket booking={booking} />

      <div className="row g-4 mt-1 no-print">
        <div className="col-md-6">
          <div className="surface p-4 h-100">
            <h2 className="h6 fw-semibold mb-3">Price breakdown</h2>
            <PriceBreakdown booking={booking} />
          </div>
        </div>
        <div className="col-md-6">
          <div className="surface p-4 h-100">
            <h2 className="h6 fw-semibold mb-3">Status &amp; payments</h2>
            <dl className="small">
              <dt className="text-muted fw-normal">Booked on</dt>
              <dd>{formatDateTime(booking.createdAt)}</dd>
              {booking.cancelledAt && (
                <>
                  <dt className="text-muted fw-normal">Cancelled on</dt>
                  <dd>{formatDateTime(booking.cancelledAt)}</dd>
                </>
              )}
              {booking.cancellationReason && (
                <>
                  <dt className="text-muted fw-normal">Note</dt>
                  <dd>{booking.cancellationReason}</dd>
                </>
              )}
              {booking.status === 'confirmed' && (
                <>
                  <dt className="text-muted fw-normal">Cancellation</dt>
                  <dd>
                    {cancellation.canCancel
                      ? `Free cancellation until ${formatDateTime(cancellation.cancellableUntil)}`
                      : `Cancellation closed ${cancellation.cutoffHours} hours before the show`}
                  </dd>
                </>
              )}
            </dl>
            {payments.length > 0 && (
              <ul className="list-unstyled small d-grid gap-2 m-0">
                {payments.map((p) => (
                  <li key={p._id} className="surface-2 p-2 d-flex justify-content-between align-items-center gap-2">
                    <span>
                      <span className="text-uppercase">{p.method || p.provider}</span> · {formatCurrency(p.amount)}
                      <span className="d-block text-muted font-monospace" style={{ fontSize: '.7rem' }}>{p.providerPaymentId || p.providerOrderId}</span>
                      {p.failureReason && <span className="d-block text-muted">{p.failureReason}</span>}
                    </span>
                    <PaymentStatusBadge status={p.status} isDemo={p.isDemo} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Cancel this booking?"
        message={
          booking.status === 'confirmed'
            ? `Your seats (${booking.seats.join(', ')}) will be released and ${formatCurrency(booking.totalAmount)} refunded (demo refund).`
            : 'Your held seats will be released.'
        }
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
        busy={cancelling}
        onConfirm={cancel}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
