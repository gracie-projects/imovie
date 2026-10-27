import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiRefreshCw, FiInfo } from 'react-icons/fi';
import { showApi, bookingApi } from '../api/services';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import useAsync from '../hooks/useAsync';
import useDocumentTitle from '../hooks/useDocumentTitle';
import SeatMap, { SeatLegend } from '../components/booking/SeatMap';
import { ErrorState, Spinner } from '../components/common/States';
import NotFound from './NotFound';
import { formatCurrency, formatDateTime, compareSeats, SECTION_LABELS } from '../utils/format';

const REFRESH_MS = 20000;
const draftKey = (showId) => `imovies:seats:${showId}`;

export default function SeatSelection() {
  const { showId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data, loading, error, status, reload } = useAsync(() => showApi.seats(showId), [showId, user?._id]);
  const [selected, setSelected] = useState(() => {
    // Restore a selection made before being sent to the login page.
    try {
      const saved = JSON.parse(sessionStorage.getItem(draftKey(showId)) || '[]');
      return Array.isArray(saved) ? saved.filter((s) => typeof s === 'string') : [];
    } catch {
      return [];
    }
  });
  const [submitting, setSubmitting] = useState(false);
  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    try {
      sessionStorage.removeItem(draftKey(showId));
    } catch {
      /* storage unavailable: nothing to clean up */
    }
  }, [showId]);
  useDocumentTitle(data ? `Seats – ${data.show.movie.movieName}` : 'Select seats');

  // The seat map is refreshed periodically (polling, not real-time push).
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') reload();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [reload]);

  // Drop selected seats that someone else has taken since the last refresh.
  useEffect(() => {
    if (!data) return;
    const taken = new Set([...data.booked, ...data.held]);
    const lost = selectedRef.current.filter((s) => taken.has(s));
    if (!lost.length) return;
    toast.error(`Seat${lost.length > 1 ? 's' : ''} ${lost.join(', ')} ${lost.length > 1 ? 'are' : 'is'} no longer available`);
    setSelected((prev) => prev.filter((s) => !taken.has(s)));
  }, [data]);

  const seatInfo = useMemo(() => {
    const map = new Map();
    data?.sections.forEach((section) => section.rows.forEach((row) => row.seats.forEach((s) => map.set(s, section))));
    return map;
  }, [data]);

  const max = data?.rules.maxSeatsPerBooking || 10;
  const onToggle = useCallback(
    (seatId) => {
      setSelected((prev) => {
        if (prev.includes(seatId)) return prev.filter((s) => s !== seatId);
        if (prev.length >= max) {
          toast.error(`You can select up to ${max} seats per booking`);
          return prev;
        }
        return [...prev, seatId];
      });
    },
    [max]
  );

  // Estimated on the client for display only; the server recalculates the real amount.
  const estimate = useMemo(() => {
    const bySection = {};
    let subtotal = 0;
    for (const seat of selected) {
      const section = seatInfo.get(seat);
      if (!section) continue;
      bySection[section.key] = bySection[section.key] || { name: section.name, price: section.price, seats: [] };
      bySection[section.key].seats.push(seat);
      subtotal += section.price;
    }
    return { bySection: Object.values(bySection), subtotal };
  }, [selected, seatInfo]);

  const proceed = async () => {
    if (!user) {
      try {
        sessionStorage.setItem(draftKey(showId), JSON.stringify(selected));
      } catch {
        /* storage unavailable: the selection simply isn't restored */
      }
      toast('Please log in to continue booking', { icon: '🔒' });
      navigate('/login', { state: { from: location } });
      return;
    }
    setSubmitting(true);
    try {
      const { hold } = await bookingApi.holdSeats(showId, selected);
      const { booking } = await bookingApi.create(hold.holdId);
      navigate(`/checkout/${booking._id}`);
    } catch (err) {
      const unavailable = err.response?.data?.details?.unavailableSeats;
      toast.error(getErrorMessage(err));
      if (unavailable) setSelected((prev) => prev.filter((s) => !unavailable.includes(s)));
      reload();
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 404 || status === 400) return <NotFound message="This show does not exist." />;
  if (error && !data) return <div className="container py-5"><ErrorState message={error} onRetry={reload} /></div>;
  if (!data) return <Spinner label="Loading seat map…" />;

  const { show } = data;
  const heldByMe = data.heldByMe.length;

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <Link to={`/movies/${show.movie._id}`} className="btn btn-ghost btn-sm mb-2">
            <FiArrowLeft aria-hidden="true" /> Back to showtimes
          </Link>
          <h1 className="h3 fw-bold m-0">{show.movie.movieName}</h1>
          <p className="text-muted m-0 small">
            {show.theatre.theatreName}, {show.theatre.city} · {show.screen} · {formatDateTime(show.startsAt)} · {show.format} · {show.language || show.movie.language}
          </p>
        </div>
        <button type="button" className="btn btn-outline-light btn-sm" onClick={reload} disabled={loading}>
          <FiRefreshCw className={loading ? 'spin' : ''} aria-hidden="true" /> Refresh seats
        </button>
      </div>

      {!show.bookable && (
        <div className="alert alert-warning" role="alert">Booking is closed for this show.</div>
      )}
      {heldByMe > 0 && (
        <div className="alert alert-info small d-flex gap-2 align-items-center" role="status">
          <FiInfo aria-hidden="true" /> You have an unfinished checkout for this show. Choosing seats again will replace it.
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="surface p-3 p-md-4">
            <SeatMap sections={data.sections} booked={data.booked} held={data.held} selected={selected} onToggle={onToggle} disabled={!show.bookable} />
            <hr className="border-secondary-subtle" />
            <SeatLegend />
            <p className="small text-muted text-center mt-3 mb-0">
              Seat availability refreshes every {REFRESH_MS / 1000} seconds. Seats are only reserved once you continue to checkout.
            </p>
          </div>
        </div>

        <div className="col-lg-4">
          <aside className="surface p-4 sticky-summary" aria-labelledby="summary-title">
            <h2 id="summary-title" className="h5 fw-semibold">Booking summary</h2>
            {selected.length === 0 ? (
              <p className="text-muted small">Select up to {max} seats on the map. Prices differ by section.</p>
            ) : (
              <>
                <ul className="list-unstyled small d-grid gap-2 mt-3">
                  {estimate.bySection.map((s) => (
                    <li key={s.name} className="d-flex justify-content-between gap-2">
                      <span>
                        {s.name} × {s.seats.length}
                        <span className="d-block text-muted">{s.seats.sort(compareSeats).join(', ')}</span>
                      </span>
                      <span>{formatCurrency(s.price * s.seats.length)}</span>
                    </li>
                  ))}
                </ul>
                <div className="d-flex justify-content-between fw-semibold border-top border-secondary-subtle pt-2">
                  <span>Ticket subtotal</span>
                  <span>{formatCurrency(estimate.subtotal)}</span>
                </div>
                <p className="small text-muted mt-1">Convenience fee and GST are added at checkout.</p>
              </>
            )}
            <button
              type="button"
              className="btn btn-primary w-100 btn-lg mt-2 d-none d-lg-block"
              disabled={!selected.length || submitting || !show.bookable}
              onClick={proceed}
            >
              {submitting && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
              {selected.length ? `Continue with ${selected.length} seat${selected.length > 1 ? 's' : ''}` : 'Select seats'}
            </button>
            <p className="small text-muted mt-3 mb-0">
              Seats are held for {data.rules.holdMinutes} minutes while you complete payment.
            </p>
            <ul className="small text-muted mt-2 mb-0 ps-3">
              {Object.entries(SECTION_LABELS).map(([k, v]) => {
                const section = data.sections.find((s) => s.key === k);
                return section ? <li key={k}>{v}: {formatCurrency(section.price)}</li> : null;
              })}
            </ul>
          </aside>
        </div>
      </div>

      <div className="mobile-checkout-bar d-lg-none mt-3 p-3 d-flex align-items-center justify-content-between gap-3">
        <div>
          <div className="fw-semibold">{formatCurrency(estimate.subtotal)}</div>
          <div className="small text-muted">{selected.length} seat{selected.length === 1 ? '' : 's'} · {[...selected].sort(compareSeats).join(', ') || 'none'}</div>
        </div>
        <button type="button" className="btn btn-primary" disabled={!selected.length || submitting || !show.bookable} onClick={proceed}>
          {submitting && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
          Continue
        </button>
      </div>
    </div>
  );
}
