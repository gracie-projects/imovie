import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiFilm, FiGrid, FiCheckCircle, FiPlay } from 'react-icons/fi';
import { FaStar } from 'react-icons/fa';
import { movieApi } from '../api/services';
import useAsync from '../hooks/useAsync';
import useDocumentTitle from '../hooks/useDocumentTitle';
import MovieCard from '../components/movies/MovieCard';
import Poster from '../components/common/Poster';
import FavoriteButton from '../components/movies/FavoriteButton';
import { EmptyState, ErrorState, MovieGridSkeleton } from '../components/common/States';
import { formatDate, formatDuration } from '../utils/format';

function Hero({ movies }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || movies.length < 2) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % movies.length), 7000);
    return () => clearInterval(timer);
  }, [paused, movies.length]);

  const movie = movies[index];
  if (!movie) return null;
  const comingSoon = movie.status === 'coming-soon';

  return (
    <section
      className="hero"
      aria-roledescription="carousel"
      aria-label="Featured movies"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="hero-bg" style={{ backgroundImage: `url(${movie.backdropUrl || movie.posterUrl})` }} aria-hidden="true" />
      <div className="container hero-content py-5">
        <div className="row align-items-center g-5">
          <div className="col-lg-7" aria-live="polite">
            <span className="badge rounded-pill text-bg-danger mb-3 px-3 py-2">{comingSoon ? 'Coming soon' : 'Now showing'}</span>
            <h1 className="hero-title mb-3">{movie.movieName}</h1>
            <div className="d-flex flex-wrap align-items-center text-muted mb-3 small">
              <span className="cert-badge text-white">{movie.certification}</span>
              <span className="meta-dot">{movie.genres.join(', ')}</span>
              <span className="meta-dot">{movie.language}</span>
              <span className="meta-dot">{formatDuration(movie.durationMins)}</span>
              {movie.reviewCount > 0 && (
                <span className="meta-dot text-white">
                  <FaStar className="star-filled me-1" aria-hidden="true" />
                  {movie.avgRating.toFixed(1)}/5
                </span>
              )}
            </div>
            <p className="lead text-muted mb-4" style={{ maxWidth: 600 }}>
              {movie.description}
            </p>
            <div className="d-flex flex-wrap gap-2">
              <Link to={`/movies/${movie._id}`} className="btn btn-primary btn-lg">
                {comingSoon ? 'View details' : 'Book tickets'} <FiArrowRight className="ms-1" aria-hidden="true" />
              </Link>
              {movie.trailerUrl && (
                <a href={movie.trailerUrl} target="_blank" rel="noreferrer" className="btn btn-outline-light btn-lg">
                  <FiPlay className="me-1" aria-hidden="true" /> Trailer
                </a>
              )}
              <FavoriteButton movie={movie} withLabel className="btn-lg" />
            </div>
            {comingSoon && <p className="small text-muted mt-3">Releases {formatDate(movie.releaseDate)}</p>}
            <div className="hero-dots d-flex gap-2 mt-4" role="group" aria-label="Choose featured movie">
              {movies.map((m, i) => (
                <button
                  key={m._id}
                  type="button"
                  aria-label={`Show ${m.movieName}`}
                  aria-current={i === index}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
          </div>
          <div className="col-lg-5 d-none d-lg-flex justify-content-center">
            <Poster src={movie.posterUrl} alt={`${movie.movieName} poster`} className="hero-poster" />
          </div>
        </div>
      </div>
    </section>
  );
}

function MovieRow({ title, accent, to, state }) {
  const { data, loading, error, reload } = state;
  return (
    <section className="container py-4">
      <div className="d-flex justify-content-between align-items-end mb-3">
        <h2 className="section-title">
          {title} <span className="accent">{accent}</span>
        </h2>
        <Link to={to} className="small fw-semibold text-decoration-none">
          View all <FiArrowRight aria-hidden="true" />
        </Link>
      </div>
      {loading && <MovieGridSkeleton count={6} />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && data?.items.length === 0 && (
        <EmptyState title="Nothing here yet" message="Check back soon — new titles are added regularly." />
      )}
      {!loading && !error && data?.items.length > 0 && (
        <div className="h-scroll">
          {data.items.map((m) => (
            <MovieCard key={m._id} movie={m} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function Home() {
  useDocumentTitle('Book movie tickets');
  const featured = useAsync(() => movieApi.list({ featured: 'true', limit: 6, sort: 'newest' }), []);
  const nowShowing = useAsync(() => movieApi.list({ status: 'now-showing', limit: 12 }), []);
  const trending = useAsync(() => movieApi.list({ status: 'now-showing', sort: 'rating', limit: 10 }), []);
  const comingSoon = useAsync(() => movieApi.list({ status: 'coming-soon', sort: 'oldest', limit: 10 }), []);

  const noMovies = !nowShowing.loading && !nowShowing.error && nowShowing.data?.pagination.total === 0 && comingSoon.data?.pagination.total === 0;

  return (
    <>
      {featured.loading ? (
        <div className="container py-5">
          <div className="skeleton" style={{ height: 420 }} />
        </div>
      ) : featured.data?.items.length ? (
        <Hero movies={[...featured.data.items].sort((a, b) => (a.status === 'now-showing' ? 0 : 1) - (b.status === 'now-showing' ? 0 : 1))} />
      ) : (
        <section className="container py-5 text-center">
          <h1 className="hero-title">
            Your next movie night <span className="text-danger">starts here</span>
          </h1>
          <p className="lead text-muted">Browse films, choose your seats and book in under a minute.</p>
        </section>
      )}

      {noMovies ? (
        <div className="container">
          <EmptyState
            title="No movies yet"
            message="The catalogue is empty. Run `npm run seed` in the backend folder to load demo movies, theatres and shows."
          />
        </div>
      ) : (
        <>
          <MovieRow title="Now" accent="Showing" to="/movies?status=now-showing" state={nowShowing} />
          <MovieRow title="Trending" accent="This Week" to="/movies?status=now-showing&sort=rating" state={trending} />
          <MovieRow title="Coming" accent="Soon" to="/movies?status=coming-soon" state={comingSoon} />
        </>
      )}

      <section className="container py-5" aria-labelledby="how-title">
        <h2 id="how-title" className="section-title text-center mb-4">
          How it <span className="accent">works</span>
        </h2>
        <div className="row g-4">
          {[
            [FiFilm, 'Pick a movie', 'Browse what is playing, read reviews and save favourites to your watchlist.'],
            [FiGrid, 'Choose your seats', 'See the live seat map, pick the seats you like and we hold them for you while you pay.'],
            [FiCheckCircle, 'Get your e-ticket', 'Pay securely and receive a ticket with a QR code, ready to print or show at the entrance.'],
          ].map(([Icon, title, text], i) => (
            <div className="col-md-4" key={title}>
              <div className="surface p-4 h-100">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <span className="stat-icon d-inline-flex align-items-center justify-content-center rounded-3" style={{ width: 44, height: 44, background: 'var(--im-red-soft)', color: '#ff5a62' }}>
                    <Icon aria-hidden="true" />
                  </span>
                  <span className="font-display fs-4">
                    {i + 1}. {title}
                  </span>
                </div>
                <p className="text-muted m-0">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
