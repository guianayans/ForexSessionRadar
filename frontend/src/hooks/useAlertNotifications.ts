import { useEffect, useMemo } from 'react';
import { DateTime } from 'luxon';
import { ensureNotificationPermission, sendSystemNotification } from '@/services/notifications';
import type { NextAlert } from '@/types/dashboard';

function storageKeyForToday() {
  return `forex-alerts-${DateTime.now().toISODate()}`;
}

function readTriggered() {
  try {
    const raw = localStorage.getItem(storageKeyForToday());
    if (!raw) {
      return new Set<string>();
    }
    const list = JSON.parse(raw) as string[];
    return new Set<string>(list);
  } catch {
    return new Set<string>();
  }
}

function writeTriggered(values: Set<string>) {
  localStorage.setItem(storageKeyForToday(), JSON.stringify(Array.from(values)));
}

export function useAlertNotifications(nextAlert: NextAlert | null) {
  const triggered = useMemo(() => readTriggered(), []);

  useEffect(() => {
    void ensureNotificationPermission();
  }, []);

  useEffect(() => {
    if (!nextAlert) {
      return;
    }

    const triggerAt = DateTime.fromISO(nextAlert.triggerTimeIso, { setZone: true }).toMillis();
    if (Date.now() < triggerAt || triggered.has(nextAlert.id)) {
      return;
    }

    triggered.add(nextAlert.id);
    writeTriggered(triggered);

    const eventTime = DateTime.fromISO(nextAlert.eventTimeIso, { setZone: true }).toFormat('HH:mm');
    void sendSystemNotification('Forex Session Radar', `${nextAlert.title} as ${eventTime} (T-${nextAlert.leadMinutes}m).`);
  }, [nextAlert, triggered]);
}
