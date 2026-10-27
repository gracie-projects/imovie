import { FiSearch, FiPlus } from 'react-icons/fi';

export function AdminHeader({ title, subtitle, actionLabel, onAction }) {
  return (
    <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
      <div>
        <h1 className="section-title" style={{ fontSize: '2.4rem' }}>{title}</h1>
        {subtitle && <p className="text-muted m-0 small">{subtitle}</p>}
      </div>
      {actionLabel && (
        <button type="button" className="btn btn-primary" onClick={onAction}>
          <FiPlus className="me-1" aria-hidden="true" /> {actionLabel}
        </button>
      )}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder, id = 'admin-search' }) {
  return (
    <div className="position-relative flex-fill" style={{ minWidth: 200 }}>
      <label htmlFor={id} className="visually-hidden">{placeholder}</label>
      <FiSearch className="position-absolute text-muted" style={{ left: 14, top: '50%', transform: 'translateY(-50%)' }} aria-hidden="true" />
      <input id={id} type="search" className="form-control ps-5" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/** Wraps a table with consistent loading / error / empty handling. */
export function TableState({ loading, error, empty, onRetry, children, emptyText = 'No records found.' }) {
  if (error) {
    return (
      <div className="p-4 text-center" role="alert">
        <p className="text-muted">{error}</p>
        <button type="button" className="btn btn-outline-light btn-sm" onClick={onRetry}>Try again</button>
      </div>
    );
  }
  if (loading && empty) {
    return (
      <div className="p-3" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton mb-2" style={{ height: 44 }} />)}
      </div>
    );
  }
  if (empty) return <p className="p-4 text-center text-muted m-0">{emptyText}</p>;
  return <div className="table-responsive" style={{ opacity: loading ? 0.6 : 1 }}>{children}</div>;
}
