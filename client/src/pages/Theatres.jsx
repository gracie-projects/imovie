import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMapPin, FiSearch, FiArrowRight } from 'react-icons/fi';
import { theatreApi } from '../api/services';
import useAsync from '../hooks/useAsync';
import useDebounce from '../hooks/useDebounce';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { EmptyState, ErrorState, LineSkeleton } from '../components/common/States';
import { formatCurrency } from '../utils/format';

export default function Theatres() {
  useDocumentTitle('Theatres');
  const [city, setCity] = useState('');
  const [q, setQ] = useState('');
  const debounced = useDebounce(q.trim());
  const cities = useAsync(() => theatreApi.cities(), []);
  const { data, loading, error, reload } = useAsync(() => theatreApi.list({ city: city || undefined, q: debounced || undefined, limit: 50 }), [city, debounced]);

  return (
    <div className="container py-5">
      <h1 className="section-title" style={{ fontSize: '3rem' }}>
        Our <span className="accent">Theatres</span>
      </h1>
      <p className="text-muted">Pick a cinema to see everything that is playing there.</p>

      <div className="surface p-3 mb-4 row g-2 mx-0">
        <div className="col-md-6">
          <label htmlFor="theatre-search" className="visually-hidden">Search theatres</label>
          <div className="position-relative">
            <FiSearch className="position-absolute text-muted" style={{ left: 14, top: '50%', transform: 'translateY(-50%)' }} aria-hidden="true" />
            <input id="theatre-search" type="search" className="form-control ps-5" placeholder="Search by name or area" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="col-md-3">
          <label htmlFor="city" className="visually-hidden">City</label>
          <select id="city" className="form-select" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">All cities</option>
            {cities.data?.cities.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {loading && <LineSkeleton lines={5} />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && !loading && data.items.length === 0 && (
        <EmptyState icon={<FiMapPin />} title="No theatres found" message="Try another city or search term." />
      )}
      {data && !loading && (
        <div className="row g-4">
          {data.items.map((t) => {
            const prices = ['lower', 'middle', 'balcony'].filter((k) => t.seatLayout[k].rows > 0).map((k) => t.seatLayout[k].price);
            return (
              <div className="col-md-6 col-xl-4" key={t._id}>
                <article className="surface p-4 h-100 d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start">
                    <h2 className="h5 fw-semibold mb-1">{t.theatreName}</h2>
                    <span className="badge text-bg-dark border border-secondary">{t.city}</span>
                  </div>
                  <p className="small text-muted d-flex gap-1">
                    <FiMapPin className="flex-shrink-0 mt-1" aria-hidden="true" /> {t.address}
                  </p>
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {t.amenities.map((a) => <span key={a} className="chip">{a}</span>)}
                  </div>
                  <p className="small text-muted mt-auto mb-3">
                    {t.screens.length} screen{t.screens.length > 1 ? 's' : ''} · {t.totalSeats} seats · tickets {formatCurrency(Math.min(...prices))}–{formatCurrency(Math.max(...prices))}
                  </p>
                  <Link to={`/theatres/${t._id}`} className="btn btn-outline-light">
                    View shows <FiArrowRight aria-hidden="true" />
                  </Link>
                </article>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
