import { DateTime } from 'luxon';
import type { OverlapWindow, SessionWindow } from '@/types/dashboard';

export const TIMELINE_OVERLAP_RULES: Array<{
  id: string;
  label: string;
  a: SessionWindow['id'];
  b: SessionWindow['id'];
}> = [
  { id: 'sydney_tokyo', label: 'Sydney + Toquio', a: 'sydney', b: 'tokyo' },
  { id: 'sydney_hong_kong', label: 'Sydney + Hong Kong', a: 'sydney', b: 'hong_kong' },
  { id: 'sydney_shanghai', label: 'Sydney + Xangai', a: 'sydney', b: 'shanghai' },
  { id: 'tokyo_hong_kong', label: 'Toquio + Hong Kong', a: 'tokyo', b: 'hong_kong' },
  { id: 'tokyo_shanghai', label: 'Toquio + Xangai', a: 'tokyo', b: 'shanghai' },
  { id: 'hong_kong_shanghai', label: 'Hong Kong + Xangai', a: 'hong_kong', b: 'shanghai' },
  { id: 'tokyo_london', label: 'Toquio + Londres', a: 'tokyo', b: 'london' },
  { id: 'hong_kong_london', label: 'Hong Kong + Londres', a: 'hong_kong', b: 'london' },
  { id: 'brazil_london', label: 'Brasil + Londres', a: 'brazil', b: 'london' },
  { id: 'london_newyork', label: 'Londres + Nova York', a: 'london', b: 'new_york' },
  { id: 'brazil_newyork', label: 'Brasil + Nova York', a: 'brazil', b: 'new_york' }
];

export interface TimelineBlockLike {
  session: SessionWindow;
  startIso: string;
  endIso: string;
}

export function isSessionActiveAt(
  session: SessionWindow,
  now: DateTime,
  marketOpen: boolean
) {
  if (!marketOpen) {
    return false;
  }

  const windows =
    session.windows && session.windows.length
      ? session.windows
      : session.startIso && session.endIso
        ? [{ startIso: session.startIso, endIso: session.endIso }]
        : [];

  return windows.some((window) => {
    const start = DateTime.fromISO(window.startIso, { setZone: true });
    const end = DateTime.fromISO(window.endIso, { setZone: true });
    return now >= start && now < end;
  });
}

export function buildTimelineOverlapItems(
  sessions: SessionWindow[],
  now: DateTime,
  displayTimezone: string,
  marketOpen: boolean
): OverlapWindow[] {
  const bySession = new Map<SessionWindow['id'], TimelineBlockLike[]>();
  sessions.forEach((session) => {
    const windows =
      session.windows && session.windows.length
        ? session.windows
        : session.startIso && session.endIso
          ? [{ startIso: session.startIso, endIso: session.endIso }]
          : [];

    windows.forEach((window) => {
      if (!window.startIso || !window.endIso) {
        return;
      }
      const list = bySession.get(session.id) || [];
      list.push({ session, startIso: window.startIso, endIso: window.endIso });
      bySession.set(session.id, list);
    });
  });

  const overlaps: OverlapWindow[] = [];

  TIMELINE_OVERLAP_RULES.forEach((rule) => {
    const aBlocks = bySession.get(rule.a) || [];
    const bBlocks = bySession.get(rule.b) || [];

    aBlocks.forEach((aBlock) => {
      bBlocks.forEach((bBlock) => {
        const aStart = DateTime.fromISO(aBlock.startIso, { setZone: true });
        const aEnd = DateTime.fromISO(aBlock.endIso, { setZone: true });
        const bStart = DateTime.fromISO(bBlock.startIso, { setZone: true });
        const bEnd = DateTime.fromISO(bBlock.endIso, { setZone: true });

        const start = aStart > bStart ? aStart : bStart;
        const end = aEnd < bEnd ? aEnd : bEnd;
        if (end <= start) {
          return;
        }

        const startDisplay = start.setZone(displayTimezone);
        const endDisplay = end.setZone(displayTimezone);

        overlaps.push({
          id: rule.id,
          label: rule.label,
          sessions: [rule.a, rule.b],
          startIso: start.toISO() || '',
          endIso: end.toISO() || '',
          startLabel: startDisplay.toFormat('HH:mm'),
          endLabel: endDisplay.toFormat('HH:mm'),
          countdownSeconds: Math.max(0, Math.floor((start.toMillis() - now.toMillis()) / 1000)),
          isActive: now >= start && now < end
        });
      });
    });
  });

  return overlaps
    .filter((item, index, source) => source.findIndex((x) => x.id === item.id && x.startIso === item.startIso) === index)
    .sort((a, b) => DateTime.fromISO(a.startIso, { setZone: true }).toMillis() - DateTime.fromISO(b.startIso, { setZone: true }).toMillis());
}

/** Overlap em destaque no instante do preview (prioriza Janela de Ouro quando ativa). */
export function resolvePrimaryActiveOverlap(overlaps: OverlapWindow[]) {
  const golden = overlaps.find((overlap) => overlap.id === 'london_newyork' && overlap.isActive) || null;
  if (golden) {
    return golden;
  }

  return overlaps.find((overlap) => overlap.isActive) || null;
}
