import { FiAlertTriangle, FiFilm } from 'react-icons/fi';

export function Spinner({ label = 'Loading…', className = '' }) {
  return (
    <div className={`d-flex align-items-center justify-content-center gap-2 py-5 text-muted ${className}`} role="status">
      <span className="spinner-border spinner-border-sm text-danger" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ icon = <FiFilm />, title, message, action }) {
  return (
    <div className="empty-state">
      <div className="icon" aria-hidden="true">
        {icon}
      </div>
      <h3 className="h5 fw-semibold">{title}</h3>
      {message && <p className="text-muted mx-auto" style={{ maxWidth: 440 }}>{message}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="empty-state" role="alert">
      <div className="icon" aria-hidden="true">
        <FiAlertTriangle />
      </div>
      <h3 className="h5 fw-semibold">Something went wrong</h3>
      <p className="text-muted mx-auto" style={{ maxWidth: 440 }}>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-outline-light btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function MovieGridSkeleton({ count = 8 }) {
  return (
    <div className="row g-4" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="col-6 col-md-4 col-lg-3 col-xl-2">
          <div className="skeleton" style={{ aspectRatio: '2 / 3' }} />
          <div className="skeleton mt-2" style={{ height: 16, width: '80%' }} />
          <div className="skeleton mt-2" style={{ height: 12, width: '50%' }} />
        </div>
      ))}
    </div>
  );
}

export function LineSkeleton({ lines = 3 }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton mb-2" style={{ height: 18, width: `${90 - i * 12}%` }} />
      ))}
    </div>
  );
}
