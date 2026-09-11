import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock3, Waves } from 'lucide-react';
import { DateTime } from 'luxon';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLiveNow } from '@/hooks/useLiveNow';
import type { CurrentSession, MarketState, OverlapWindow, SessionWindow, UpcomingEvent } from '@/types/dashboard';
import { PreviewStatusChips } from '@/components/landing/PreviewStatusChips';
import type { PreviewStatusChip } from '@/lib/preview-clocks';
import { NowIndicator } from '@/components/timeline/NowIndicator';
import { EventMarkerPopup } from '@/components/timeline/EventMarkerPopup';
import { GoldenWindowPanel } from '@/components/timeline/GoldenWindowPanel';
import { SessionBlock } from '@/components/timeline/SessionBlock';
import { SessionEventMarker } from '@/components/timeline/SessionEventMarker';
import { SessionPanel } from '@/components/timeline/SessionPanel';
import { SessionTooltip } from '@/components/timeline/SessionTooltip';
import { formatTimezoneCityLabel } from '@/lib/timezone-city-options';
import {
  localizeEventTitle,
  localizeMarketContextLabel,
  localizeOperationalText,
  localizeSessionLabel,
  t,
  type SupportedLocale
} from '@/lib/i18n';
import {
  getCurrentPhaseLabel,
  getOverlapLabel,
  getSessionInsight,
  getSessionStatusLabel,
  intersectsRange,
  toPercent,
  type TimelineRange
} from '@/components/timeline/timeline-utils';
import {
  buildStripRange,
  getContentLeftPercent,
  getStripAnchorForCenter,
  getViewportFadeOpacity,
  LIVE_NOW_POSITION,
  shiftIsoByDragDelta,
  shouldReanchorStrip,
  STRIP_WIDTH_FACTOR
} from '@/components/timeline/timeline-scroll-model';
import { cn, formatCountdown } from '@/lib/utils';

interface SessionTimelineProps {
  seedNowIso: string;
  baseTimezone: string;
  locale: SupportedLocale;
  sessions: SessionWindow[];
  isPaused: boolean;
  marketState: MarketState;
  currentSession: CurrentSession;
  upcomingEvents: UpcomingEvent[];
  scrubMode?: boolean;
  scrubNowIso?: string;
  onScrubNowChange?: (iso: string) => void;
  rangeAnchorIso?: string;
  slimNowLine?: boolean;
  scrubStatusChips?: PreviewStatusChip[];
}

interface SessionBlockItem {
  key: string;
  session: SessionWindow;
  startIso: string;
  endIso: string;
  startLabel: string;
  endLabel: string;
  leftPercent: number;
  widthPercent: number;
  active: boolean;
}

interface TimelineMarkerItem {
  id: string;
  label: string;
  type: UpcomingEvent['type'];
  timeIso: string;
  timeLabel: string;
  leftPercent: number;
  active: boolean;
  alarmEnabled: boolean;
}

interface SessionMenuState {
  sessionId: SessionWindow['id'];
  anchorX: number;
  anchorY: number;
}

interface EventMenuState {
  markerId: string;
  anchorX: number;
  anchorY: number;
}

interface OverlapPanelState {
  anchorX: number;
  anchorY: number;
}

interface FadeProfile {
  startAt: number;
  zeroAt: number;
}

// Reativado: timeline entra em modo de pausa durante mercado fechado.
const ENABLE_WEEKEND_TIMELINE_PAUSE = true;
const TRACK_ORDER: Array<{ id: SessionWindow['id'] | 'gold'; label: string }> = [
  { id: 'sydney', label: 'Sessao de Sydney' },
  { id: 'tokyo', label: 'Sessao Asiatica' },
  { id: 'hong_kong', label: 'Bolsa de Hong Kong' },
  { id: 'shanghai', label: 'Bolsa de Xangai' },
  { id: 'london', label: 'Sessao Europeia' },
  { id: 'gold', label: 'Janela de Ouro' },
  { id: 'brazil', label: 'Bolsa do Brasil' },
  { id: 'new_york', label: 'Sessao Americana' }
];
const TRACK_TOP_OFFSET = 34;
const TRACK_HEIGHT = 50;
const TRACK_GAP = 10;
const RAIL_HEIGHT = TRACK_TOP_OFFSET + TRACK_ORDER.length * (TRACK_HEIGHT + TRACK_GAP) + 16;

const OVERLAP_RULES: Array<{
  id: string;
  label: string;
  a: SessionWindow['id'];
  b: SessionWindow['id'];
}> = [
  {
    id: 'sydney_tokyo',
    label: 'Sydney + Toquio',
    a: 'sydney',
    b: 'tokyo'
  },
  {
    id: 'sydney_hong_kong',
    label: 'Sydney + Hong Kong',
    a: 'sydney',
    b: 'hong_kong'
  },
  {
    id: 'sydney_shanghai',
    label: 'Sydney + Xangai',
    a: 'sydney',
    b: 'shanghai'
  },
  {
    id: 'tokyo_hong_kong',
    label: 'Toquio + Hong Kong',
    a: 'tokyo',
    b: 'hong_kong'
  },
  {
    id: 'tokyo_shanghai',
    label: 'Toquio + Xangai',
    a: 'tokyo',
    b: 'shanghai'
  },
  {
    id: 'hong_kong_shanghai',
    label: 'Hong Kong + Xangai',
    a: 'hong_kong',
    b: 'shanghai'
  },
  {
    id: 'tokyo_london',
    label: 'Toquio + Londres',
    a: 'tokyo',
    b: 'london'
  },
  {
    id: 'hong_kong_london',
    label: 'Hong Kong + Londres',
    a: 'hong_kong',
    b: 'london'
  },
  {
    id: 'brazil_london',
    label: 'Brasil + Londres',
    a: 'brazil',
    b: 'london'
  },
  {
    id: 'london_newyork',
    label: 'Londres + Nova York',
    a: 'london',
    b: 'new_york'
  },
  {
    id: 'brazil_newyork',
    label: 'Brasil + Nova York',
    a: 'brazil',
    b: 'new_york'
  }
];

