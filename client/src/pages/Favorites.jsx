import { Link } from 'react-router-dom';
import { FiHeart } from 'react-icons/fi';
import { useFavorites } from '../context/FavoritesContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import MovieCard from '../components/movies/MovieCard';
import { EmptyState, ErrorState, MovieGridSkeleton } from '../components/common/States';

export default function Favorites() {
  useDocumentTitle('Favourites');
  const { items, loading, error, refresh } = useFavorites();

  return (
    <div className="container py-5">
      <h1 className="section-title" style={{ fontSize: '2.8rem' }}>
        My <span className="accent">Watchlist</span>
      </h1>
      <p className="text-muted">Movies you have saved. Tap the heart on any movie to add or remove it.</p>

      {loading && items.length === 0 && <MovieGridSkeleton count={6} />}
      {error && <ErrorState message={error} onRetry={refresh} />}
      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon={<FiHeart />}
          title="Your watchlist is empty"
          message="Save movies you want to watch and find them here later."
          action={<Link to="/movies" className="btn btn-primary">Browse movies</Link>}
        />
      )}
      {items.length > 0 && (
        <div className="row g-4">
          {items.map((f) => (
            <div key={f.movie._id} className="col-6 col-md-4 col-lg-3 col-xl-2">
              <MovieCard movie={f.movie} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
