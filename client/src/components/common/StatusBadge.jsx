const BOOKING = {
  confirmed: ['success', 'Confirmed'],
  pending: ['warning', 'Awaiting payment'],
  cancelled: ['secondary', 'Cancelled'],
  expired: ['secondary', 'Expired'],
  failed: ['danger', 'Payment failed'],
};

const PAYMENT = {
  paid: ['success', 'Paid'],
  pending: ['warning', 'Unpaid'],
  failed: ['danger', 'Failed'],
  refunded: ['info', 'Refunded'],
  succeeded: ['success', 'Succeeded'],
  created: ['warning', 'Started'],
};

export function BookingStatusBadge({ status }) {
  const [tone, label] = BOOKING[status] || ['secondary', status];
  return <span className={`badge text-bg-${tone}`}>{label}</span>;
}

export function PaymentStatusBadge({ status, isDemo }) {
  const [tone, label] = PAYMENT[status] || ['secondary', status];
  return (
    <span className={`badge text-bg-${tone}`}>
      {label}
      {isDemo && (status === 'paid' || status === 'succeeded' || status === 'refunded') ? ' (demo)' : ''}
    </span>
  );
}
