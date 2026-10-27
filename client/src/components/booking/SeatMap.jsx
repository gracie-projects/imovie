import { memo } from 'react';
import { formatCurrency } from '../../utils/format';

/**
 * Visual seat layout. Seat state is supplied by the server (booked / held) and the parent (selected);
 * this component only renders it. Every seat is a real <button> with a descriptive label.
 */
function SeatMap({ sections, booked, held, selected, onToggle, disabled }) {
  const bookedSet = new Set(booked);
  const heldSet = new Set(held);
  const selectedSet = new Set(selected);

  return (
    <div className="seat-map">
      <div className="seat-map-inner">
        <div className="screen-indicator w-100" aria-hidden="true">
          <div className="curve" />
          <span>SCREEN THIS WAY</span>
        </div>
        {sections.map((section) => (
          <div key={section.key} className="seat-section" role="group" aria-label={`${section.name}, ${formatCurrency(section.price)} per seat`}>
            <div className="seat-section-title">
              {section.name} · {formatCurrency(section.price)}
            </div>
            {section.rows.map((row) => {
              const half = Math.ceil(row.seats.length / 2);
              return (
                <div key={row.label} className="seat-row">
                  <span className="row-label" aria-hidden="true">{row.label}</span>
                  {row.seats.map((seatId, i) => {
                    const isBooked = bookedSet.has(seatId);
                    const isHeld = heldSet.has(seatId);
                    const isSelected = selectedSet.has(seatId);
                    const unavailable = isBooked || isHeld;
                    const state = isBooked ? 'booked' : isHeld ? 'held by another customer' : isSelected ? 'selected' : 'available';
                    return (
                      <span key={seatId} className="d-inline-flex">
                        {i === half && <span className="seat-gap" aria-hidden="true" />}
                        <button
                          type="button"
                          className={`seat${isBooked ? ' booked' : isHeld ? ' held' : isSelected ? ' selected' : ''}`}
                          disabled={unavailable || disabled}
                          aria-pressed={isSelected}
                          aria-label={`Seat ${seatId}, ${section.name}, ${formatCurrency(section.price)}, ${state}`}
                          title={`${seatId} · ${formatCurrency(section.price)}`}
                          onClick={() => onToggle(seatId, section)}
                        >
                          {seatId.slice(1)}
                        </button>
                      </span>
                    );
                  })}
                  <span className="row-label" aria-hidden="true">{row.label}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SeatLegend() {
  return (
    <div className="legend" aria-hidden="true">
      <span><span className="seat d-inline-block" />Available</span>
      <span><span className="seat selected d-inline-block" />Selected</span>
      <span><span className="seat held d-inline-block" />Held by others</span>
      <span><span className="seat booked d-inline-block" />Booked</span>
    </div>
  );
}

export default memo(SeatMap);
