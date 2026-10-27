import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null;
  const pages = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  for (let p = start; p <= Math.min(totalPages, start + 4); p += 1) pages.push(p);

  return (
    <nav aria-label="Pagination" className="d-flex justify-content-center align-items-center gap-1 mt-4 flex-wrap">
      <button type="button" className="btn btn-ghost btn-icon" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <FiChevronLeft />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-ghost'}`}
          aria-current={p === page ? 'page' : undefined}
          onClick={() => onChange(p)}
          style={{ minWidth: 40 }}
        >
          {p}
        </button>
      ))}
      <button type="button" className="btn btn-ghost btn-icon" disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Next page">
        <FiChevronRight />
      </button>
    </nav>
  );
}