const DEFAULT_FADE_PROFILE: FadeProfile = { startAt: 16, zeroAt: 3 };
const COMPACT_FADE_PROFILE: FadeProfile = { startAt: 46, zeroAt: 14 };

interface TrackLayout {
  topOffset: number;
  trackHeight: number;
  trackGap: number;
  paddingBottom: number;
}

function getTrackTop(trackId: SessionWindow['id'] | 'gold', layout?: TrackLayout) {
  const index = TRACK_ORDER.findIndex((item) => item.id === trackId);
  const safeIndex = index >= 0 ? index : 0;
  const topOffset = layout?.topOffset ?? TRACK_TOP_OFFSET;
  const trackHeight = layout?.trackHeight ?? TRACK_HEIGHT;
  const trackGap = layout?.trackGap ?? TRACK_GAP;
  return topOffset + safeIndex * (trackHeight + trackGap);
}

function getRailHeight(layout?: TrackLayout) {
  const resolved = layout ?? {
    topOffset: TRACK_TOP_OFFSET,
    trackHeight: TRACK_HEIGHT,
    trackGap: TRACK_GAP,
    paddingBottom: 16
  };
  return resolved.topOffset + TRACK_ORDER.length * (resolved.trackHeight + resolved.trackGap) + resolved.paddingBottom;
}

