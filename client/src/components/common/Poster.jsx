import { useState } from 'react';

const FALLBACK = '/poster-fallback.svg';

/** Movie poster that falls back to a local placeholder if the image URL is missing or broken. */
export default function Poster({ src, alt, className = '', ...rest }) {
  const [failed, setFailed] = useState(false);
  return (
    <img
      src={!src || failed ? FALLBACK : src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}
