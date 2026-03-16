import { useEffect, useState } from 'react';
import { DateTime } from 'luxon';

function normalizeSeed(seedIso?: string) {
  if (!seedIso) {
    return DateTime.now().toISO() || new Date().toISOString();
  }

  const parsed = DateTime.fromISO(seedIso, { setZone: true });
  if (!parsed.isValid) {
    return DateTime.now().toISO() || new Date().toISOString();
  }

  return parsed.toISO() || new Date().toISOString();
}

export function useLiveNow(seedIso?: string, tickMs = 1000) {
  const [nowIso, setNowIso] = useState(() => normalizeSeed(seedIso));

  useEffect(() => {
    setNowIso(normalizeSeed(seedIso));
  }, [seedIso]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowIso((current) => {
        const parsed = DateTime.fromISO(current, { setZone: true });
        if (!parsed.isValid) {
          return normalizeSeed(seedIso);
        }
        return parsed.plus({ milliseconds: tickMs }).toISO() || new Date().toISOString();
      });
    }, tickMs);

    return () => window.clearInterval(timer);
  }, [seedIso, tickMs]);

  return nowIso;
}
