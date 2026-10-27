const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export const formatCurrency = (amount) => inr.format(amount || 0);

export const formatDate = (value, opts = {}) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', ...opts });

export const formatTime = (value) =>
  new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

export const formatDateTime = (value) => `${formatDate(value, { weekday: 'short' })}, ${formatTime(value)}`;

export const formatDuration = (mins) => (mins ? `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m` : '');

export const formatCountdown = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** Local calendar day key, e.g. "2026-10-27". */
export const dayKey = (value) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const dayLabel = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (dayKey(date) === dayKey(today)) return { top: 'Today', bottom: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) };
  if (dayKey(date) === dayKey(tomorrow)) return { top: 'Tomorrow', bottom: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) };
  return {
    top: date.toLocaleDateString('en-IN', { weekday: 'short' }),
    bottom: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  };
};

/** Value for <input type="datetime-local"> in the browser's local time zone. */
export const toDateTimeLocal = (value) => {
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

export const SECTION_LABELS = { lower: 'Lower Stall', middle: 'Middle Stall', balcony: 'Balcony' };

/** Natural seat order: A2 before A10. */
export const compareSeats = (a, b) => (a[0] === b[0] ? Number(a.slice(1)) - Number(b.slice(1)) : a.localeCompare(b));
