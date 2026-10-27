import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiCreditCard, FiSmartphone, FiGlobe, FiBriefcase, FiLock } from 'react-icons/fi';
import Modal from '../common/Modal';
import { paymentApi } from '../../api/services';
import { getErrorMessage } from '../../api/client';
import { formatCurrency } from '../../utils/format';

const METHODS = [
  { id: 'upi', label: 'UPI', icon: FiSmartphone },
  { id: 'card', label: 'Card', icon: FiCreditCard },
  { id: 'netbanking', label: 'Net banking', icon: FiGlobe },
  { id: 'wallet', label: 'Wallet', icon: FiBriefcase },
];

/**
 * Demo checkout. No payment details are collected: the server-side demo provider simulates
 * the bank's answer, and only the server can confirm the booking.
 */
export default function DemoPaymentModal({ open, booking, onClose, onSuccess, onFailure }) {
  const [order, setOrder] = useState(null);
  const [method, setMethod] = useState('upi');
  const [creating, setCreating] = useState(false);
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let active = true;
    setOrder(null);
    setError('');
    setCreating(true);
    paymentApi
      .createOrder(booking._id)
      .then((res) => active && setOrder(res.order))
      .catch((err) => active && setError(getErrorMessage(err)))
      .finally(() => active && setCreating(false));
    return () => {
      active = false;
    };
  }, [open, booking._id]);

  const pay = async (outcome) => {
    setProcessing(outcome);
    setError('');
    try {
      // A short pause so the "contacting bank" state is visible, as with a real gateway.
      await new Promise((r) => setTimeout(r, 900));
      const res = await paymentApi.completeDemo(order.paymentId, outcome, method);
      if (res.paymentStatus === 'succeeded') onSuccess(res.booking);
      else onFailure(res.booking, res.message);
    } catch (err) {
      setError(getErrorMessage(err));
      if (err.response?.status === 409 || err.response?.status === 410) onFailure(null, getErrorMessage(err));
    } finally {
      setProcessing(null);
    }
  };

  const busy = Boolean(processing) || creating;

  return (
    <Modal open={open} title="Complete payment" onClose={onClose} closeDisabled={Boolean(processing)} size={520}>
      <div className="demo-banner p-3 mb-4 d-flex gap-2 small" role="note">
        <FiAlertTriangle className="flex-shrink-0 mt-1" aria-hidden="true" />
        <div>
          <strong>DEMO PAYMENT MODE.</strong> No real money is charged and no card or bank details are collected. Use the buttons
          below to simulate the bank approving or declining the payment.
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center surface-2 p-3 mb-4">
        <div>
          <div className="small text-muted">Amount payable</div>
          <div className="fs-3 fw-bold">{formatCurrency(order?.amount ?? booking.totalAmount)}</div>
        </div>
        <div className="text-end small text-muted">
          <div>Booking {booking.bookingReference}</div>
          {order && <div className="font-monospace" style={{ fontSize: '.72rem' }}>{order.orderId}</div>}
        </div>
      </div>

      <fieldset className="mb-4" disabled={busy}>
        <legend className="form-label">Payment method (for display only)</legend>
        <div className="row g-2">
          {METHODS.map(({ id, label, icon: Icon }) => (
            <div className="col-6" key={id}>
              <label className={`chip chip-toggle w-100 justify-content-center py-2 ${method === id ? 'border-danger' : ''}`} aria-pressed={undefined}>
                <input type="radio" name="method" value={id} checked={method === id} onChange={() => setMethod(id)} className="form-check-input m-0 me-1" />
                <Icon aria-hidden="true" /> {label}
              </label>
            </div>
          ))}
        </div>
      </fieldset>

      {error && <div className="alert alert-danger small" role="alert">{error}</div>}
      {creating && <p className="small text-muted" role="status">Preparing secure order…</p>}
      {processing && (
        <p className="small text-muted d-flex align-items-center gap-2" role="status">
          <span className="spinner-border spinner-border-sm" aria-hidden="true" /> Contacting bank (simulated)…
        </p>
      )}

      <div className="d-grid gap-2">
        <button type="button" className="btn btn-primary btn-lg" disabled={busy || !order} onClick={() => pay('success')}>
          <FiLock className="me-2" aria-hidden="true" />
          Pay {formatCurrency(order?.amount ?? booking.totalAmount)} (demo)
        </button>
        <button type="button" className="btn btn-outline-light" disabled={busy || !order} onClick={() => pay('failure')}>
          Simulate a failed payment
        </button>
      </div>
    </Modal>
  );
}
