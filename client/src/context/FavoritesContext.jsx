import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { favoriteApi } from '../api/services';
import { getErrorMessage } from '../api/client';
import { useAuth } from './AuthContext';

const FavoritesContext = createContext(null);

/** Loads the user's favourites once and shares them, so every heart icon stays in sync. */
export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await favoriteApi.list();
      setItems(res.items);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const ids = useMemo(() => new Set(items.map((f) => f.movie._id)), [items]);

  const toggle = useCallback(
    async (movie) => {
      const isFav = ids.has(movie._id);
      // Optimistic update, rolled back if the request fails.
      setItems((prev) =>
        isFav ? prev.filter((f) => f.movie._id !== movie._id) : [{ _id: `tmp-${movie._id}`, movie, createdAt: new Date().toISOString() }, ...prev]
      );
      try {
        if (isFav) await favoriteApi.remove(movie._id);
        else await favoriteApi.add(movie._id);
        toast.success(isFav ? 'Removed from favourites' : 'Added to favourites');
      } catch (err) {
        toast.error(getErrorMessage(err));
        refresh();
      }
    },
    [ids, refresh]
  );

  const value = useMemo(() => ({ items, ids, loading, error, toggle, refresh }), [items, ids, loading, error, toggle, refresh]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used inside <FavoritesProvider>');
  return ctx;
}
