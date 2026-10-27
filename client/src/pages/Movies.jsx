import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiSearch, FiX } from 'react-icons/fi';
import { movieApi } from '../api/services';
import useAsync from '../hooks/useAsync';
import useDebounce from '../hooks/useDebounce';
import useDocumentTitle from '../hooks/useDocumentTitle';
import MovieCard from '../components/movies/MovieCard';
import Pagination from '../components/common/Pagination';
import { EmptyState, ErrorState, MovieGridSkeleton } from '../components/common/States';

const STATUS_TABS = [
  ['', 'All'],
  ['now-showing', 'Now showing'],
  ['coming-soon', 'Coming soon'],
];

const SORTS = [
  ['newest', 'Newest first'],
  ['rating', 'Top rated'],
  ['title', 'Title A–Z'],
  ['oldest', 'Oldest first'],
  ['duration', 'Shortest first'],
];

let filtersCache = null;

export default function Movies() {
  useDocumentTitle('Movies');
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || '');
  const debounced = useDebounce(search.trim());

  const status = params.get('status') || '';
  const genre = params.get('genre') || '';
  const language = params.get('language') || '';
  const sort = params.get('sort') || 'newest';
  const page = Number(params.get('page')) || 1;

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: true });
  };

  // Keep the search box and URL in sync (debounced).
  useEffect(() => {
    if ((params.get('q') || '') !== debounced) update({ q: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const filters = useAsync(async () => {
    if (!filtersCache) filtersCache = await movieApi.filters();
    return filtersCache;
  }, []);

  const { data, loading, error, reload } = useAsync(
    () => movieApi.list({ q: params.get('q') || undefined, status: status || undefined, genre: genre || undefined, language: language || undefined, sort, page, limit: 18 }),
    [params.toString()]
  );

  const hasFilters = Boolean(params.get('q') || genre || language || status);

  return (
    <div className="container py-5">
      <header className="mb-4">
        <h1 className="section-title" style={{ fontSize: '3rem' }}>
          Explore <span className="accent">Movies</span>
        </h1>
        <p className="text-muted">Search by title, cast or director, and filter by genre or language.</p>
      </header>

      <div className="surface p-3 mb-4">
        <div className="row g-2 align-items-center">
          <div className="col-lg-4">
            <label htmlFor="movie-search" className="visually-hidden">Search movies</label>
            <div className="position-relative">
              <FiSearch className="position-absolute text-muted" style={{ left: 14, top: '50%', transform: 'translateY(-50%)' }} aria-hidden="true" />
              <input
                id="movie-search"
                type="search"
                className="form-control ps-5"
                placeholder="Search title, cast or director"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-6 col-lg-2">
            <label htmlFor="genre" className="visually-hidden">Genre</label>
            <select id="genre" className="form-select" value={genre} onChange={(e) => update({ genre: e.target.value })}>
              <option value="">All genres</option>
              {filters.data?.genres.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="col-6 col-lg-2">
            <label htmlFor="language" className="visually-hidden">Language</label>
            <select id="language" className="form-select" value={language} onChange={(e) => update({ language: e.target.value })}>
              <option value="">All languages</option>
              {filters.data?.languages.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div className="col-8 col-lg-2">
            <label htmlFor="sort" className="visually-hidden">Sort by</label>
            <select id="sort" className="form-select" value={sort} onChange={(e) => update({ sort: e.target.value })}>
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="col-4 col-lg-2 text-end">
            {hasFilters && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSearch('');
                  setParams({}, { replace: true });
                }}
              >
                <FiX aria-hidden="true" /> Clear
              </button>
            )}
          </div>
        </div>
        <div className="d-flex gap-2 mt-3 flex-wrap" role="group" aria-label="Release status">
          {STATUS_TABS.map(([value, label]) => (
            <button
              key={label}
              type="button"
              className="chip chip-toggle"
              aria-pressed={status === value}
              onClick={() => update({ status: value })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && <MovieGridSkeleton count={12} />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && data && (
        <>
          <p className="small text-muted" aria-live="polite">
            {data.pagination.total} movie{data.pagination.total === 1 ? '' : 's'} found
          </p>
          {data.items.length === 0 ? (
            <EmptyState
              icon={<FiSearch />}
              title="No movies match your filters"
              message="Try a different search term or clear the filters."
            />
          ) : (
            <div className="row g-4">
              {data.items.map((m) => (
                <div key={m._id} className="col-6 col-md-4 col-lg-3 col-xl-2">
                  <MovieCard movie={m} />
                </div>
              ))}
            </div>
          )}
          <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onChange={(p) => update({ page: String(p) })} />
        </>
      )}
    </div>
  );
}
