import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiClock, FiAlertCircle } from 'react-icons/fi';
import { bookingApi } from '../api/services';
import { getErrorMessage } from '../api/client';
import useAsync from '../hooks/useAsync';
import useCountdown from '../hooks/useCountdown';
import useDocumentTitle from '../hooks/useDocumentTitle';
import Poster from '../components/common/Poster';
import PriceBreakdown from '../components/booking/PriceBreakdown';
import DemoPaymentModal from '../components/booking/DemoPaymentModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { EmptyState, ErrorState, Spinner } from '../components/common/States';
import NotFound from './NotFound';
import { formatCountdown, formatDateTime } from '../utils/format';

export default function Checkout() {
  useDocumentTitle('Checkout');
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { data, error, status, reload, setData } = useAsync(() => bookingApi.get(bookingId), [bookingId]);
  const booking = data?.booking;
  const secondsLeft = useCountdown(booking?.status === 'pending' ? booking.holdExpiresAt : null);
  const [payOpen, setPayOpen] = useState(false);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [failure, setFailure] = useState('');

  useEffect(() => {
    if (booking?.status === 'confirmed') navigate(`/bookings/${booking._id}/confirmation`, { replace: true });
  }, [booking, navigate]);

  const expired = booking?.status === 'pending' && secondsLeft === 0;
  useEffect(() => {
    if (expired) setPayOpen(false);
  }, [expired]);

  if (status === 404 || status === 400) return <NotFound message="This booking does not exist." />;
  if (error) return <div className="container py-5"><ErrorState message={error} onRetry={reload} /></div>;
  if (!booking) return <Spinner label="Loading your booking…" />;

  const s = booking.snapshot;
  const seatPage = `/shows/${booking.show}/seats`;

  const release = async () => {
    setReleasing(true);
    try {
      await bookingApi.cancel(booking._id, 'Released by customer at checkout');
      toast.success('Your seats have been released');
      navigate(seatPage);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setReleasing(false);
    }
  };

  if (booking.status !== 'pending' || expired) {
    const message = failure || (expired || booking.status === 'expired'
      ? 'Your seat hold expired before payment was completed, so the seats were released.'
      : booking.status === 'failed'
        ? 'The payment did not go through, so your seats were released. You have not been charged.'
        : 'This booking is no longer active.');
    return (
      <div className="container py-5">
        <EmptyState
          icon={<FiAlertCircle />}
          title={booking.status === 'failed' ? 'Payment failed' : 'Checkout closed'}
          message={message}
          action={
            <div className="d-flex gap-2 justify-content-center">
              <Link to={seatPage} className="btn btn-primary">Choose seats again</Link>
              <Link to="/bookings" className="btn btn-outline-light">My bookings</Link>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <h1 className="section-title" style={{ fontSize: '2.6rem' }}>
          Review &amp; <span className="accent">Pay</span>
        </h1>
        <div className={`chip fs-6 ${secondsLeft < 60 ? 'text-warning border-warning' : ''}`} role="timer" aria-live={secondsLeft < 60 ? 'assertive' : 'off'}>
          <FiClock aria-hidden="true" /> Seats held for <strong className="font-monospace">{formatCountdown(secondsLeft)}</strong>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="surface p-4 d-flex gap-4">
            <Poster src={s.posterUrl} alt="" style={{ width: 110, aspectRatio: '2/3', objectFit: 'cover', borderRadius: 12 }} />
            <div>
              <h2 className="h4 fw-bold">{s.movieName}</h2>
              <p className="text-muted small mb-2">
                {s.certification} · {s.language} · {s.format}
              </p>
              <p className="mb-1"><strong>{s.theatreName}</strong>, {s.city}</p>
              <p className="mb-1 text-muted small">{s.address}</p>
              <p className="mb-1">{formatDateTime(booking.showStartsAt)} · {s.screen}</p>
              <p className="mb-0">
                Seats: <strong>{booking.seats.join(', ')}</strong>
              </p>
            </div>
          </div>
          <div className="surface p-4 mt-4 small text-muted">
            <h2 className="h6 text-white">Before you pay</h2>
            <ul className="mb-0 ps-3">
              <li>Prices are calculated by the server from the show&apos;s seat prices.</li>
              <li>Your seats are reserved until the timer runs out. Unpaid seats are released automatically.</li>
              <li>Confirmed bookings can be cancelled up to {data.cancellation.cutoffHours} hours before the show for a full refund.</li>
            </ul>
          </div>
        </div>
        <div className="col-lg-5">
          <aside className="surface p-4 sticky-summary">
            <h2 className="h5 fw-semibold mb-3">Price details</h2>
            <PriceBreakdown booking={booking} />
            <p className="small text-muted mt-3">Booking reference <span className="font-monospace text-white">{booking.bookingReference}</span></p>
            <button type="button" className="btn btn-primary btn-lg w-100 mt-2" onClick={() => setPayOpen(true)}>
              Proceed to payment
            </button>
            <button type="button" className="btn btn-ghost w-100 mt-2" onClick={() => setConfirmRelease(true)}>
              Cancel and release seats
            </button>
          </aside>
        </div>
      </div>

      <DemoPaymentModal
        open={payOpen}
        booking={booking}
        onClose={() => setPayOpen(false)}
        onSuccess={(confirmed) => {
          setPayOpen(false);
          toast.success('Payment successful – enjoy the show!');
          navigate(`/bookings/${confirmed._id}/confirmation`, { replace: true });
        }}
        onFailure={(failedBooking, message) => {
          setPayOpen(false);
          setFailure(message || 'The payment was declined.');
          toast.error(message || 'Payment failed');
          if (failedBooking) setData((d) => ({ ...d, booking: failedBooking }));
          else reload();
        }}
      />
      <ConfirmDialog
        open={confirmRelease}
        title="Release your seats?"
        message="Your selected seats will be made available to other customers."
        confirmLabel="Release seats"
        busy={releasing}
        onConfirm={release}
        onCancel={() => setConfirmRelease(false)}
      />
    </div>
  );
}
