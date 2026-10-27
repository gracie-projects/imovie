import { formatCurrency, SECTION_LABELS } from '../../utils/format';

export default function PriceBreakdown({ booking }) {
  const groups = booking.seatDetails.reduce((acc, seat) => {
    acc[seat.section] = acc[seat.section] || { price: seat.price, seats: [] };
    acc[seat.section].seats.push(seat.seatId);
    return acc;
  }, {});

  return (
    <dl className="small m-0">
      {Object.entries(groups).map(([section, g]) => (
        <div key={section} className="d-flex justify-content-between mb-2 gap-2">
          <dt className="fw-normal">
            {SECTION_LABELS[section]} × {g.seats.length}
            <span className="d-block text-muted">{g.seats.join(', ')} · {formatCurrency(g.price)} each</span>
          </dt>
          <dd className="m-0">{formatCurrency(g.price * g.seats.length)}</dd>
        </div>
      ))}
      <div className="d-flex justify-content-between mb-1 text-muted">
        <dt className="fw-normal">Convenience fee</dt>
        <dd className="m-0">{formatCurrency(booking.convenienceFee)}</dd>
      </div>
      <div className="d-flex justify-content-between mb-2 text-muted">
        <dt className="fw-normal">GST (18% on fee)</dt>
        <dd className="m-0">{formatCurrency(booking.taxes)}</dd>
      </div>
      <div className="d-flex justify-content-between pt-2 border-top border-secondary-subtle fs-6 fw-bold">
        <dt>Total</dt>
        <dd className="m-0">{formatCurrency(booking.totalAmount)}</dd>
      </div>
    </dl>
  );
}
