import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiMapPin } from 'react-icons/fi';
import { theatreApi, showApi } from '../api/services';
import useAsync from '../hooks/useAsync';
import useDocumentTitle from '../hooks/useDocumentTitle';
import ShowtimeGroups from '../components/shows/ShowtimeGroups';
import { ErrorState, Spinner } from '../components/common/States';
import NotFound from './NotFound';
import { formatCurrency } from '../utils/format';

export default function TheatreDetails() {
  const { id } = useParams();
  const theatre = useAsync(() => theatreApi.get(id), [id]);
  const shows = useAsync(() => showApi.list({ theatre: id }), [id]);
  const t = theatre.data?.theatre;
  useDocumentTitle(t?.theatreName || 'Theatre');

  if (theatre.status === 404 || theatre.status === 400) return <NotFound message="We couldn't find that theatre." />;
  if (theatre.error) return <div className="container py-5"><ErrorState message={theatre.error} onRetry={theatre.reload} /></div>;
  if (!t) return <Spinner />;

  return (
    <div className="container py-5">
      <Link to="/theatres" className="btn btn-ghost btn-sm mb-3">
        <FiArrowLeft aria-hidden="true" /> All theatres
      </Link>
      <div className="surface p-4 mb-5">
        <div className="row g-4 align-items-center">
          <div className="col-lg-7">
            <h1 className="hero-title" style={{ fontSize: 'clamp(2.4rem, 5vw, 3.6rem)' }}>{t.theatreName}</h1>
            <p className="text-muted d-flex gap-2 align-items-start">
              <FiMapPin className="mt-1 flex-shrink-0" aria-hidden="true" /> {t.address}
            </p>
            <div className="d-flex flex-wrap gap-2">
              {t.amenities.map((a) => <span key={a} className="chip">{a}</span>)}
              {t.screens.map((s) => <span key={s} className="chip">{s}</span>)}
            </div>
          </div>
          <div className="col-lg-5">
            <table className="table table-sm">
              <caption className="small text-muted">Seating and standard prices</caption>
              <thead>
                <tr><th scope="col">Section</th><th scope="col">Rows</th><th scope="col">Seats</th><th scope="col">Price</th></tr>
              </thead>
              <tbody>
                {theatre.data.seatMap.map((s) => (
                  <tr key={s.key}>
                    <td>{s.name}</td>
                    <td>{s.rows.map((r) => r.label).join(', ')}</td>
                    <td>{s.rows.reduce((n, r) => n + r.seats.length, 0)}</td>
                    <td>{formatCurrency(s.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <h2 className="section-title mb-4">
        Now playing <span className="accent">here</span>
      </h2>
      {shows.loading ? <Spinner /> : shows.error ? <ErrorState message={shows.error} onRetry={shows.reload} /> : <ShowtimeGroups shows={shows.data.items} groupBy="movie" />}
    </div>
  );
}
