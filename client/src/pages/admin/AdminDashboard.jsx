import { Link } from 'react-router-dom';
import { FiFilm, FiMapPin, FiClock, FiCalendar, FiUsers, FiDollarSign, FiActivity, FiEyeOff } from 'react-icons/fi';
import { adminApi } from '../../api/services';
import useAsync from '../../hooks/useAsync';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { ErrorState, Spinner } from '../../components/common/States';
import { BookingStatusBadge } from '../../components/common/StatusBadge';
import { AdminHeader } from '../../components/admin/AdminToolbar';
import { formatCurrency, formatDateTime } from '../../utils/format';

function StatCard({ icon: Icon, label, value, hint, to }) {
  const body = (
    <div className="surface stat-card h-100">
      <span className="stat-icon" aria-hidden="true"><Icon /></span>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {hint && <div className="small text-muted">{hint}</div>}
      </div>
    </div>
  );
  return to ? <Link to={to} className="text-reset text-decoration-none d-block h-100">{body}</Link> : body;
}

export default function AdminDashboard() {
  useDocumentTitle('Admin dashboard');
  const { data, loading, error, reload } = useAsync(() => adminApi.dashboard(), []);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading && !data) return <Spinner />;
  const { stats, recentBookings, topMovies } = data;
  const maxTickets = Math.max(1, ...topMovies.map((m) => m.tickets));

  return (
    <>
      <AdminHeader title="Dashboard" subtitle="Overview of the IMovies catalogue and bookings." />
      <div className="row g-3 mb-4">
        <div className="col-6 col-xl-3"><StatCard icon={FiFilm} label="Movies" value={stats.movies} to="/admin/movies" /></div>
        <div className="col-6 col-xl-3"><StatCard icon={FiMapPin} label="Theatres" value={stats.theatres} to="/admin/theatres" /></div>
        <div className="col-6 col-xl-3"><StatCard icon={FiClock} label="Shows" value={stats.shows} hint={`${stats.upcomingShows} upcoming`} to="/admin/shows" /></div>
        <div className="col-6 col-xl-3"><StatCard icon={FiUsers} label="Registered users" value={stats.users} to="/admin/users" /></div>
        <div className="col-6 col-xl-3"><StatCard icon={FiCalendar} label="Bookings (all statuses)" value={stats.bookings} hint={`${stats.confirmedBookings} confirmed`} to="/admin/bookings" /></div>
        <div className="col-6 col-xl-3">
          <StatCard icon={FiDollarSign} label="Verified revenue" value={formatCurrency(stats.verifiedRevenue)} hint={`${stats.verifiedPayments} real payments`} />
        </div>
        <div className="col-6 col-xl-3">
          <StatCard icon={FiActivity} label="Demo payment volume" value={formatCurrency(stats.demoVolume)} hint={`${stats.demoPayments} simulated · not revenue`} />
        </div>
        <div className="col-6 col-xl-3"><StatCard icon={FiEyeOff} label="Hidden reviews" value={stats.hiddenReviews} to="/admin/reviews" /></div>
      </div>

      <p className="small text-muted">
        Verified revenue counts only successful payments from a real payment provider. The app currently runs in demo payment mode, so
        simulated payments are reported separately and never counted as revenue. Refunded payments are excluded from both.
      </p>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="surface p-3 h-100">
            <h2 className="h6 fw-semibold mb-3">Top movies by tickets sold</h2>
            {topMovies.length === 0 ? (
              <p className="text-muted small m-0">No confirmed bookings yet.</p>
            ) : (
              <ul className="list-unstyled d-grid gap-3 m-0">
                {topMovies.map((m) => (
                  <li key={m.movieName}>
                    <div className="d-flex justify-content-between small mb-1">
                      <span>{m.movieName}</span>
                      <span className="text-muted">{m.tickets} tickets</span>
                    </div>
                    <div className="bar-track" aria-hidden="true">
                      <div className="bar-fill" style={{ width: `${(m.tickets / maxTickets) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="col-lg-5">
          <div className="surface p-3 h-100">
            <h2 className="h6 fw-semibold mb-3">Bookings by status</h2>
            <div className="d-flex flex-wrap gap-2">
              {Object.entries(stats.bookingsByStatus).map(([status, count]) => (
                <span key={status} className="chip">
                  <BookingStatusBadge status={status} /> {count}
                </span>
              ))}
              {Object.keys(stats.bookingsByStatus).length === 0 && <span className="small text-muted">—</span>}
            </div>
          </div>
        </div>
        <div className="col-12">
          <div className="surface">
            <div className="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary-subtle">
              <h2 className="h6 fw-semibold m-0">Recent bookings</h2>
              <Link to="/admin/bookings" className="small">View all</Link>
            </div>
            {recentBookings.length === 0 ? (
              <p className="p-4 text-center text-muted m-0">No bookings yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr><th scope="col">Reference</th><th scope="col">Customer</th><th scope="col">Movie</th><th scope="col">Amount</th><th scope="col">Status</th></tr>
                  </thead>
                  <tbody>
                    {recentBookings.map((b) => (
                      <tr key={b._id}>
                        <td><Link to={`/bookings/${b._id}`} className="font-monospace small">{b.bookingReference}</Link></td>
                        <td className="small">{b.user?.username || '—'}<div className="text-muted">{b.user?.email}</div></td>
                        <td className="small">{b.snapshot?.movieName}<div className="text-muted text-nowrap">{formatDateTime(b.showStartsAt)}</div></td>
                        <td>{formatCurrency(b.totalAmount)}</td>
                        <td><BookingStatusBadge status={b.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
