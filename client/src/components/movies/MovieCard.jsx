import { Link } from 'react-router-dom';
import { FaStar } from 'react-icons/fa';
import Poster from '../common/Poster';
import FavoriteButton from './FavoriteButton';
import { formatDate, formatDuration } from '../../utils/format';

export default function MovieCard({ movie }) {
  const comingSoon = movie.status === 'coming-soon';
  return (
    <article className="movie-card">
      <div className="poster-wrap">
        <Poster src={movie.posterUrl} alt={`${movie.movieName} poster`} />
        {comingSoon && <span className="status-ribbon">Coming soon</span>}
        <FavoriteButton movie={movie} className="card-fav" />
        <div className="poster-overlay">
          <span className="cert-badge">{movie.certification}</span>
          {movie.reviewCount > 0 && (
            <span className="rating-pill">
              <FaStar aria-hidden="true" /> {movie.avgRating.toFixed(1)}
              <span className="visually-hidden"> out of 5 from {movie.reviewCount} reviews</span>
            </span>
          )}
        </div>
      </div>
      <h3 className="movie-title" title={movie.movieName}>
        <Link to={`/movies/${movie._id}`} className="stretched-link text-reset text-decoration-none">
          {movie.movieName}
        </Link>
      </h3>
      <p className="small text-muted m-0 text-truncate">
        {comingSoon ? `Releases ${formatDate(movie.releaseDate)}` : `${movie.genres.slice(0, 2).join(' / ')} · ${formatDuration(movie.durationMins)}`}
      </p>
      <p className="small text-muted m-0">{movie.language}</p>
    </article>
  );
}
