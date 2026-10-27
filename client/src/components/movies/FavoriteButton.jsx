import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';

export default function FavoriteButton({ movie, className = '', withLabel = false }) {
  const { isAuthenticated } = useAuth();
  const { ids, toggle } = useFavorites();
  const navigate = useNavigate();
  const location = useLocation();
  const active = ids.has(movie._id);

  const onClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast('Log in to save favourites', { icon: '🔒' });
      navigate('/login', { state: { from: location } });
      return;
    }
    toggle(movie);
  };

  const label = active ? `Remove ${movie.movieName} from favourites` : `Add ${movie.movieName} to favourites`;

  if (withLabel) {
    return (
      <button type="button" className={`btn btn-outline-light ${className}`} onClick={onClick} aria-pressed={active} aria-label={label}>
        {active ? <FaHeart className="text-danger me-2" aria-hidden="true" /> : <FaRegHeart className="me-2" aria-hidden="true" />}
        {active ? 'In favourites' : 'Add to favourites'}
      </button>
    );
  }

  return (
    <button type="button" className={`btn btn-icon fav-btn ${className}`} onClick={onClick} aria-pressed={active} aria-label={label} title={label}>
      {active ? <FaHeart aria-hidden="true" /> : <FaRegHeart aria-hidden="true" />}
    </button>
  );
}
