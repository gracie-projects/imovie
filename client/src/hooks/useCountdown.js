import { useEffect, useState } from 'react';

/** Seconds remaining until `target` (Date or ISO string), re-rendering every second. */
export default function useCountdown(target) {
  const end = target ? new Date(target).getTime() : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!end) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [end]);

  return end ? Math.max(0, Math.round((end - now) / 1000)) : 0;
}
