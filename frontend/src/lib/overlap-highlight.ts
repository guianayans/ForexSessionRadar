import { DateTime } from 'luxon';
import type { OverlapWindow, SessionWindow } from '@/types/dashboard';

export const GOLDEN_OVERLAP_ID = 'london_newyork';
export const BRAZIL_HIGHLIGHT_TIMEZONE = 'America/Sao_Paulo';
/** Início do destaque do relógio do Brasil (horário de São Paulo). */
export const BRAZIL_HIGHLIGHT_START = { hour: 9, minute: 30 };
/** Fim do destaque do relógio do Brasil (horário de São Paulo, exclusivo). */
export const BRAZIL_HIGHLIGHT_END = { hour: 12, minute: 0 };

const BRAZIL_OVERLAP_IDS = new Set(['brazil_london', 'brazil_newyork', GOLDEN_OVERLAP_ID]);

export function findGoldenOverlap(overlaps: OverlapWindow[]) {
  return overlaps.find((overlap) => overlap.id === GOLDEN_OVERLAP_ID && overlap.isActive) || null;
}

export function hasActiveBrazilOverlap(overlaps: OverlapWindow[]) {
  return overlaps.some((overlap) => overlap.isActive && BRAZIL_OVERLAP_IDS.has(overlap.id));
}

export function isWithinBrazilHighlightWindow(localNow: DateTime) {
  const start = localNow.set({
    hour: BRAZIL_HIGHLIGHT_START.hour,
    minute: BRAZIL_HIGHLIGHT_START.minute,
    second: 0,
    millisecond: 0
  });
  const end = localNow.set({
    hour: BRAZIL_HIGHLIGHT_END.hour,
    minute: BRAZIL_HIGHLIGHT_END.minute,
    second: 0,
    millisecond: 0
  });

  return localNow >= start && localNow < end;
}

export function isBrazilClockHighlight(
  nowIso: string,
  overlaps: OverlapWindow[],
  marketOpen: boolean,
  brazilSessionActive: boolean
) {
  if (!marketOpen || !brazilSessionActive || !hasActiveBrazilOverlap(overlaps)) {
    return false;
  }

  const localNow = DateTime.fromISO(nowIso, { setZone: true }).setZone(BRAZIL_HIGHLIGHT_TIMEZONE);
  return isWithinBrazilHighlightWindow(localNow);
}

export function isSessionInGoldenOverlap(sessionId: SessionWindow['id'], goldenOverlap: OverlapWindow | null) {
  if (!goldenOverlap?.isActive) {
    return false;
  }

  return goldenOverlap.sessions.includes(sessionId);
}
