import { DateTime } from 'luxon';
import {
  findGoldenOverlap,
  isBrazilClockHighlight,
  isSessionInGoldenOverlap
} from '@/lib/overlap-highlight';
import {
  buildTimelineOverlapItems,
  isSessionActiveAt,
  resolvePrimaryActiveOverlap
} from '@/lib/timeline-overlaps';
import type { OverlapWindow, SessionWindow } from '@/types/dashboard';

export type PreviewClockTone = 'cyan' | 'gold' | 'muted';

export type PreviewClock = {
  id: string;
  city: string;
  time: string;
  tone: PreviewClockTone;
  tag: string;
  timezone: string;
};

export type PreviewStatusChip = {
  id: string;
  label: string;
  tone: Exclude<PreviewClockTone, 'muted'>;
};

/** Chips de status com as mesmas cores dos relógios (cyan = aberto, gold = overlap). */
export function buildPreviewStatusChips(clocks: PreviewClock[]): PreviewStatusChip[] {
  return clocks.flatMap((clock) => {
    if (clock.tone === 'muted') {
      return [];
    }

    return [{ id: clock.id, label: clock.city, tone: clock.tone }];
  });
}

const CLOCK_META: Array<{
  id: SessionWindow['id'];
  city: string;
  timezone: string;
  mobile: boolean;
  desktop: boolean;
}> = [
  { id: 'brazil', city: 'São Paulo', timezone: 'America/Sao_Paulo', mobile: true, desktop: true },
  { id: 'london', city: 'Londres', timezone: 'Europe/London', mobile: true, desktop: true },
  { id: 'new_york', city: 'Nova York', timezone: 'America/New_York', mobile: true, desktop: true },
  { id: 'sydney', city: 'Sydney', timezone: 'Australia/Sydney', mobile: true, desktop: true },
  { id: 'tokyo', city: 'Tóquio', timezone: 'Asia/Tokyo', mobile: false, desktop: true },
  { id: 'hong_kong', city: 'Hong Kong', timezone: 'Asia/Hong_Kong', mobile: false, desktop: true }
];

function resolveClockTone(
  sessionId: SessionWindow['id'],
  active: boolean,
  goldenOverlap: OverlapWindow | null,
  brazilHighlight: boolean
): PreviewClockTone {
  if (!active) {
    return 'muted';
  }
  if (sessionId === 'brazil' && brazilHighlight) {
    return 'gold';
  }
  if (isSessionInGoldenOverlap(sessionId, goldenOverlap)) {
    return 'gold';
  }
  return 'cyan';
}

function resolveClockTag(tone: PreviewClockTone, goldenOverlap: OverlapWindow | null) {
  if (tone === 'muted') {
    return 'Fechado';
  }
  if (tone === 'gold' && goldenOverlap?.isActive) {
    return 'Overlap';
  }
  return 'Aberto';
}

export function buildPreviewClocks(
  sessions: SessionWindow[],
  nowIso: string,
  baseTimezone: string,
  marketOpen: boolean
) {
  const now = DateTime.fromISO(nowIso, { setZone: true });
  const overlaps = buildTimelineOverlapItems(sessions, now, baseTimezone, marketOpen);
  const goldenOverlap = findGoldenOverlap(overlaps);
  const brazilActive = isSessionActiveAt(
    sessions.find((session) => session.id === 'brazil') || ({ id: 'brazil' } as SessionWindow),
    now,
    marketOpen
  );
  const brazilHighlight = isBrazilClockHighlight(nowIso, overlaps, marketOpen, brazilActive);

  const buildFor = (filter: 'mobile' | 'desktop') =>
    CLOCK_META.filter((item) => (filter === 'mobile' ? item.mobile : item.desktop)).map((meta) => {
      const session = sessions.find((item) => item.id === meta.id);
      const active = session ? isSessionActiveAt(session, now, marketOpen) : false;
      const tone = resolveClockTone(meta.id, active, goldenOverlap, brazilHighlight);
      const time = now.setZone(meta.timezone).toFormat('HH:mm');

      return {
        id: meta.id,
        city: meta.city,
        time,
        tone,
        tag: resolveClockTag(tone, goldenOverlap),
        timezone: meta.timezone
      };
    });

  return {
    mobile: buildFor('mobile'),
    desktop: buildFor('desktop'),
    goldenOverlap,
    primaryActiveOverlap: resolvePrimaryActiveOverlap(overlaps),
    marketOpen
  };
}