function buildTimelineOverlapItems(blocks: SessionBlockItem[], now: DateTime, displayTimezone: string) {
  const bySession = new Map<SessionWindow['id'], SessionBlockItem[]>();
  blocks.forEach((block) => {
    const list = bySession.get(block.session.id) || [];
    list.push(block);
    bySession.set(block.session.id, list);
  });

  const overlaps: OverlapWindow[] = [];

  OVERLAP_RULES.forEach((rule) => {
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
          id: `${rule.id}_${start.toMillis()}`,
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
    .filter((item, index, source) => source.findIndex((x) => x.id === item.id) === index)
    .sort((a, b) => DateTime.fromISO(a.startIso, { setZone: true }).toMillis() - DateTime.fromISO(b.startIso, { setZone: true }).toMillis());
}

function formatMenuTime(timeIso: string, displayTimezone: string) {
  return DateTime.fromISO(timeIso, { setZone: true }).setZone(displayTimezone).toFormat('ccc dd/LL HH:mm');
}

function getRunningFadeOpacity(leftPercent: number, widthPercent: number, profile: FadeProfile) {
  const rightPercent = leftPercent + widthPercent;
  const fadeStartAt = profile.startAt;
  const fadeToZeroAt = profile.zeroAt;

  if (rightPercent >= fadeStartAt) {
    return 1;
  }

  const normalized = (rightPercent - fadeToZeroAt) / (fadeStartAt - fadeToZeroAt);
  return Math.max(0, Math.min(1, normalized));
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function getRunningFadeMask(leftPercent: number, widthPercent: number, profile: FadeProfile) {
  const fadeStartAt = profile.startAt;
  const fadeToZeroAt = profile.zeroAt;
  if (leftPercent >= fadeStartAt || widthPercent <= 0) {
    return undefined;
  }

  const startStop = clampPercent(((fadeToZeroAt - leftPercent) / widthPercent) * 100);
  const endStop = clampPercent(((fadeStartAt - leftPercent) / widthPercent) * 100);

  if (endStop <= 0) {
    return undefined;
  }

  if (startStop >= 100) {
    return 'linear-gradient(90deg, rgba(0,0,0,0), rgba(0,0,0,0))';
  }

  return `linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) ${startStop}%, rgba(0,0,0,1) ${endStop}%, rgba(0,0,0,1) 100%)`;
}

function resolveSessionTooltipLayer() {
  if (typeof document === 'undefined') {
    return null;
  }

  let root = document.getElementById('overlay-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'overlay-root';
    document.body.appendChild(root);
  }

  let layer = document.getElementById('overlay-layer-session-tooltip');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'overlay-layer-session-tooltip';
    root.appendChild(layer);
  }

  return layer;
}

function buildMarkers({
  blocks,
  overlaps,
  range,
  now,
  marketState,
  displayTimezone,
  locale
}: {
  blocks: SessionBlockItem[];
  overlaps: OverlapWindow[];
  range: TimelineRange;
  now: DateTime;
  marketState: MarketState;
  displayTimezone: string;
  locale: SupportedLocale;
}) {
  const markerMap = new Map<string, TimelineMarkerItem>();

  blocks.forEach((block) => {
    const markerId = `${block.session.id}-open-${block.startIso}`;
    const startTime = DateTime.fromISO(block.startIso, { setZone: true });
    if (startTime < range.start || startTime > range.end) {
      return;
    }

      markerMap.set(markerId, {
        id: markerId,
        label: t(locale, 'timeline.opening', { session: localizeSessionLabel(block.session.label, locale) }),
      type: 'session_open',
      timeIso: block.startIso,
      timeLabel: startTime.setZone(displayTimezone).toFormat('HH:mm'),
      leftPercent: toPercent(block.startIso, range),
      active: now >= startTime && now < DateTime.fromISO(block.endIso, { setZone: true }),
      alarmEnabled: false
    });
  });

  overlaps.forEach((item) => {
    if (intersectsRange(item.startIso, item.endIso, range)) {
      const startId = `${item.id}-start-${item.startIso}`;
      const endId = `${item.id}-end-${item.endIso}`;

      markerMap.set(startId, {
        id: startId,
        label: t(locale, 'timeline.overlapStart', { label: localizeOperationalText(item.label, locale) }),
        type: 'overlap_start',
        timeIso: item.startIso,
        timeLabel: DateTime.fromISO(item.startIso, { setZone: true }).setZone(displayTimezone).toFormat('HH:mm'),
        leftPercent: toPercent(item.startIso, range),
        active: now >= DateTime.fromISO(item.startIso, { setZone: true }) && now < DateTime.fromISO(item.endIso, { setZone: true }),
        alarmEnabled: false
      });

      markerMap.set(endId, {
        id: endId,
        label: t(locale, 'timeline.overlapEnd', { label: localizeOperationalText(item.label, locale) }),
        type: 'ideal_window_end',
        timeIso: item.endIso,
        timeLabel: DateTime.fromISO(item.endIso, { setZone: true }).setZone(displayTimezone).toFormat('HH:mm'),
        leftPercent: toPercent(item.endIso, range),
        active: false,
        alarmEnabled: false
      });
    }
  });

  if (marketState.nextGlobalCloseIso) {
    const markerId = `weekly-close-${marketState.nextGlobalCloseIso}`;
    const closeTime = DateTime.fromISO(marketState.nextGlobalCloseIso, { setZone: true });
    if (closeTime >= range.start && closeTime <= range.end) {
      markerMap.set(markerId, {
        id: markerId,
        label: t(locale, 'timeline.weeklyClose'),
        type: 'weekly_close',
        timeIso: marketState.nextGlobalCloseIso,
        timeLabel: closeTime.setZone(displayTimezone).toFormat('HH:mm'),
        leftPercent: toPercent(marketState.nextGlobalCloseIso, range),
        active: false,
        alarmEnabled: false
      });
    }
  }

  if (marketState.nextGlobalOpenIso) {
    const markerId = `weekly-open-${marketState.nextGlobalOpenIso}`;
    const openTime = DateTime.fromISO(marketState.nextGlobalOpenIso, { setZone: true });
    if (openTime >= range.start && openTime <= range.end) {
      markerMap.set(markerId, {
        id: markerId,
        label: t(locale, 'timeline.weeklyOpen'),
        type: 'weekly_open',
        timeIso: marketState.nextGlobalOpenIso,
        timeLabel: openTime.setZone(displayTimezone).toFormat('HH:mm'),
        leftPercent: toPercent(marketState.nextGlobalOpenIso, range),
        active: false,
        alarmEnabled: false
      });
    }
  }

  const sorted = [...markerMap.values()].sort((a, b) => DateTime.fromISO(a.timeIso, { setZone: true }).toMillis() - DateTime.fromISO(b.timeIso, { setZone: true }).toMillis());
  const maxByMode = 12;

  if (sorted.length <= maxByMode) {
    return sorted;
  }

  return sorted
    .map((item) => ({
      ...item,
      distanceToNow: Math.abs(DateTime.fromISO(item.timeIso, { setZone: true }).toMillis() - now.toMillis())
    }))
    .sort((a, b) => a.distanceToNow - b.distanceToNow)
    .slice(0, maxByMode)
    .sort((a, b) => DateTime.fromISO(a.timeIso, { setZone: true }).toMillis() - DateTime.fromISO(b.timeIso, { setZone: true }).toMillis())
    .map(({ distanceToNow, ...item }) => item);
}

export const SessionTimeline = memo(function SessionTimeline({
  seedNowIso,
  baseTimezone,
  locale,
  sessions,
  isPaused,
  marketState,
  currentSession,
  upcomingEvents,
  scrubMode = false,
  scrubNowIso,
  onScrubNowChange,
  rangeAnchorIso,
  slimNowLine = false,
  scrubStatusChips = []
}: SessionTimelineProps) {
  const liveNowIso = useLiveNow(seedNowIso, 1000, true);
  const nowIso = scrubMode ? scrubNowIso ?? seedNowIso : liveNowIso;
  const now = DateTime.fromISO(nowIso, { setZone: true }).setZone(baseTimezone);
  const [stripAnchorMs, setStripAnchorMs] = useState(() =>
    getStripAnchorForCenter(
      DateTime.fromISO(rangeAnchorIso ?? seedNowIso, { setZone: true }).toMillis()
    )
  );
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, centerIso: seedNowIso });
  const effectivePaused = ENABLE_WEEKEND_TIMELINE_PAUSE ? isPaused : false;
  const effectiveMarketState = useMemo<MarketState>(
    () =>
      ENABLE_WEEKEND_TIMELINE_PAUSE
        ? marketState
        : {
            ...marketState,
            isOpen: true,
            mode: 'open' as const
          },
    [marketState]
  );
  useEffect(() => {
    if (!scrubMode) {
      return;
    }

    const centerMs = now.toMillis();
    if (shouldReanchorStrip(centerMs, stripAnchorMs)) {
      setStripAnchorMs(getStripAnchorForCenter(centerMs));
    }
  }, [now, scrubMode, stripAnchorMs]);

  const range = useMemo(() => {
    if (scrubMode) {
      return buildStripRange(stripAnchorMs);
    }

    const start = now.minus({ hours: 12 }).startOf('minute');
    const end = now.plus({ hours: 12 }).endOf('minute');
    return { start, end, totalMs: end.toMillis() - start.toMillis() };
  }, [now, scrubMode, stripAnchorMs]);

  const contentLeftPercent = useMemo(
    () => (scrubMode ? getContentLeftPercent(nowIso, range) : 0),
    [nowIso, range, scrubMode]
  );
  const viewCenterPercent = useMemo(
    () => (scrubMode ? toPercent(nowIso, range) : 50),
    [nowIso, range, scrubMode]
  );
  const reopenCountdownSeconds = effectiveMarketState.nextGlobalOpenIso
    ? Math.max(
        0,
        Math.floor(
          (DateTime.fromISO(effectiveMarketState.nextGlobalOpenIso, { setZone: true }).toMillis() - now.toMillis()) / 1000
        )
      )
    : 0;
  const reopenAtLabel = effectiveMarketState.nextGlobalOpenIso
    ? formatMenuTime(effectiveMarketState.nextGlobalOpenIso, baseTimezone)
    : '--';
  const timelineTimezoneLabel = useMemo(() => formatTimezoneCityLabel(baseTimezone), [baseTimezone]);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const captureCardRef = useRef<HTMLDivElement | null>(null);
  const railScrubRef = useRef<HTMLDivElement | null>(null);
  const nowPopupTimeoutRef = useRef<number | null>(null);
  const panelOpenRef = useRef(false);
  const suppressSessionClickUntilRef = useRef(0);
  const isScrubbingRef = useRef(false);

  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [hoveredTooltipPosition, setHoveredTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [sessionMenu, setSessionMenu] = useState<SessionMenuState | null>(null);
  const [eventMenu, setEventMenu] = useState<EventMenuState | null>(null);
  const [overlapPanel, setOverlapPanel] = useState<OverlapPanelState | null>(null);
  const [showNowPopover, setShowNowPopover] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia('(max-width: 1024px), (orientation: portrait)').matches;
  });
  const scrubLayout = useMemo((): TrackLayout | null => {
    if (!scrubMode) {
      return null;
    }

    if (isCompactViewport) {
      return { topOffset: 6, trackHeight: 40, trackGap: 7, paddingBottom: 32 };
    }

    return { topOffset: 10, trackHeight: 48, trackGap: 9, paddingBottom: 24 };
  }, [isCompactViewport, scrubMode]);
  const railHeight = scrubLayout ? getRailHeight(scrubLayout) : RAIL_HEIGHT;
  const trackLayout = scrubLayout ?? undefined;
  const scrubTouchSensitivity = isCompactViewport ? 1.35 : 1.1;

  const updateDragFromClientX = useCallback(
    (clientX: number) => {
      if (!scrubMode || !onScrubNowChange || !railScrubRef.current) {
        return;
      }

      const deltaX = clientX - dragStartRef.current.x;
      const rect = railScrubRef.current.getBoundingClientRect();
      const nextIso = shiftIsoByDragDelta(
        dragStartRef.current.centerIso,
        deltaX,
        rect.width,
        scrubTouchSensitivity
      );
      onScrubNowChange(nextIso);
    },
    [onScrubNowChange, scrubMode, scrubTouchSensitivity]
  );

  const beginScrub = useCallback(
    (clientX: number) => {
      isScrubbingRef.current = true;
      setIsDragging(true);
      dragStartRef.current = { x: clientX, centerIso: nowIso };
    },
    [nowIso]
  );

  const endScrub = useCallback(() => {
    if (isScrubbingRef.current) {
      suppressSessionClickUntilRef.current = Date.now() + 280;
    }
    isScrubbingRef.current = false;
    setIsDragging(false);
  }, []);

  const handleRailPointerDownCapture = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!scrubMode || effectivePaused) {
        return;
      }

      if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
      }

      beginScrub(event.clientX);
      if (event.currentTarget.setPointerCapture) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    },
    [beginScrub, effectivePaused, scrubMode]
  );

  useEffect(() => {
    if (!scrubMode) {
      return;
    }

    const handleMove = (event: PointerEvent) => {
      if (!isScrubbingRef.current) {
        return;
      }
      updateDragFromClientX(event.clientX);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!isScrubbingRef.current) {
        return;
      }
      const touch = event.touches[0];
      if (!touch) {
        return;
      }
      event.preventDefault();
      updateDragFromClientX(touch.clientX);
    };

    const handleUp = () => {
      endScrub();
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleUp);
    window.addEventListener('touchcancel', handleUp);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleUp);
      window.removeEventListener('touchcancel', handleUp);
    };
  }, [endScrub, scrubMode, updateDragFromClientX]);
  const blocks = useMemo<SessionBlockItem[]>(() => {
    const items: SessionBlockItem[] = [];
    sessions.forEach((session) => {
      const windows =
        session.windows && session.windows.length
          ? session.windows
          : session.startIso && session.endIso
            ? [{ id: `${session.id}-fallback`, startIso: session.startIso, endIso: session.endIso }]
            : [];

      windows.forEach((window, index) => {
        const startIso = window.startIso;
        const endIso = window.endIso;
        if (!startIso || !endIso || !intersectsRange(startIso, endIso, range)) {
          return;
        }

        const start = DateTime.fromISO(startIso, { setZone: true });
        const end = DateTime.fromISO(endIso, { setZone: true });
        const left = toPercent(startIso, range);
        const right = toPercent(endIso, range);
        const startDisplay = start.setZone(baseTimezone);
        const endDisplay = end.setZone(baseTimezone);

        items.push({
          key: `${session.id}-${index}-${startIso}`,
          session,
          startIso,
          endIso,
          startLabel: startDisplay.toFormat('HH:mm'),
          endLabel: endDisplay.toFormat('HH:mm'),
          leftPercent: left,
          widthPercent: Math.max(scrubMode && isCompactViewport ? 9 : scrubMode ? 6 : 3, right - left),
          active: effectiveMarketState.isOpen && now >= start && now < end
        });
      });
    });

    return items.sort((a, b) => DateTime.fromISO(a.startIso, { setZone: true }).toMillis() - DateTime.fromISO(b.startIso, { setZone: true }).toMillis());
  }, [isCompactViewport, scrubMode, sessions, range, now, effectiveMarketState.isOpen]);
  const timelineOverlaps = useMemo(() => buildTimelineOverlapItems(blocks, now, baseTimezone), [blocks, now, baseTimezone]);
  const currentOverlapBadge = useMemo(
    () => timelineOverlaps.find((item) => item.isActive && item.id.startsWith('london_newyork_')) || null,
    [timelineOverlaps]
  );
  const markers = useMemo(
    () =>
      buildMarkers({
        blocks,
        overlaps: timelineOverlaps,
        range,
        now,
        marketState: effectiveMarketState,
        displayTimezone: baseTimezone,
        locale
      }),
    [blocks, timelineOverlaps, range, now, effectiveMarketState, baseTimezone, locale]
  );
  const nowActiveSessionLabel = useMemo(() => {
    const activeLabels = blocks.filter((item) => item.active).map((item) => item.session.label);
    if (!activeLabels.length) {
      return t(locale, 'phase.noActiveSession');
    }
    return [...new Set(activeLabels)].map((label) => localizeSessionLabel(label, locale)).join(' + ');
  }, [blocks, locale]);
  const overlapBadgeItems = useMemo(
    () =>
      OVERLAP_RULES.map((rule) => {
        const items = timelineOverlaps
          .filter((item) => item.id.startsWith(`${rule.id}_`))
          .sort((a, b) => DateTime.fromISO(a.startIso, { setZone: true }).toMillis() - DateTime.fromISO(b.startIso, { setZone: true }).toMillis());
        const active = items.find((item) => item.isActive) || null;
        const next =
          items.find((item) => DateTime.fromISO(item.endIso, { setZone: true }).toMillis() >= now.toMillis()) ||
          items[0] ||
          null;
        const display = active || next;

        if (!display) {
          return null;
        }

        return {
          id: rule.id,
          label: localizeOperationalText(rule.label, locale),
          active: Boolean(active),
          rangeLabel: `${display.startLabel}-${display.endLabel}`
        };
      }).filter(Boolean) as Array<{ id: string; label: string; active: boolean; rangeLabel: string }>,
    [timelineOverlaps, now, locale]
  );

  const hoveredBlock = useMemo(() => blocks.find((item) => item.key === hoveredKey) || null, [blocks, hoveredKey]);
  const tooltipPortalTarget = useMemo(() => resolveSessionTooltipLayer(), []);
  const fadeProfile = useMemo(() => (isCompactViewport ? COMPACT_FADE_PROFILE : DEFAULT_FADE_PROFILE), [isCompactViewport]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === sessionMenu?.sessionId) || null,
    [sessionMenu, sessions]
  );
  const selectedSessionDetails = useMemo(() => {
    if (!selectedSession) {
      return '';
    }

    const insight = getSessionInsight(selectedSession.id, locale);
    return `${insight.behavior}. ${t(locale, 'phase.expectedLiquidity')}: ${insight.liquidity}.`;
  }, [selectedSession, locale]);
  const isSessionPanelOpen = Boolean(selectedSession && sessionMenu);

  const selectedEventMarker = useMemo(
    () => markers.find((item) => item.id === eventMenu?.markerId) || null,
    [markers, eventMenu]
  );

  const handleGoToNow = useCallback(() => {
    if (nowPopupTimeoutRef.current) {
      window.clearTimeout(nowPopupTimeoutRef.current);
    }
    setShowNowPopover(true);
    nowPopupTimeoutRef.current = window.setTimeout(() => setShowNowPopover(false), 3200);
  }, []);

  useEffect(
    () => () => {
      if (nowPopupTimeoutRef.current) {
        window.clearTimeout(nowPopupTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const media = window.matchMedia('(max-width: 1024px), (orientation: portrait)');
    const update = () => setIsCompactViewport(media.matches);
    update();

    media.addEventListener?.('change', update);
    window.addEventListener('resize', update);
    return () => {
      media.removeEventListener?.('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const closePanels = useCallback(() => {
    setSessionMenu(null);
    setEventMenu(null);
    setOverlapPanel(null);
  }, []);

  useEffect(() => {
    const onOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-timeline-panel="true"]')) {
        return;
      }

      if (!rootRef.current?.contains(event.target as Node)) {
        closePanels();
      }
    };

    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, [closePanels]);

  const overlapBands = useMemo(
    () =>
      timelineOverlaps
        .filter((item) => item.id.startsWith('london_newyork_'))
        .map((item) => {
          const left = toPercent(item.startIso, range);
          const right = toPercent(item.endIso, range);

          return {
            ...item,
            id: `golden_window_${item.id}`,
            left,
            width: Math.max(2, right - left)
          };
        }),
    [timelineOverlaps, range]
  );
  const overlapBand = useMemo(() => {
    if (!overlapBands.length) {
      return null;
    }

    const active = overlapBands.find((item) => item.isActive);
    if (active) {
      return active;
    }

    const next = overlapBands.find(
      (item) => DateTime.fromISO(item.startIso, { setZone: true }).toMillis() >= now.toMillis()
    );
    return next || overlapBands[overlapBands.length - 1];
  }, [overlapBands, now]);
  const nextEventFromUpcoming = useMemo(
    () =>
      upcomingEvents.find((event) => DateTime.fromISO(event.timeIso, { setZone: true }).toMillis() >= now.toMillis()) ||
      null,
    [upcomingEvents, now]
  );
  const isAnyTimelinePanelOpen = Boolean(sessionMenu || eventMenu || overlapPanel);
  panelOpenRef.current = isAnyTimelinePanelOpen;

  return (
    <div ref={rootRef}>
      <div ref={captureCardRef}>
      <Card className="relative z-20 overflow-visible border-border/70 bg-slate-950/70">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{t(locale, 'timeline.title')}</CardTitle>
          {scrubMode ? (
            <>
              <Badge variant="default" className="border-cyan/40 bg-cyan/10 text-cyan">
                Arraste o fundo
              </Badge>
              <PreviewStatusChips chips={scrubStatusChips} variant="badge" />
            </>
          ) : null}
          {!scrubMode && effectivePaused ? (
            <Badge variant="warning">{t(locale, 'timeline.paused')}</Badge>
          ) : null}
          {!scrubMode && !effectivePaused && currentOverlapBadge ? (
            <Badge variant="gold">{t(locale, 'timeline.overlapActive', { label: localizeOperationalText(currentOverlapBadge.label, locale) })}</Badge>
          ) : null}
          {!scrubMode && !effectivePaused && !currentOverlapBadge ? (
            <Badge variant="neutral">{t(locale, 'timeline.noOverlap')}</Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className={cn('relative space-y-3', scrubMode && 'space-y-2')}>
        {!scrubMode ? (
          <p className="text-xs text-mutedForeground">{t(locale, 'timeline.windowLabel', { city: timelineTimezoneLabel })}</p>
        ) : null}
        <div
          className={cn(
            'timeline-grab overflow-x-hidden rounded-lg border border-border/80 bg-gradient-to-r from-[#0a1835] via-[#0d2349] to-[#1b0e1b]',
            scrubMode ? 'touch-pan-y p-2 pb-10 sm:pb-9' : 'p-2 pb-9'
          )}
          onClick={(event) => {
            if (!isAnyTimelinePanelOpen) {
              return;
            }

            const target = event.target as HTMLElement;
            if (target.closest('[data-timeline-interactive="true"]') || target.closest('[data-timeline-panel="true"]')) {
              return;
            }

            closePanels();
          }}
        >
          <div
            ref={railScrubRef}
            className={cn(
              'relative select-none',
              scrubMode && 'cursor-grab touch-pan-y',
              scrubMode && isDragging && 'cursor-grabbing'
            )}
            style={{ minWidth: '100%', height: `${railHeight}px` }}
          >
            {scrubMode ? (
              <div
                className="absolute inset-0 z-[25] touch-none"
                style={{ touchAction: 'none' }}
                onPointerDownCapture={handleRailPointerDownCapture}
                onTouchStart={(event) => {
                  if (effectivePaused) {
                    return;
                  }
                  const touch = event.touches[0];
                  if (!touch) {
                    return;
                  }
                  beginScrub(touch.clientX);
                }}
                aria-hidden
              />
            ) : null}
            <div
              className={cn('absolute inset-0 z-0', scrubMode && 'inset-y-0 top-0')}
              style={
                scrubMode
                  ? {
                      width: `${STRIP_WIDTH_FACTOR * 100}%`,
                      left: `${contentLeftPercent}%`,
                      transition: isDragging ? 'none' : 'left 0.2s linear'
                    }
                  : undefined
              }
            >
            {TRACK_ORDER.map((track) => (
              <div
                key={track.id}
                className="absolute inset-x-0 border-y border-white/5 bg-white/[0.015]"
                style={{
                  top: `${getTrackTop(track.id, trackLayout)}px`,
                  height: `${trackLayout?.trackHeight ?? TRACK_HEIGHT}px`
                }}
              >
                <span
                  className={cn(
                    'absolute left-2 top-1.5 z-[2] rounded bg-black/45 px-1.5 py-0.5 text-slate-200',
                    scrubMode ? 'max-w-[42%] truncate text-[9px] sm:text-[10px]' : 'text-[10px]'
                  )}
                >
                  {localizeSessionLabel(track.label, locale)}
                </span>
              </div>
            ))}

            {overlapBands.map((band) => {
              const overlapStyle = {
                left: `${band.left}%`,
                width: `${band.width}%`,
                top: `${getTrackTop('gold', trackLayout)}px`,
                height: `${trackLayout?.trackHeight ?? TRACK_HEIGHT}px`,
                opacity: scrubMode
                  ? getViewportFadeOpacity(band.left, band.width, viewCenterPercent)
                  : getRunningFadeOpacity(band.left, band.width, fadeProfile)
              };

              if (scrubMode) {
                return (
                  <div
                    key={`${band.id}-${band.startIso}`}
                    data-timeline-scrollable="true"
                    className="pointer-events-none absolute z-[5] rounded-md border border-gold/70 bg-gradient-to-r from-gold/25 to-warning/30"
                    style={overlapStyle}
                  >
                    <span className="absolute left-2 top-1.5 max-w-[70%] truncate rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold text-gold sm:text-[10px]">
                      {localizeSessionLabel('Janela de Ouro', locale)}
                    </span>
                  </div>
                );
              }

              return (
              <button
                key={`${band.id}-${band.startIso}`}
                type="button"
                data-timeline-interactive="true"
                data-timeline-scrollable="true"
                className="absolute z-[5] border border-gold/70 bg-gradient-to-r from-gold/25 to-warning/30 rounded-md"
                style={{
                  ...overlapStyle,
                  maskImage: getRunningFadeMask(band.left, band.width, fadeProfile),
                  WebkitMaskImage: getRunningFadeMask(band.left, band.width, fadeProfile)
                }}
                onClick={(event) => {
                  if (isAnyTimelinePanelOpen) {
                    closePanels();
                    return;
                  }

                  setOverlapPanel({
                    anchorX: event.clientX,
                    anchorY: event.clientY
                  });
                }}
                title="Janela de Ouro"
              >
                <span className="absolute left-2 top-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-gold">
                  {localizeSessionLabel('Janela de Ouro', locale)}
                </span>
              </button>
            );
            })}

            {blocks.map((block) => {
              const fadeMaskImage = scrubMode
                ? undefined
                : getRunningFadeMask(block.leftPercent, block.widthPercent, fadeProfile);

              return (
                <SessionBlock
                  key={block.key}
                  label={localizeSessionLabel(block.session.label, locale)}
                  startLabel={block.startLabel}
                  endLabel={block.endLabel}
                  color={block.session.color}
                  leftPercent={block.leftPercent}
                  widthPercent={block.widthPercent}
                  trackTop={getTrackTop(block.session.id, trackLayout)}
                  trackHeight={trackLayout?.trackHeight ?? TRACK_HEIGHT}
                  opacity={
                    scrubMode
                      ? getViewportFadeOpacity(block.leftPercent, block.widthPercent, viewCenterPercent)
                      : getRunningFadeOpacity(block.leftPercent, block.widthPercent, fadeProfile)
                  }
                  fadeMaskImage={fadeMaskImage}
                  active={block.active}
                  alarmEnabled={false}
                  favorite={false}
                  interactive={!scrubMode}
                  onMouseEnter={scrubMode ? undefined : (event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    setHoveredKey(block.key);
                    setHoveredTooltipPosition({
                      x: rect.left + rect.width / 2,
                      y: rect.top - 6
                    });
                  }}
                  onMouseLeave={
                    scrubMode
                      ? undefined
                      : () => {
                    setHoveredKey((current) => (current === block.key ? null : current));
                    setHoveredTooltipPosition(null);
                  }
                  }
                  onClick={
                    scrubMode
                      ? undefined
                      : (event) => {
                    if (Date.now() < suppressSessionClickUntilRef.current) {
                      return;
                    }

                    if (isAnyTimelinePanelOpen) {
                      closePanels();
                      return;
                    }

                    setSessionMenu({
                      sessionId: block.session.id,
                      anchorX: event.clientX,
                      anchorY: event.clientY
                    });
                    setEventMenu(null);
                    setOverlapPanel(null);
                  }
                  }
                />
              );
            })}

            {!scrubMode
              ? markers.map((marker) => (
              <SessionEventMarker
                key={marker.id}
                label={marker.label}
                timeLabel={marker.timeLabel}
                leftPercent={marker.leftPercent}
                active={marker.active}
                alarmEnabled={marker.alarmEnabled}
                onClick={(event) => {
                  suppressSessionClickUntilRef.current = Date.now() + 450;
                  if (isAnyTimelinePanelOpen) {
                    closePanels();
                    return;
                  }

                  setEventMenu({
                    markerId: marker.id,
                    anchorX: event.clientX,
                    anchorY: event.clientY
                  });
                  setSessionMenu(null);
                  setOverlapPanel(null);
                }}
              />
            ))
              : null}
            </div>

            {scrubMode ? (
              <NowIndicator
                leftPercent={LIVE_NOW_POSITION}
                hidden={effectivePaused}
                onClick={() => undefined}
                slimLine={slimNowLine}
                label={now.toFormat('HH:mm')}
              />
            ) : (
              <NowIndicator
                leftPercent={50}
                hidden={effectivePaused}
                onClick={handleGoToNow}
                showPopup={showNowPopover}
                popup={
                  <div className="space-y-1 text-xs text-slate-200">
                    <p className="font-semibold text-cyan">{t(locale, 'timeline.now', { time: now.toFormat('HH:mm:ss') })}</p>
                    <p>{t(locale, 'timeline.session', { session: nowActiveSessionLabel })}</p>
                    <p>{t(locale, 'timeline.phase', { phase: getCurrentPhaseLabel(currentSession, effectiveMarketState, locale) })}</p>
                    <p>
                      {t(locale, 'timeline.market', {
                        status: effectiveMarketState.isOpen ? t(locale, 'timeline.marketOpen') : t(locale, 'timeline.marketClosed')
                      })}
                    </p>
                  </div>
                }
              />
            )}

            {effectivePaused ? (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 backdrop-blur-[1.5px]">
                <div className="rounded-lg border border-warning/55 bg-[#120f08]/92 px-4 py-3 text-center shadow-[0_12px_35px_rgba(0,0,0,.45)]">
                  <p className="text-xs font-semibold uppercase tracking-wide text-warning">{t(locale, 'timeline.closedTitle')}</p>
                  <p className="mt-1 text-sm text-slate-100">{localizeMarketContextLabel(effectiveMarketState.contextLabel, locale)}</p>
                  <p className="mt-1 font-mono text-base text-gold">{t(locale, 'timeline.reopenIn', { countdown: formatCountdown(reopenCountdownSeconds) })}</p>
                  <p className="mt-1 text-xs text-mutedForeground">
                    {t(locale, 'timeline.nextSession', {
                      session: localizeSessionLabel(effectiveMarketState.nextSessionLabel, locale),
                      time: reopenAtLabel
                    })}
                  </p>
                </div>
              </div>
            ) : null}

          </div>
        </div>

        {!scrubMode ? (
        <div className="flex flex-wrap items-center gap-2">
          {overlapBadgeItems.map((item) => (
            <Badge
              key={item.id}
              variant={item.active ? 'gold' : 'neutral'}
              className={cn(!item.active && 'hidden md:inline-flex')}
            >
              {item.label}: {item.rangeLabel}
            </Badge>
          ))}

          {nextEventFromUpcoming ? (
            <Badge variant="default" className="ml-auto">
              <Clock3 className="mr-1 h-3 w-3" />
              {t(locale, 'timeline.nextEvent', { title: localizeEventTitle(nextEventFromUpcoming.title, locale) })}
            </Badge>
          ) : null}

          {!effectiveMarketState.isOpen ? (
            <Badge variant="warning">
              <Waves className="mr-1 h-3 w-3" />
              {t(locale, 'timeline.pausedBadge')}
            </Badge>
          ) : null}
        </div>
        ) : (
          <p className="text-center text-[11px] text-slate-500 sm:text-xs">
            Arraste horizontalmente na área da timeline
          </p>
        )}
      </CardContent>
      </Card>
      </div>

      {isAnyTimelinePanelOpen ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[600] bg-black/15 backdrop-blur-[2px]"
        />
      ) : null}

      <SessionPanel
        locale={locale}
        open={isSessionPanelOpen}
        anchorX={sessionMenu?.anchorX || 0}
        anchorY={sessionMenu?.anchorY || 0}
        sessionLabel={selectedSession?.label ? localizeSessionLabel(selectedSession.label, locale) : ''}
        details={selectedSessionDetails}
      />

      <EventMarkerPopup
        locale={locale}
        open={Boolean(selectedEventMarker && eventMenu)}
        anchorX={eventMenu?.anchorX || 0}
        anchorY={eventMenu?.anchorY || 0}
        label={selectedEventMarker?.label || ''}
        timeIso={selectedEventMarker?.timeIso || nowIso}
        displayTimezone={baseTimezone}
      />

      <GoldenWindowPanel
        locale={locale}
        open={Boolean(overlapPanel && overlapBand)}
        anchorX={overlapPanel?.anchorX || 0}
        anchorY={overlapPanel?.anchorY || 0}
        startIso={overlapBand?.startIso || nowIso}
        endIso={overlapBand?.endIso || nowIso}
        displayTimezone={baseTimezone}
      />

      {hoveredBlock && hoveredTooltipPosition && tooltipPortalTarget
        ? createPortal(
            <div
              data-timeline-panel="true"
              className="pointer-events-none fixed z-[720] -translate-x-1/2 -translate-y-full pt-1 transition-opacity"
              style={{ left: `${hoveredTooltipPosition.x}px`, top: `${hoveredTooltipPosition.y}px` }}
            >
              <SessionTooltip
                locale={locale}
                session={hoveredBlock.session}
                startLabel={hoveredBlock.startLabel}
                endLabel={hoveredBlock.endLabel}
                statusLabel={getSessionStatusLabel(now, hoveredBlock.startIso, hoveredBlock.endIso, locale)}
                liquidity={getSessionInsight(hoveredBlock.session.id, locale).liquidity}
                behavior={getSessionInsight(hoveredBlock.session.id, locale).behavior}
                assets={getSessionInsight(hoveredBlock.session.id, locale).assets}
                overlapLabel={getOverlapLabel(timelineOverlaps, hoveredBlock.session.id, locale)}
                alarmEnabled={false}
                timezoneLabel={timelineTimezoneLabel}
              />
            </div>,
            tooltipPortalTarget
          )
        : null}
    </div>
  );
});
