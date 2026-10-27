import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCalendar, FiChevronRight } from 'react-icons/fi';
import { bookingApi } from '../api/services';
import useAsync from '../hooks/useAsync';
import useDocumentTitle from '../hooks/useDocumentTitle';
import Poster from '../components/common/Poster';
import Pagination from '../components/common/Pagination';
import { BookingStatusBadge, PaymentStatusBadge } from '../components/common/StatusBadge';
import { EmptyState, ErrorState, LineSkeleton } from '../components/common/States';
import { formatCurrency, formatDateTime } from '../utils/format';

const TABS = [
  ['upcoming', 'Upcoming'],
  ['past', 'Past & cancelled'],
  ['all', 'All'],
];

export default function MyBookings() {
  useDocumentTitle('My bookings');
  const [type, setType] = useState('upcoming');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsync(() => bookingApi.my({ type, page, limit: 8 }), [type, page]);

  return (
    <div className="container py-5" style={{ maxWidth: 960 }}>
      <h1 className="section-title" style={{ fontSize: '2.8rem' }}>
        My <span className="accent">Bookings</span>
      </h1>
      <div className="d-flex gap-2 my-4" role="tablist" aria-label="Booking filter">
        {TABS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={type === value}
            className="chip chip-toggle"
            aria-pressed={type === value}
            onClick={() => {
              setType(value);
              setPage(1);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <LineSkeleton lines={5} />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && !loading && data.items.length === 0 && (
        <EmptyState
          icon={<FiCalendar />}
          title={type === 'upcoming' ? 'No upcoming bookings' : 'No bookings here'}
          message="When you book tickets they will appear here."
          action={<Link to="/movies" className="btn btn-primary">Find a movie</Link>}
        />
      )}
      {data && !loading && (
        <ul className="list-unstyled d-grid gap-3">
          {data.items.map((b) => (
            <li key={b._id}>
              <Link to={`/bookings/${b._id}`} className="surface p-3 d-flex gap-3 align-items-center text-reset text-decoration-none">
                <Poster src={b.snapshot?.posterUrl} alt="" style={{ width: 64, aspectRatio: '2/3', objectFit: 'cover', borderRadius: 8 }} />
                <div className="flex-fill min-w-0">
                  <div className="d-flex flex-wrap gap-2 align-items-center mb-1">
                    <span className="fw-semibold">{b.snapshot?.movieName}</span>
                    <BookingStatusBadge status={b.status} />
                    <PaymentStatusBadge status={b.paymentStatus} isDemo={b.isDemoPayment} />
                  </div>
                  <div className="small text-muted">
                    {formatDateTime(b.showStartsAt)} · {b.snapshot?.theatreName}, {b.snapshot?.city}
                  </div>
                  <div className="small">
                    Seats {b.seats.join(', ')} · {formatCurrency(b.totalAmount)} · <span className="font-monospace">{b.bookingReference}</span>
                  </div>
                </div>
                <FiChevronRight className="text-muted flex-shrink-0" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {data && <Pagination page={page} totalPages={data.pagination.totalPages} onChange={setPage} />}
    </div>
  );
}
