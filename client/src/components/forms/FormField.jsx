import { useId } from 'react';

/** Label + input + error message wired together for screen readers. */
export default function FormField({ label, error, hint, as = 'input', className = '', children, ...props }) {
  const id = useId();
  const Tag = as;
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`mb-3 ${className}`}>
      <label htmlFor={id} className="form-label">
        {label}
      </label>
      {children ? (
        children({ id, describedBy, invalid: Boolean(error) })
      ) : (
        <Tag
          id={id}
          className={`${as === 'select' ? 'form-select' : 'form-control'}${error ? ' is-invalid' : ''}`}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...props}
        />
      )}
      {hint && !error && (
        <div id={`${id}-hint`} className="form-text">
          {hint}
        </div>
      )}
      {error && (
        <div id={`${id}-error`} className="invalid-feedback d-block">
          {error}
        </div>
      )}
    </div>
  );
}

/** Converts the API's [{ field, message }] list into { field: message }. */
export function fieldErrors(err) {
  const details = err?.response?.data?.details;
  if (!Array.isArray(details)) return {};
  return details.reduce((acc, d) => (d.field && !acc[d.field] ? { ...acc, [d.field]: d.message } : acc), {});
}
