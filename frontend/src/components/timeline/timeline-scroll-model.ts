import { DateTime } from 'luxon';
import { clampPercent, toPercent, type TimelineRange } from '@/components/timeline/timeline-utils';

/** Horas visíveis no viewport (cada lado do centro ≈ 12h). */
export const VIEWPORT_HOURS = 24;

/** Faixa total renderizada (sessões repetem dentro desse intervalo). */
export const STRIP_HOURS = VIEWPORT_HOURS * 7;

export const STRIP_MS = STRIP_HOURS * 60 * 60 * 1000;

export const VIEWPORT_MS = VIEWPORT_HOURS * 60 * 60 * 1000;

export const STRIP_WIDTH_FACTOR = STRIP_HOURS / VIEWPORT_HOURS;

/** Recentraliza a faixa quando o centro sai demais do meio do strip. */
export const REANCHOR_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export const LIVE_NOW_POSITION = 50;

export function buildStripRange(anchorMs: number): TimelineRange {
  const start = DateTime.fromMillis(anchorMs);
  const end = start.plus({ hours: STRIP_HOURS });
  return { start, end, totalMs: STRIP_MS };
}

export function getStripAnchorForCenter(centerMs: number) {
  return centerMs - STRIP_MS / 2;
}

export function shouldReanchorStrip(centerMs: number, stripAnchorMs: number) {
  const stripMid = stripAnchorMs + STRIP_MS / 2;
  return Math.abs(centerMs - stripMid) > REANCHOR_THRESHOLD_MS;
}

/** Posição `left` (%) do strip largo, relativa ao viewport — alinha o centro do horário na linha fixa. */
export function getContentLeftPercent(viewCenterIso: string, stripRange: TimelineRange) {
  const centerPercent = toPercent(viewCenterIso, stripRange);
  return LIVE_NOW_POSITION - centerPercent * STRIP_WIDTH_FACTOR;
}

export function shiftIsoByDragDelta(
  startCenterIso: string,
  deltaXPx: number,
  railWidthPx: number,
  sensitivity = 1
) {
  if (railWidthPx <= 0) {
    return startCenterIso;
  }

  const deltaMs = -(deltaXPx / railWidthPx) * VIEWPORT_MS * sensitivity;
  const next = DateTime.fromISO(startCenterIso, { setZone: true }).plus({ milliseconds: deltaMs });
  return next.toISO() || startCenterIso;
}

export function getViewportEdgeLabels(viewCenterIso: string, timezone: string) {
  const center = DateTime.fromISO(viewCenterIso, { setZone: true }).setZone(timezone);
  return {
    left: center.minus({ hours: VIEWPORT_HOURS / 2 }).toFormat('dd/LL HH:mm'),
    right: center.plus({ hours: VIEWPORT_HOURS / 2 }).toFormat('dd/LL HH:mm')
  };
}

export function getViewportFadeOpacity(
  blockLeftPercent: number,
  blockWidthPercent: number,
  viewCenterPercent: number
) {
  const halfViewportPercent = (50 / STRIP_WIDTH_FACTOR);
  const blockCenter = blockLeftPercent + blockWidthPercent / 2;
  const distance = Math.abs(blockCenter - viewCenterPercent);
  const fadeStart = halfViewportPercent * 0.85;
  const fadeEnd = halfViewportPercent * 1.05;

  if (distance <= fadeStart) {
    return 1;
  }

  if (distance >= fadeEnd) {
    return 0.35;
  }

  const t = (distance - fadeStart) / (fadeEnd - fadeStart);
  return clampPercent((1 - t) * 100) / 100;
}
