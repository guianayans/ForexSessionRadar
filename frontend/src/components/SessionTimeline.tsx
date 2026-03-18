import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock3, Waves } from 'lucide-react';
import { DateTime } from 'luxon';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLiveNow } from '@/hooks/useLiveNow';
import type { CurrentSession, MarketState, OverlapWindow, Preferences, SessionWindow, UpcomingEvent } from '@/types/dashboard';
import { useTimelineUiStore } from '@/store/useTimelineUiStore';
import { uploadTimelineSnapshot } from '@/services/api';
import { captureTimelineSnapshot as captureStableTimelineSnapshot } from '@/lib/timelineSnapshotCapture';
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
  getSessionAlarmEnabled,
  getSessionInsight,
  getSessionStatusLabel,
  intersectsRange,
  toPercent,
  type TimelineRange
} from '@/components/timeline/timeline-utils';
import { formatCountdown } from '@/lib/utils';

interface SessionTimelineProps {
  seedNowIso: string;
  baseTimezone: string;
  locale: SupportedLocale;
  sessions: SessionWindow[];
  isPaused: boolean;
  marketState: MarketState;
  currentSession: CurrentSession;
  preferences: Preferences;
  upcomingEvents: UpcomingEvent[];
  onUpdatePreferences: (payload: Partial<Preferences>) => Promise<void>;
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
const EMPTY_LEAD_MINUTES: Array<5 | 10 | 15 | 30> = [];
const VALID_LEAD_MINUTES = new Set<5 | 10 | 15 | 30>([5, 10, 15, 30]);
type TimelineEventAlarmConfig = NonNullable<Preferences['eventAlarms']>[string];

function normalizeLeadMinutes(values: unknown) {
  if (!Array.isArray(values)) {
    return EMPTY_LEAD_MINUTES;
  }

  const normalized = [...new Set(values.filter((value): value is 5 | 10 | 15 | 30 => VALID_LEAD_MINUTES.has(value)))].sort(
    (a, b) => a - b
  );
  return normalized.length ? normalized : EMPTY_LEAD_MINUTES;
}

function resolveEventLeadMinutes(
  eventAlarm: TimelineEventAlarmConfig | undefined,
  fallback: 5 | 10 | 15 | 30
) {
  const fromArray = normalizeLeadMinutes(eventAlarm?.beforeMinutes);
  if (fromArray.length) {
    return fromArray;
  }

  if (eventAlarm?.leadMinutes && VALID_LEAD_MINUTES.has(eventAlarm.leadMinutes)) {
    return [eventAlarm.leadMinutes];
  }

  return [fallback];
}

const TRACK_ORDER: Array<{ id: SessionWindow['id'] | 'gold'; label: string }> = [
  { id: 'sydney', label: 'Sessao de Sydney' },
  { id: 'tokyo', label: 'Sessao Asiatica' },
  { id: 'london', label: 'Sessao Europeia' },
  { id: 'gold', label: 'Janela de Ouro' },
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
    id: 'tokyo_london',
    label: 'Toquio + Londres',
    a: 'tokyo',
    b: 'london'
  },
  {
    id: 'london_newyork',
    label: 'Londres + Nova York',
    a: 'london',
    b: 'new_york'
  }
];

const DEFAULT_FADE_PROFILE: FadeProfile = { startAt: 16, zeroAt: 3 };
const COMPACT_FADE_PROFILE: FadeProfile = { startAt: 46, zeroAt: 14 };

