import { NavLink, Outlet } from 'react-router-dom';
import { FiGrid, FiFilm, FiMapPin, FiClock, FiCalendar, FiMessageSquare, FiUsers } from 'react-icons/fi';

const items = [
  { to: '/admin', label: 'Dashboard', icon: FiGrid, end: true },
  { to: '/admin/movies', label: 'Movies', icon: FiFilm },
  { to: '/admin/theatres', label: 'Theatres', icon: FiMapPin },
  { to: '/admin/shows', label: 'Shows', icon: FiClock },
  { to: '/admin/bookings', label: 'Bookings', icon: FiCalendar },
  { to: '/admin/reviews', label: 'Reviews', icon: FiMessageSquare },
  { to: '/admin/users', label: 'Users', icon: FiUsers },
];

export default function AdminLayout() {
  return (
    <div className="container py-4">
      <div className="admin-shell">
        <aside>
          <div className="surface p-2 sticky-summary">
            <p className="small text-muted text-uppercase fw-semibold px-3 pt-2 mb-2 d-none d-lg-block" style={{ letterSpacing: '0.1em' }}>
              Administration
            </p>
            <nav className="admin-nav" aria-label="Admin navigation">
              {items.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : undefined)}>
                  <Icon aria-hidden="true" /> {label}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>
        <section className="min-w-0" style={{ minWidth: 0 }}>
          <Outlet />
        </section>
      </div>
    </div>
  );
}
