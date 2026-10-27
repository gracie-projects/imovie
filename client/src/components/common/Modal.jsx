import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';

/**
 * Accessible modal dialog: focus moves into the dialog, Escape closes it, Tab is kept inside,
 * and focus returns to the element that opened it.
 */
export default function Modal({ open, title, onClose, children, footer, size = 560, closeDisabled = false }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  // Keep the latest callbacks in refs so re-renders of the parent don't re-run the focus logic.
  const onCloseRef = useRef(onClose);
  const closeDisabledRef = useRef(closeDisabled);
  useEffect(() => {
    onCloseRef.current = onClose;
    closeDisabledRef.current = closeDisabled;
  });

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const dialog = dialogRef.current;
    const focusables = () =>
      dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    (focusables()[1] || focusables()[0] || dialog)?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape' && !closeDisabledRef.current) onCloseRef.current?.();
      if (e.key === 'Tab') {
        const items = [...focusables()].filter((el) => !el.disabled);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="im-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !closeDisabled) onClose?.();
      }}
    >
      <div
        className="im-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        tabIndex={-1}
        style={{ maxWidth: size }}
      >
        <div className="im-modal-header">
          <h2 id={titleId} className="h5 m-0 fw-semibold">
            {title}
          </h2>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close dialog" disabled={closeDisabled}>
            <FiX />
          </button>
        </div>
        <div className="im-modal-body">{children}</div>
        {footer && <div className="im-modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