function getTrackTop(trackId: SessionWindow['id'] | 'gold') {
  const index = TRACK_ORDER.findIndex((item) => item.id === trackId);
  const safeIndex = index >= 0 ? index : 0;
  return TRACK_TOP_OFFSET + safeIndex * (TRACK_HEIGHT + TRACK_GAP);
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
  eventAlarms,
  displayTimezone,
  locale
}: {
  blocks: SessionBlockItem[];
  overlaps: OverlapWindow[];
  range: TimelineRange;
  now: DateTime;
  marketState: MarketState;
  eventAlarms?: Preferences['eventAlarms'];
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
      alarmEnabled: Boolean(eventAlarms?.[markerId]?.enabled)
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
        alarmEnabled: Boolean(eventAlarms?.[startId]?.enabled)
      });

      markerMap.set(endId, {
        id: endId,
        label: t(locale, 'timeline.overlapEnd', { label: localizeOperationalText(item.label, locale) }),
        type: 'ideal_window_end',
        timeIso: item.endIso,
        timeLabel: DateTime.fromISO(item.endIso, { setZone: true }).setZone(displayTimezone).toFormat('HH:mm'),
        leftPercent: toPercent(item.endIso, range),
        active: false,
        alarmEnabled: Boolean(eventAlarms?.[endId]?.enabled)
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
        alarmEnabled: Boolean(eventAlarms?.[markerId]?.enabled)
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
        alarmEnabled: Boolean(eventAlarms?.[markerId]?.enabled)
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
  preferences,
  upcomingEvents,
  onUpdatePreferences
}: SessionTimelineProps) {
  const nowIso = useLiveNow(seedNowIso, 1000);
  const now = DateTime.fromISO(nowIso, { setZone: true }).setZone(baseTimezone);
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
  const reopenCountdownSeconds = effectiveMarketState.nextGlobalOpenIso
    ? Math.max(0, Math.floor((DateTime.fromISO(effectiveMarketState.nextGlobalOpenIso, { setZone: true }).toMillis() - now.toMillis()) / 1000))
    : 0;
  const reopenAtLabel = effectiveMarketState.nextGlobalOpenIso
    ? formatMenuTime(effectiveMarketState.nextGlobalOpenIso, baseTimezone)
    : '--';
  const timelineTimezoneLabel = useMemo(() => formatTimezoneCityLabel(baseTimezone), [baseTimezone]);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const captureCardRef = useRef<HTMLDivElement | null>(null);
  const nowPopupTimeoutRef = useRef<number | null>(null);
  const snapshotUploadInFlightRef = useRef(false);
  const lastSnapshotUploadAtRef = useRef(0);
  const panelOpenRef = useRef(false);
  const suppressSessionClickUntilRef = useRef(0);

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

  const range = useMemo(() => {
    // Janela móvel: sessões caminham da direita para esquerda com "AGORA" fixo no centro.
    const start = now.minus({ hours: 12 }).startOf('minute');
    const end = now.plus({ hours: 12 }).endOf('minute');
    return { start, end, totalMs: end.toMillis() - start.toMillis() };
  }, [now]);
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
          widthPercent: Math.max(3, right - left),
          active: effectiveMarketState.isOpen && now >= start && now < end
        });
      });
    });

    return items.sort((a, b) => DateTime.fromISO(a.startIso, { setZone: true }).toMillis() - DateTime.fromISO(b.startIso, { setZone: true }).toMillis());
  }, [sessions, range, now, effectiveMarketState.isOpen]);
  const timelineOverlaps = useMemo(() => buildTimelineOverlapItems(blocks, now, baseTimezone), [blocks, now, baseTimezone]);
  const currentOverlapBadge = useMemo(
    () => timelineOverlaps.find((item) => item.isActive) || null,
    [timelineOverlaps]
  );
  const nowClockLabel = now.toFormat('HH:mm:ss');
  const leftTimelineLabel = `${range.start.toFormat('dd/LL')} ${nowClockLabel}`;
  const rightTimelineLabel = `${range.end.toFormat('dd/LL')} ${nowClockLabel}`;

  const markers = useMemo(
    () =>
      buildMarkers({
        blocks,
        overlaps: timelineOverlaps,
        range,
        now,
        marketState: effectiveMarketState,
        eventAlarms: preferences.eventAlarms,
        displayTimezone: baseTimezone,
        locale
      }),
    [blocks, timelineOverlaps, range, now, effectiveMarketState, preferences.eventAlarms, baseTimezone, locale]
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
        const next = items.find((item) => DateTime.fromISO(item.endIso, { setZone: true }).toMillis() >= now.toMillis()) || items[0] || null;
        const display = active || next;

        return {
          id: rule.id,
          label: localizeOperationalText(rule.label, locale),
          active: Boolean(active),
          rangeLabel: display ? `${display.startLabel}-${display.endLabel}` : '--:--'
        };
      }),
    [timelineOverlaps, now, locale]
  );

  const hoveredBlock = useMemo(() => blocks.find((item) => item.key === hoveredKey) || null, [blocks, hoveredKey]);
  const tooltipPortalTarget = useMemo(() => resolveSessionTooltipLayer(), []);
  const fadeProfile = useMemo(() => (isCompactViewport ? COMPACT_FADE_PROFILE : DEFAULT_FADE_PROFILE), [isCompactViewport]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === sessionMenu?.sessionId) || null,
    [sessionMenu, sessions]
  );
  const selectedSessionId = selectedSession?.id ?? null;
  const selectedSessionAlarmConfig = useMemo(
    () => (selectedSessionId ? preferences.sessionAlarms?.[selectedSessionId] : undefined),
    [preferences.sessionAlarms, selectedSessionId]
  );
  const selectedSessionDetails = useMemo(() => {
    if (!selectedSession) {
      return '';
    }

    const insight = getSessionInsight(selectedSession.id, locale);
    return `${insight.behavior}. ${t(locale, 'phase.expectedLiquidity')}: ${insight.liquidity}.`;
  }, [selectedSession, locale]);
  const selectedSessionBeforeMinutes = useMemo(() => {
    const minutes = selectedSessionAlarmConfig?.beforeMinutes;
    if (!minutes || minutes.length === 0) {
      return EMPTY_LEAD_MINUTES;
    }

    return minutes;
  }, [selectedSessionAlarmConfig?.beforeMinutes]);
  // Estado centralizado do painel de sessão.
  const isSessionPanelOpen = Boolean(selectedSession && sessionMenu);

  const selectedEventMarker = useMemo(
    () => markers.find((item) => item.id === eventMenu?.markerId) || null,
    [markers, eventMenu]
  );
  const selectedEventAlarmConfig = useMemo(
    () => (selectedEventMarker ? preferences.eventAlarms?.[selectedEventMarker.id] : undefined),
    [preferences.eventAlarms, selectedEventMarker]
  );
  const selectedEventBeforeMinutes = useMemo(
    () => resolveEventLeadMinutes(selectedEventAlarmConfig, preferences.alertLeadMinutes),
    [preferences.alertLeadMinutes, selectedEventAlarmConfig]
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

  const updateSessionAlarm = useCallback(
    (sessionId: SessionWindow['id'], nextPatch: Partial<NonNullable<Preferences['sessionAlarms']>[SessionWindow['id']]>) => {
      const currentMap = preferences.sessionAlarms || {};
      const currentConfig = currentMap[sessionId] || {};
      const next = {
        ...currentMap,
        [sessionId]: {
          ...currentConfig,
          ...nextPatch
        }
      };

      void onUpdatePreferences({ sessionAlarms: next });
    },
    [preferences.sessionAlarms, onUpdatePreferences]
  );

  const toggleSessionLead = useCallback(
    (sessionId: SessionWindow['id'], minutes: 5 | 10 | 15 | 30) => {
      const current = preferences.sessionAlarms?.[sessionId]?.beforeMinutes || [];
      const has = current.includes(minutes);
      const next = has ? current.filter((value) => value !== minutes) : [...current, minutes].sort((a, b) => a - b);
      updateSessionAlarm(sessionId, { beforeMinutes: next });
    },
    [preferences.sessionAlarms, updateSessionAlarm]
  );

  const updateEventAlarm = useCallback(
    (eventId: string, patch: Partial<NonNullable<Preferences['eventAlarms']>[string]>) => {
      const currentMap = preferences.eventAlarms || {};
      const currentConfig = currentMap[eventId] || {};
      void onUpdatePreferences({
        eventAlarms: {
          ...currentMap,
          [eventId]: {
            ...currentConfig,
            ...patch
          }
        }
      });
    },
    [preferences.eventAlarms, onUpdatePreferences]
  );
  const handleToggleSelectedEventAlarm = useCallback(
    (checked: boolean) => {
      if (!selectedEventMarker) {
        return;
      }

      const leadList = resolveEventLeadMinutes(
        preferences.eventAlarms?.[selectedEventMarker.id],
        preferences.alertLeadMinutes
      );
      updateEventAlarm(selectedEventMarker.id, {
        enabled: checked,
        beforeMinutes: leadList,
        leadMinutes: leadList[0] || preferences.alertLeadMinutes
      });
    },
    [preferences.alertLeadMinutes, preferences.eventAlarms, selectedEventMarker, updateEventAlarm]
  );

  const handleToggleSelectedEventLead = useCallback(
    (minutes: 5 | 10 | 15 | 30) => {
      if (!selectedEventMarker) {
        return;
      }

      const current = resolveEventLeadMinutes(
        preferences.eventAlarms?.[selectedEventMarker.id],
        preferences.alertLeadMinutes
      );
      const next = current.includes(minutes)
        ? current.filter((value) => value !== minutes)
        : [...current, minutes].sort((a, b) => a - b);
      const normalizedNext = next.length ? next : [preferences.alertLeadMinutes];

      updateEventAlarm(selectedEventMarker.id, {
        enabled: true,
        beforeMinutes: normalizedNext,
        leadMinutes: normalizedNext[0]
      });
    },
    [preferences.alertLeadMinutes, preferences.eventAlarms, selectedEventMarker, updateEventAlarm]
  );

  // Callbacks estaveis: evitam churn de props no SessionPanel em cada tick de 1s.
  const handleSelectedSessionToggleOpen = useCallback(
    (checked: boolean) => {
      if (!selectedSessionId) {
        return;
      }

      updateSessionAlarm(selectedSessionId, { open: checked });
    },
    [selectedSessionId, updateSessionAlarm]
  );

  const handleSelectedSessionToggleClose = useCallback(
    (checked: boolean) => {
      if (!selectedSessionId) {
        return;
      }

      updateSessionAlarm(selectedSessionId, { close: checked });
    },
    [selectedSessionId, updateSessionAlarm]
  );

  const handleSelectedSessionToggleFavorite = useCallback(
    (checked: boolean) => {
      if (!selectedSessionId) {
        return;
      }

      updateSessionAlarm(selectedSessionId, { favorite: checked });
    },
    [selectedSessionId, updateSessionAlarm]
  );

  const handleSelectedSessionToggleLead = useCallback(
    (minutes: 5 | 10 | 15 | 30) => {
      if (!selectedSessionId) {
        return;
      }

      toggleSessionLead(selectedSessionId, minutes);
    },
    [selectedSessionId, toggleSessionLead]
  );

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

    const next = overlapBands.find((item) => DateTime.fromISO(item.startIso, { setZone: true }).toMillis() >= now.toMillis());
    return next || overlapBands[overlapBands.length - 1];
  }, [overlapBands, now]);
  const overlapAlarmEventId = overlapBand ? `${overlapBand.id}-start-${overlapBand.startIso}` : null;
  const overlapAlarmOverrides = useTimelineUiStore((state) => state.overlapAlarmOverrides);
  const setOverlapAlarmOverride = useTimelineUiStore((state) => state.setOverlapAlarmOverride);
  const clearOverlapAlarmOverride = useTimelineUiStore((state) => state.clearOverlapAlarmOverride);
  const overlapAlarmEnabledFromPreferences = overlapAlarmEventId
    ? Boolean(preferences.eventAlarms?.[overlapAlarmEventId]?.enabled)
    : false;
  const overlapAlarmEnabledFromStore = overlapAlarmEventId ? overlapAlarmOverrides[overlapAlarmEventId] : undefined;
  const overlapBeforeMinutes = useMemo(
    () =>
      overlapAlarmEventId
        ? resolveEventLeadMinutes(preferences.eventAlarms?.[overlapAlarmEventId], preferences.alertLeadMinutes)
        : [preferences.alertLeadMinutes],
    [overlapAlarmEventId, preferences.alertLeadMinutes, preferences.eventAlarms]
  );
  const overlapAlarmEnabled = overlapAlarmEnabledFromStore ?? overlapAlarmEnabledFromPreferences;
  const handleToggleOverlapAlarm = useCallback(() => {
    if (!overlapAlarmEventId) {
      return;
    }

    const nextEnabled = !overlapAlarmEnabled;
    setOverlapAlarmOverride(overlapAlarmEventId, nextEnabled);
    updateEventAlarm(overlapAlarmEventId, {
      enabled: nextEnabled,
      beforeMinutes: overlapBeforeMinutes,
      leadMinutes: overlapBeforeMinutes[0] || preferences.alertLeadMinutes
    });
  }, [
    overlapAlarmEnabled,
    overlapAlarmEventId,
    preferences.alertLeadMinutes,
    overlapBeforeMinutes,
    setOverlapAlarmOverride,
    updateEventAlarm
  ]);

  useEffect(() => {
    if (!overlapAlarmEventId || overlapAlarmEnabledFromStore === undefined) {
      return;
    }

    // Quando backend persistir o mesmo valor, remove override otimista para manter store limpa.
    if (overlapAlarmEnabledFromStore === overlapAlarmEnabledFromPreferences) {
      clearOverlapAlarmOverride(overlapAlarmEventId);
    }
  }, [
    clearOverlapAlarmOverride,
    overlapAlarmEnabledFromPreferences,
    overlapAlarmEnabledFromStore,
    overlapAlarmEventId
  ]);

  const nextEventFromUpcoming = useMemo(
    () =>
      upcomingEvents.find((event) => DateTime.fromISO(event.timeIso, { setZone: true }).toMillis() >= now.toMillis()) || null,
    [upcomingEvents, now]
  );
  const isAnyTimelinePanelOpen = Boolean(sessionMenu || eventMenu || overlapPanel);
  panelOpenRef.current = isAnyTimelinePanelOpen;

  const captureTimelineSnapshot = useCallback(async () => {
    if (snapshotUploadInFlightRef.current) {
      return;
    }

    if (!captureCardRef.current || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    if (document.visibilityState === 'hidden' || panelOpenRef.current) {
      return;
    }

    const nowMs = Date.now();
    if (nowMs - lastSnapshotUploadAtRef.current < 45_000) {
      return;
    }

    snapshotUploadInFlightRef.current = true;
    try {
      const imageDataUrl = await captureStableTimelineSnapshot(captureCardRef.current, {
        maxPngBytes: 7_500_000
      });
      await uploadTimelineSnapshot({
        imageDataUrl,
        capturedAtIso: DateTime.now().setZone(baseTimezone).toISO() || DateTime.now().toISO() || undefined,
        timezone: baseTimezone,
        locale
      });
      lastSnapshotUploadAtRef.current = Date.now();
    } catch (error) {
      console.warn('[timeline] Falha ao capturar snapshot para e-mail:', error);
    } finally {
      snapshotUploadInFlightRef.current = false;
    }
  }, [baseTimezone, locale]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    void captureTimelineSnapshot();
    const intervalId = window.setInterval(() => {
      void captureTimelineSnapshot();
    }, 60_000);
    return () => window.clearInterval(intervalId);
  }, [captureTimelineSnapshot]);

  return (
    <div ref={rootRef}>
      <div ref={captureCardRef}>
      <Card className="relative z-20 overflow-visible border-border/70 bg-slate-950/70">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">{t(locale, 'timeline.title')}</CardTitle>
          {effectivePaused ? (
            <Badge variant="warning">{t(locale, 'timeline.paused')}</Badge>
          ) : currentOverlapBadge ? (
            <Badge variant="gold">{t(locale, 'timeline.overlapActive', { label: localizeOperationalText(currentOverlapBadge.label, locale) })}</Badge>
          ) : (
            <Badge variant="neutral">{t(locale, 'timeline.noOverlap')}</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="relative space-y-3">
        <p className="text-xs text-mutedForeground">{t(locale, 'timeline.windowLabel', { city: timelineTimezoneLabel })}</p>
        <div
          className="timeline-grab overflow-x-hidden rounded-lg border border-border/80 bg-gradient-to-r from-[#0a1835] via-[#0d2349] to-[#1b0e1b] p-2 pb-9"
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
          <div className="relative" style={{ minWidth: '100%', height: `${RAIL_HEIGHT}px` }}>
            <div className="absolute inset-x-0 top-0 z-40 flex items-center justify-between px-2 text-[10px] uppercase tracking-wider text-mutedForeground">
              <span>{leftTimelineLabel}</span>
              <span>{rightTimelineLabel}</span>
            </div>

            {TRACK_ORDER.map((track) => (
              <div
                key={track.id}
                className="absolute inset-x-0 border-y border-white/5 bg-white/[0.015]"
                style={{
                  top: `${getTrackTop(track.id)}px`,
                  height: `${TRACK_HEIGHT}px`
                }}
              >
                <span className="absolute left-2 top-1.5 z-30 rounded bg-black/45 px-1.5 py-0.5 text-[10px] text-slate-200">
                  {localizeSessionLabel(track.label, locale)}
                </span>
              </div>
            ))}

            {overlapBands.map((band) => (
              <button
                key={`${band.id}-${band.startIso}`}
                type="button"
                data-timeline-interactive="true"
                className="absolute z-[5] border border-gold/70 bg-gradient-to-r from-gold/25 to-warning/30 rounded-md"
                style={{
                  left: `${band.left}%`,
                  width: `${band.width}%`,
                  top: `${getTrackTop('gold')}px`,
                  height: `${TRACK_HEIGHT}px`,
                  opacity: getRunningFadeOpacity(band.left, band.width, fadeProfile),
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
            ))}

            {blocks.map((block) => {
              const alarmConfig = preferences.sessionAlarms?.[block.session.id];
              const fadeMaskImage = getRunningFadeMask(block.leftPercent, block.widthPercent, fadeProfile);

              return (
                <SessionBlock
                  key={block.key}
                  label={localizeSessionLabel(block.session.label, locale)}
                  startLabel={block.startLabel}
                  endLabel={block.endLabel}
                  color={block.session.color}
                  leftPercent={block.leftPercent}
                  widthPercent={block.widthPercent}
                  trackTop={getTrackTop(block.session.id)}
                  trackHeight={TRACK_HEIGHT}
                  opacity={getRunningFadeOpacity(block.leftPercent, block.widthPercent, fadeProfile)}
                  fadeMaskImage={fadeMaskImage}
                  active={block.active}
                  alarmEnabled={getSessionAlarmEnabled(alarmConfig)}
                  favorite={Boolean(alarmConfig?.favorite)}
                  onMouseEnter={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    setHoveredKey(block.key);
                    setHoveredTooltipPosition({
                      x: rect.left + rect.width / 2,
                      y: rect.top - 6
                    });
                  }}
                  onMouseLeave={() => {
                    setHoveredKey((current) => (current === block.key ? null : current));
                    setHoveredTooltipPosition(null);
                  }}
                  onClick={(event) => {
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
                  }}
                />
              );
            })}

            {markers.map((marker) => (
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
            ))}

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
                  <p>{t(locale, 'timeline.market', { status: effectiveMarketState.isOpen ? t(locale, 'timeline.marketOpen') : t(locale, 'timeline.marketClosed') })}</p>
                </div>
              }
            />

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

        <div className="flex flex-wrap items-center gap-2">
          {overlapBadgeItems.map((item) => {
            return (
              <Badge key={item.id} variant={item.active ? 'gold' : 'neutral'}>
                {item.label}: {item.rangeLabel}
              </Badge>
            );
          })}

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
        openEnabled={Boolean(selectedSessionAlarmConfig?.open)}
        closeEnabled={Boolean(selectedSessionAlarmConfig?.close)}
        favoriteEnabled={Boolean(selectedSessionAlarmConfig?.favorite)}
        beforeMinutes={selectedSessionBeforeMinutes}
        onToggleOpen={handleSelectedSessionToggleOpen}
        onToggleClose={handleSelectedSessionToggleClose}
        onToggleFavorite={handleSelectedSessionToggleFavorite}
        onToggleLead={handleSelectedSessionToggleLead}
      />

      <EventMarkerPopup
        locale={locale}
        open={Boolean(selectedEventMarker && eventMenu)}
        anchorX={eventMenu?.anchorX || 0}
        anchorY={eventMenu?.anchorY || 0}
        label={selectedEventMarker?.label || ''}
        timeIso={selectedEventMarker?.timeIso || nowIso}
        displayTimezone={baseTimezone}
        alarmEnabled={Boolean(selectedEventMarker && preferences.eventAlarms?.[selectedEventMarker.id]?.enabled)}
        beforeMinutes={selectedEventBeforeMinutes}
        onToggleAlarm={handleToggleSelectedEventAlarm}
        onToggleLead={handleToggleSelectedEventLead}
      />

      <GoldenWindowPanel
        locale={locale}
        open={Boolean(overlapPanel && overlapBand)}
        anchorX={overlapPanel?.anchorX || 0}
        anchorY={overlapPanel?.anchorY || 0}
        startIso={overlapBand?.startIso || nowIso}
        endIso={overlapBand?.endIso || nowIso}
        displayTimezone={baseTimezone}
        alarmEnabled={overlapAlarmEnabled}
        onToggleAlarm={handleToggleOverlapAlarm}
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
                alarmEnabled={getSessionAlarmEnabled(preferences.sessionAlarms?.[hoveredBlock.session.id])}
                timezoneLabel={timelineTimezoneLabel}
              />
            </div>,
            tooltipPortalTarget
          )
        : null}
    </div>
  );
});
