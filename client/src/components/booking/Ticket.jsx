import { QRCodeSVG } from 'qrcode.react';
import { BookingStatusBadge, PaymentStatusBadge } from '../common/StatusBadge';
import { formatCurrency, formatDate, formatTime, formatDuration } from '../../utils/format';

function Field({ label, children }) {
  return (
    <div>
      <div className="ticket-label">{label}</div>
      <div className="ticket-value">{children}</div>
    </div>
  );
}

/** Printable e-ticket rendered entirely from the persisted booking. */
export default function Ticket({ booking }) {
  const s = booking.snapshot || {};
  const valid = booking.status === 'confirmed';
  return (
    <article className="ticket" aria-label={`Ticket ${booking.bookingReference}`}>
      <div className="ticket-main">
        <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div>
            <div className="ticket-label">IMovies e-ticket</div>
            <h2 className="font-display m-0" style={{ fontSize: '2.2rem' }}>{s.movieName}</h2>
            <div className="small text-muted">
              {s.certification} · {s.language} · {s.format} · {formatDuration(s.durationMins)}
            </div>
          </div>
          <div className="d-flex flex-column align-items-end gap-1">
            <BookingStatusBadge status={booking.status} />
            <PaymentStatusBadge status={booking.paymentStatus} isDemo={booking.isDemoPayment} />
          </div>
        </div>
        <div className="row g-3">
          <div className="col-sm-6"><Field label="Theatre">{s.theatreName}, {s.city}</Field></div>
          <div className="col-sm-6"><Field label="Screen">{s.screen}</Field></div>
          <div className="col-6 col-sm-3"><Field label="Date">{formatDate(booking.showStartsAt, { weekday: 'short' })}</Field></div>
          <div className="col-6 col-sm-3"><Field label="Time">{formatTime(booking.showStartsAt)}</Field></div>
          <div className="col-6 col-sm-3"><Field label="Tickets">{booking.ticketCount}</Field></div>
          <div className="col-6 col-sm-3">
            <Field label={booking.isDemoPayment ? 'Amount (demo)' : 'Amount paid'}>{formatCurrency(booking.totalAmount)}</Field>
          </div>
          <div className="col-12"><Field label="Seats"><span className="fs-5">{booking.seats.join(', ')}</span></Field></div>
          <div className="col-12 small text-muted">{s.address}</div>
        </div>
      </div>
      <div className="ticket-stub">
        <div className="ticket-label">Booking reference</div>
        <div className="font-monospace fs-5 fw-bold">{booking.bookingReference}</div>
        {valid ? (
          <div className="qr-box">
            <QRCodeSVG value={`IMOVIES:${booking.bookingReference}:${booking.seats.join(',')}`} size={132} level="M" />
          </div>
        ) : (
          <div className="small text-muted text-center" style={{ maxWidth: 160 }}>This ticket is not valid for entry.</div>
        )}
        {booking.isDemoPayment && <div className="small text-warning">Demo booking · no real payment</div>}
      </div>
    </article>
  );
}
