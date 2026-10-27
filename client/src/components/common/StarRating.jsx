import { useState } from 'react';
import { FaStar, FaRegStar, FaStarHalfAlt } from 'react-icons/fa';

export function Stars({ value = 0, size = 14 }) {
  return (
    <span className="d-inline-flex gap-1 star-filled" aria-label={`${value} out of 5 stars`} role="img">
      {[1, 2, 3, 4, 5].map((i) => {
        if (value >= i) return <FaStar key={i} size={size} aria-hidden="true" />;
        if (value >= i - 0.5) return <FaStarHalfAlt key={i} size={size} aria-hidden="true" />;
        return <FaRegStar key={i} size={size} aria-hidden="true" />;
      })}
    </span>
  );
}

/** Keyboard-accessible star input built on native radio buttons. */
export function StarInput({ value, onChange, name = 'rating' }) {
  const [hover, setHover] = useState(0);
  const labels = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
  return (
    <fieldset className="d-inline-flex align-items-center gap-1" onMouseLeave={() => setHover(0)}>
      <legend className="visually-hidden">Your rating</legend>
      {[1, 2, 3, 4, 5].map((i) => (
        <label key={i} className="m-0" style={{ cursor: 'pointer' }} onMouseEnter={() => setHover(i)}>
          <input
            type="radio"
            name={name}
            value={i}
            checked={value === i}
            onChange={() => onChange(i)}
            className="visually-hidden"
          />
          <span className="visually-hidden">
            {i} star{i > 1 ? 's' : ''} – {labels[i - 1]}
          </span>
          {(hover || value) >= i ? (
            <FaStar size={26} className="star-filled" aria-hidden="true" />
          ) : (
            <FaRegStar size={26} className="text-muted" aria-hidden="true" />
          )}
        </label>
      ))}
      <span className="ms-2 small text-muted">{labels[(hover || value) - 1] || 'Select a rating'}</span>
    </fieldset>
  );
}
