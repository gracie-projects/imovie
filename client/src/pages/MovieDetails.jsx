import { useParams, Link } from 'react-router-dom';
import { FiPlay, FiCalendar, FiClock, FiGlobe, FiArrowLeft } from 'react-icons/fi';
import { FaStar } from 'react-icons/fa';
import { movieApi, showApi } from '../api/services';
import useAsync from '../hooks/useAsync';
import useDocumentTitle from '../hooks/useDocumentTitle';
import Poster from '../components/common/Poster';
import FavoriteButton from '../components/movies/FavoriteButton';
import ReviewSection from '../components/movies/ReviewSection';
import ShowtimeGroups from '../components/shows/ShowtimeGroups';
import { ErrorState, LineSkeleton, Spinner } from '../components/common/States';
import NotFound from './NotFound';
import { formatDate, formatDuration } from '../utils/format';

export default function MovieDetails() {
  const { id } = useParams();
  const movieState = useAsync(() => movieApi.get(id), [id]);
  const showsState = useAsync(() => showApi.list({ movie: id }), [id]);
  const movie = movieState.data?.movie;
  useDocumentTitle(movie?.movieName || 'Movie');

  if (movieState.status === 404 || movieState.status === 400) return <NotFound message="We couldn't find that movie." />;
  if (movieState.error) return <div className="container py-5"><ErrorState message={movieState.error} onRetry={movieState.reload} /></div>;
  if (!movie) {
    return (
      <div className="container py-5">
        <div className="row g-4">
          <div className="col-md-3"><div className="skeleton" style={{ aspectRatio: '2/3' }} /></div>
          <div className="col-md-9"><LineSkeleton lines={6} /></div>
        </div>
      </div>
    );
  }

  const comingSoon = movie.status === 'coming-soon';

  return (
    <>
      <section className="details-hero">
        <div className="backdrop" style={{ backgroundImage: `url(${movie.backdropUrl || movie.posterUrl})` }} aria-hidden="true" />
        <div className="container py-5">
          <Link to="/movies" className="btn btn-ghost btn-sm mb-3">
            <FiArrowLeft aria-hidden="true" /> All movies
          </Link>
          <div className="row g-4 g-lg-5 align-items-center">
            <div className="col-sm-5 col-md-4 col-lg-3 text-center text-sm-start">
              <Poster src={movie.posterUrl} alt={`${movie.movieName} poster`} className="details-poster" />
            </div>
            <div className="col-sm-7 col-md-8 col-lg-9">
              {comingSoon && <span className="badge text-bg-warning mb-2">Coming soon</span>}
              <h1 className="hero-title" style={{ fontSize: 'clamp(2.6rem, 6vw, 4.5rem)' }}>{movie.movieName}</h1>
              <div className="d-flex flex-wrap align-items-center gap-2 my-3">
                {movie.reviewCount > 0 && (
                  <span className="chip text-white">
                    <FaStar className="star-filled" aria-hidden="true" /> {movie.avgRating.toFixed(1)}/5
                    <span className="text-muted">({movie.reviewCount})</span>
                  </span>
                )}
                <span className="chip"><span className="cert-badge">{movie.certification}</span></span>
                <span className="chip"><FiClock aria-hidden="true" /> {formatDuration(movie.durationMins)}</span>
                <span className="chip"><FiGlobe aria-hidden="true" /> {movie.language}</span>
                <span className="chip"><FiCalendar aria-hidden="true" /> {formatDate(movie.releaseDate)}</span>
              </div>
              <div className="d-flex flex-wrap gap-2 mb-3">
                {movie.genres.map((g) => (
                  <Link key={g} to={`/movies?genre=${encodeURIComponent(g)}`} className="badge rounded-pill text-bg-dark border border-secondary text-decoration-none">
                    {g}
                  </Link>
                ))}
              </div>
              <p className="lead text-light" style={{ maxWidth: 760 }}>{movie.description}</p>
              <dl className="row small mb-4" style={{ maxWidth: 760 }}>
                {movie.director && (
                  <>
                    <dt className="col-sm-3 text-muted fw-normal">Director</dt>
                    <dd className="col-sm-9">{movie.director}</dd>
                  </>
                )}
                {movie.cast?.length > 0 && (
                  <>
                    <dt className="col-sm-3 text-muted fw-normal">Cast</dt>
                    <dd className="col-sm-9">{movie.cast.join(', ')}</dd>
                  </>
                )}
              </dl>
              <div className="d-flex flex-wrap gap-2">
                {!comingSoon && (
                  <a href="#showtimes" className="btn btn-primary btn-lg">Book tickets</a>
                )}
                {movie.trailerUrl && (
                  <a href={movie.trailerUrl} target="_blank" rel="noreferrer" className="btn btn-outline-light btn-lg">
                    <FiPlay className="me-1" aria-hidden="true" /> Watch trailer
                  </a>
                )}
                <FavoriteButton movie={movie} withLabel className="btn-lg" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="showtimes" className="container py-5" aria-labelledby="showtimes-title">
        <h2 id="showtimes-title" className="section-title mb-4">
          Showtimes &amp; <span className="accent">Theatres</span>
        </h2>
        {comingSoon && !showsState.data?.items.length ? (
          <div className="surface p-4 text-center">
            <p className="m-0">
              Bookings open closer to the release on <strong>{formatDate(movie.releaseDate)}</strong>. Add it to your favourites to keep track.
            </p>
          </div>
        ) : showsState.loading ? (
          <Spinner label="Loading showtimes…" />
        ) : showsState.error ? (
          <ErrorState message={showsState.error} onRetry={showsState.reload} />
        ) : (
          <ShowtimeGroups shows={showsState.data.items} groupBy="theatre" />
        )}
      </section>

      <div className="container pb-5">
        <ReviewSection movie={movie} onRatingChange={movieState.reload} />
      </div>
    </>
  );
}
