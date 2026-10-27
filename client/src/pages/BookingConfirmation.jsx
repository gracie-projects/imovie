import { Link, Navigate, useParams } from 'react-router-dom';
import { FiCheck, FiPrinter } from 'react-icons/fi';
import { bookingApi } from '../api/services';
import useAsync from '../hooks/useAsync';
import useDocumentTitle from '../hooks/useDocumentTitle';
import Ticket from '../components/booking/Ticket';
import { ErrorState, Spinner } from '../components/common/States';
import NotFound from './NotFound';

export default function BookingConfirmation() {
  useDocumentTitle('Booking confirmed');
  const { id } = useParams();
  const { data, error, status, reload } = useAsync(() => bookingApi.get(id), [id]);

  if (status === 404 || status === 400) return <NotFound message="This booking does not exist." />;
  if (error) return <div className="container py-5"><ErrorState message={error} onRetry={reload} /></div>;
  if (!data) return <Spinner />;
  // The confirmation page is only for confirmed bookings; everything else shows full details.
  if (data.booking.status !== 'confirmed') return <Navigate to={`/bookings/${id}`} replace />;

  return (
    <div className="container py-5" style={{ maxWidth: 900 }}>
      <div className="text-center mb-4 no-print">
        <div className="success-burst mb-3" aria-hidden="true">
          <FiCheck />
        </div>
        <h1 className="section-title" style={{ fontSize: '2.8rem' }}>
          Booking <span className="accent">confirmed!</span>
        </h1>
        <p className="text-muted">
          Your reference is <strong className="font-monospace text-white">{data.booking.bookingReference}</strong>. Show the QR code at the
          entrance.
        </p>
        {data.booking.isDemoPayment && (
          <p className="small text-warning m-0">This was a demo payment – no real money was charged.</p>
        )}
      </div>

      <Ticket booking={data.booking} />

      <div className="d-flex flex-wrap gap-2 justify-content-center mt-4 no-print">
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          <FiPrinter className="me-2" aria-hidden="true" /> Print / save as PDF
        </button>
        <Link to={`/bookings/${id}`} className="btn btn-outline-light">Booking details</Link>
        <Link to="/movies" className="btn btn-ghost">Browse more movies</Link>
      </div>
      <p className="small text-muted text-center mt-3 no-print">
        Email and SMS tickets are not enabled in this project; your ticket is always available under My Bookings.
      </p>
    </div>
  );
}
