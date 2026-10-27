import { Link } from 'react-router-dom';
import { FiFilm, FiMail, FiGithub } from 'react-icons/fi';

export default function Footer() {
  return (
    <footer className="im-footer no-print mt-5">
      <div className="container py-5">
        <div className="row g-4">
          <div className="col-md-5">
            <Link to="/" className="brand mb-2">
              <span className="brand-mark" aria-hidden="true">
                <FiFilm />
              </span>
              <span>
                I<span className="brand-accent">Movies</span>
              </span>
            </Link>
            <p className="small mt-2" style={{ maxWidth: 380 }}>
              A full-stack movie ticket booking platform built as an academic project with React, Node.js, Express and
              MongoDB. Movies, theatres and payments shown here are for demonstration only.
            </p>
          </div>
          <div className="col-6 col-md-2">
            <h2 className="h6 text-white mb-3">Explore</h2>
            <ul className="list-unstyled small d-grid gap-2">
              <li><Link to="/movies">Movies</Link></li>
              <li><Link to="/movies?status=coming-soon">Coming soon</Link></li>
              <li><Link to="/theatres">Theatres</Link></li>
            </ul>
          </div>
          <div className="col-6 col-md-2">
            <h2 className="h6 text-white mb-3">Account</h2>
            <ul className="list-unstyled small d-grid gap-2">
              <li><Link to="/bookings">My bookings</Link></li>
              <li><Link to="/favorites">Favourites</Link></li>
              <li><Link to="/profile">Profile</Link></li>
            </ul>
          </div>
          <div className="col-md-3">
            <h2 className="h6 text-white mb-3">Project</h2>
            <ul className="list-unstyled small d-grid gap-2">
              <li className="d-flex align-items-center gap-2">
                <FiMail aria-hidden="true" /> <a href="mailto:en24cs3010628@medicaps.ac.in">en24cs3010628@medicaps.ac.in</a>
              </li>
              <li className="d-flex align-items-center gap-2">
                <FiGithub aria-hidden="true" />{' '}
                <a href="https://github.com/gracie-projects/imovie" target="_blank" rel="noreferrer">
                  github.com/gracie-projects/imovie
                </a>
              </li>
            </ul>
          </div>
        </div>
        <hr className="border-secondary-subtle my-4" />
        <div className="d-flex flex-column flex-md-row justify-content-between gap-2 small">
          <span>© {new Date().getFullYear()} IMovies · B.Tech CSE (AI) academic project</span>
          <span>Demo payment mode — no real money is ever charged.</span>
        </div>
      </div>
    </footer>
  );
}
