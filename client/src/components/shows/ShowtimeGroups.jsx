import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMapPin, FiClock } from 'react-icons/fi';
import { EmptyState } from '../common/States';
import { dayKey, dayLabel, formatTime, formatCurrency } from '../../utils/format';

function availabilityClass(show) {
  if (show.seatsAvailable === 0) return 'soldout';
  if (show.seatsAvailable / show.seatsTotal < 0.3) return 'filling';
  return '';
}

/**
 * Date strip + list of showtimes grouped by theatre (on a movie page) or by movie (on a theatre page).
 */
export default function ShowtimeGroups({ shows, groupBy = 'theatre' }) {
  const days = useMemo(() => [...new Set(shows.map((s) => dayKey(s.startsAt)))].sort(), [shows]);
  const [selectedDay, setSelectedDay] = useState(null);
  const activeDay = days.includes(selectedDay) ? selectedDay : days[0];

  const groups = useMemo(() => {
    const map = new Map();
    for (const show of shows.filter((s) => dayKey(s.startsAt) === activeDay)) {
      const entity = groupBy === 'theatre' ? show.theatre : show.movie;
      if (!map.has(entity._id)) map.set(entity._id, { entity, shows: [] });
      map.get(entity._id).shows.push(show);
    }
    return [...map.values()];
  }, [shows, activeDay, groupBy]);

  if (!shows.length) {
    return (
      <EmptyState
        icon={<FiClock />}
        title="No upcoming shows"
        message="There are no shows scheduled right now. Please check again later."
      />
    );
  }

  return (
    <div>
      <div className="date-strip mb-4" role="group" aria-label="Choose a date">
        {days.map((key) => {
          const label = dayLabel(key);
          return (
            <button key={key} type="button" className="date-btn" aria-pressed={key === activeDay} onClick={() => setSelectedDay(key)}>
              <span className="fw-semibold">{label.top}</span>
              <small>{label.bottom}</small>
            </button>
          );
        })}
      </div>

      <div className="d-grid gap-3">
        {groups.map(({ entity, shows: list }) => (
          <div key={entity._id} className="surface p-3 p-md-4">
            <div className="row g-3 align-items-center">
              <div className="col-md-4">
                {groupBy === 'theatre' ? (
                  <>
                    <Link to={`/theatres/${entity._id}`} className="fw-semibold text-white text-decoration-none">
                      {entity.theatreName}
                    </Link>
                    <div className="small text-muted d-flex align-items-center gap-1">
                      <FiMapPin aria-hidden="true" /> {entity.city}
                    </div>
                  </>
                ) : (
                  <>
                    <Link to={`/movies/${entity._id}`} className="fw-semibold text-white text-decoration-none">
                      {entity.movieName}
                    </Link>
                    <div className="small text-muted">
                      {entity.certification} · {entity.language}
                    </div>
                  </>
                )}
              </div>
              <div className="col-md-8">
                <div className="d-flex flex-wrap gap-2">
                  {list.map((show) => {
                    const cls = availabilityClass(show);
                    const label = `${formatTime(show.startsAt)}, ${show.format}, ${show.screen}, ${
                      show.seatsAvailable === 0 ? 'sold out' : `${show.seatsAvailable} seats available from ${formatCurrency(show.priceFrom)}`
                    }`;
                    return (
                      <Link
                        key={show._id}
                        to={`/shows/${show._id}/seats`}
                        className={`time-btn ${cls}`}
                        aria-label={label}
                        aria-disabled={cls === 'soldout'}
                        tabIndex={cls === 'soldout' ? -1 : undefined}
                      >
                        {formatTime(show.startsAt)}
                        <small>
                          {show.format} · {cls === 'soldout' ? 'Sold out' : cls === 'filling' ? 'Filling fast' : `from ${formatCurrency(show.priceFrom)}`}
                        </small>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="small text-muted mt-3 d-flex gap-3 flex-wrap">
        <span><span className="text-success">●</span> Available</span>
        <span><span className="text-warning">●</span> Filling fast</span>
        <span><span className="text-secondary">●</span> Sold out</span>
      </p>
    </div>
  );
}
