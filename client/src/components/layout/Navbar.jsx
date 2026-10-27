import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FiFilm, FiHome, FiMapPin, FiHeart, FiCalendar, FiUser, FiLogOut, FiGrid, FiMenu, FiX, FiChevronDown } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const links = [
  { to: '/', label: 'Home', icon: FiHome, end: true },
  { to: '/movies', label: 'Movies', icon: FiFilm },
  { to: '/theatres', label: 'Theatres', icon: FiMapPin },
  { to: '/bookings', label: 'My Bookings', icon: FiCalendar, auth: true },
  { to: '/favorites', label: 'Favourites', icon: FiHeart, auth: true },
];

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Close menus on navigation.
  useEffect(() => {
    setMenuOpen(false);
    setUserOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!userOpen) return undefined;
    const close = (e) => {
      if (!userRef.current?.contains(e.target)) setUserOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setUserOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [userOpen]);

  const handleLogout = async () => {
    await logout();
    toast.success('You have been logged out');
    navigate('/');
  };

  const visibleLinks = links.filter((l) => !l.auth || user);
  const navItems = (
    <>
      {visibleLinks.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `im-nav-link${isActive ? ' active' : ''}`}>
          <Icon aria-hidden="true" /> {label}
        </NavLink>
      ))}
      {isAdmin && (
        <NavLink to="/admin" className={({ isActive }) => `im-nav-link${isActive ? ' active' : ''}`}>
          <FiGrid aria-hidden="true" /> Admin
        </NavLink>
      )}
    </>
  );

  return (
    <header className="im-navbar no-print">
      <nav className="container d-flex align-items-center justify-content-between py-2" aria-label="Main navigation">
        <Link to="/" className="brand" aria-label="IMovies home">
          <span className="brand-mark" aria-hidden="true">
            <FiFilm />
          </span>
          <span>
            I<span className="brand-accent">Movies</span>
          </span>
        </Link>

        <div className="d-none d-lg-flex align-items-center gap-1">{navItems}</div>

        <div className="d-flex align-items-center gap-2">
          {user ? (
            <div className="position-relative" ref={userRef}>
              <button
                type="button"
                className="btn btn-ghost d-flex align-items-center gap-2 px-2"
                aria-haspopup="true"
                aria-expanded={userOpen}
                onClick={() => setUserOpen((o) => !o)}
              >
                <span className="avatar" aria-hidden="true">
                  {user.username?.[0]?.toUpperCase()}
                </span>
                <span className="d-none d-md-inline text-truncate" style={{ maxWidth: 120 }}>
                  {user.username}
                </span>
                <FiChevronDown aria-hidden="true" />
              </button>
              {userOpen && (
                <div className="dropdown-panel">
                  <div className="px-3 py-2 small text-muted border-bottom border-secondary-subtle mb-1">
                    Signed in as
                    <div className="text-white text-truncate">{user.email}</div>
                  </div>
                  <Link to="/profile">
                    <FiUser aria-hidden="true" /> Profile
                  </Link>
                  <Link to="/bookings">
                    <FiCalendar aria-hidden="true" /> My Bookings
                  </Link>
                  <Link to="/favorites">
                    <FiHeart aria-hidden="true" /> Favourites
                  </Link>
                  {isAdmin && (
                    <Link to="/admin">
                      <FiGrid aria-hidden="true" /> Admin Dashboard
                    </Link>
                  )}
                  <button type="button" onClick={handleLogout}>
                    <FiLogOut aria-hidden="true" /> Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="d-none d-sm-flex gap-2">
              <Link to="/login" state={{ from: location }} className="btn btn-ghost">
                Log in
              </Link>
              <Link to="/register" className="btn btn-primary">
                Sign up
              </Link>
            </div>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-icon d-lg-none"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>
      </nav>
      {menuOpen && (
        <div id="mobile-menu" className="container mobile-menu d-lg-none">
          <div className="d-flex flex-column gap-1">{navItems}</div>
          {!user && (
            <div className="d-flex gap-2 mt-3">
              <Link to="/login" state={{ from: location }} className="btn btn-outline-light flex-fill">
                Log in
              </Link>
              <Link to="/register" className="btn btn-primary flex-fill">
                Sign up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
