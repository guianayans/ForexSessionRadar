const { DateTime } = require('luxon');
const { BASE_TIMEZONE, CLOCKS } = require('../types/constants');
const { getRadarForContext, enrichRadarWithActiveExchanges } = require('./radarService');
const {
  getCurrentMarketState,
  getNextSession,
  getSessionOverlaps,
  getSessionSchedules
} = require('./marketTimeService');

const CURRENT_SESSION_PRIORITY = ['new_york', 'london', 'tokyo', 'sydney', 'hong_kong', 'shanghai', 'brazil'];
const GOLDEN_OVERLAP_IDS = new Set(['london_newyork']);

function sessionPriorityIndex(sessionId) {
  const index = CURRENT_SESSION_PRIORITY.indexOf(sessionId);
  return index === -1 ? CURRENT_SESSION_PRIORITY.length : index;
}

function resolvePrimaryOverlap(overlaps) {
  const golden = overlaps.find((overlap) => overlap.id === 'london_newyork' && overlap.isActive) || null;
  if (golden) {
    return golden;
  }

  return overlaps.find((overlap) => overlap.id === 'london_newyork') || overlaps[0] || null;
}

function isValidTimezone(timezone) {
  if (!timezone || typeof timezone !== 'string') {
    return false;
  }

  return DateTime.now().setZone(timezone).isValid;
}

function resolveEffectiveTimezone(storePayload, runtimeTimezone) {
  const preferencesTimezone = storePayload?.preferences?.baseTimezone;
  const lockBaseTimezone = Boolean(storePayload?.preferences?.lockBaseTimezone);

  if (lockBaseTimezone && isValidTimezone(preferencesTimezone)) {
    return preferencesTimezone;
  }

  if (isValidTimezone(runtimeTimezone)) {
    return runtimeTimezone;
  }

  if (isValidTimezone(preferencesTimezone)) {
    return preferencesTimezone;
  }

  return BASE_TIMEZONE;
}

function formatClock(now, timezone) {
  return now.setZone(timezone).toFormat('HH:mm:ss');
}

function serializeSessionWindows(candidates = []) {
  return candidates.map((window, index) => ({
    id: `${index}-${window.start.toISO()}`,
    startIso: window.start.toISO(),
    endIso: window.end.toISO(),
    startLabel: window.start.toFormat('dd/LL HH:mm'),
    endLabel: window.end.toFormat('dd/LL HH:mm')
  }));
}

function stripInternalSessionFields(session) {
  const { _candidates, _activeWindow, _nextWindow, _lastWindow, ...publicSession } = session;
  return {
    ...publicSession,
    windows: serializeSessionWindows(_candidates)
  };
}

function getCurrentSessionPayload(marketState, sessions, activeOverlap, now = DateTime.now()) {
  if (!marketState.isOpen) {
    const radar = getRadarForContext('closed');
    return {
      session: {
        id: 'closed',
        label: 'Mercado Fechado',
        volatility: 'Baixa',
        startIso: null,
        endIso: null,
        recommendedAssets: []
      },
      radar,
      radarContext: 'closed'
    };
  }

  if (activeOverlap?.isActive && GOLDEN_OVERLAP_IDS.has(activeOverlap.id)) {
    const radar = getRadarForContext('gold');
    return {
      session: {
        id: 'gold',
        label: 'Janela de Ouro',
        volatility: 'Muito Alta',
        startIso: activeOverlap.startIso,
        endIso: activeOverlap.endIso,
        recommendedAssets: radar.recommended
      },
      radar,
      radarContext: 'gold'
    };
  }

  const active = sessions
    .filter((session) => session.isActive && session.startIso)
    .sort((a, b) => {
      const priorityDiff = sessionPriorityIndex(a.id) - sessionPriorityIndex(b.id);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return DateTime.fromISO(b.startIso).toMillis() - DateTime.fromISO(a.startIso).toMillis();
    })[0];

  if (!active) {
    const radar = getRadarForContext('closed');
    return {
      session: {
        id: 'closed',
        label: 'Transicao de Mercado',
        volatility: 'Moderada',
        startIso: null,
        endIso: null,
        recommendedAssets: []
      },
      radar,
      radarContext: 'closed'
    };
  }

  const radar = getRadarForContext(active.id, now);
  return {
    session: {
      id: active.id,
      label: active.label,
      volatility: active.volatility,
      startIso: active.startIso,
      endIso: active.endIso,
      recommendedAssets: radar.recommended
    },
    radar,
    radarContext: active.id
  };
}

function getLastSessionPayload(now, schedules, marketState) {
  if (!marketState.isOpen && marketState.lastGlobalCloseIso) {
    return {
      id: marketState.weekendWindow?.lastSessionId || 'new_york',
      label: marketState.weekendWindow?.lastSessionLabel || 'Sessao Americana',
      endIso: marketState.lastGlobalCloseIso,
      endLabel: DateTime.fromISO(marketState.lastGlobalCloseIso).toFormat('HH:mm'),
      elapsedSinceEndSeconds: Math.max(
        0,
        Math.floor((now.toMillis() - DateTime.fromISO(marketState.lastGlobalCloseIso).toMillis()) / 1000)
      )
    };
  }

  const last = schedules
    .filter((session) => session._lastWindow)
    .sort((a, b) => b._lastWindow.end.toMillis() - a._lastWindow.end.toMillis())[0];

  if (!last || !last._lastWindow) {
    return null;
  }

  return {
    id: last.id,
    label: last.label,
    endIso: last._lastWindow.end.toISO(),
    endLabel: last._lastWindow.end.toFormat('HH:mm'),
    elapsedSinceEndSeconds: Math.max(0, Math.floor((now.toMillis() - last._lastWindow.end.toMillis()) / 1000))
  };
}

function buildSnapshot(referenceNow = DateTime.now(), timezone = BASE_TIMEZONE) {
  const now = referenceNow.setZone(timezone);
  const marketState = getCurrentMarketState(now, timezone);
  const sessionSchedules = getSessionSchedules(now, timezone);
  const overlaps = getSessionOverlaps(now, timezone);

  const timelineSessions = sessionSchedules.map((session) => {
    const publicSession = stripInternalSessionFields(session);
    return marketState.isOpen ? publicSession : { ...publicSession, isActive: false };
  });

  const goldenOverlap = overlaps.find((overlap) => overlap.id === 'london_newyork' && overlap.isActive) || null;
  const primaryOverlap = resolvePrimaryOverlap(overlaps);

  const { session: currentSession, radar, radarContext } = getCurrentSessionPayload(
    marketState,
    timelineSessions,
    goldenOverlap,
    now
  );

  const enrichedRadar = enrichRadarWithActiveExchanges(radar, timelineSessions, now);

  const nextSession = getNextSession(now, timezone);
  const lastSession = getLastSessionPayload(now, sessionSchedules, marketState);

  const clocks = CLOCKS.map((clock) => ({
    ...clock,
    time: formatClock(now, clock.timezone)
  }));

  return {
    nowIso: now.toISO(),
    baseTimezone: timezone,
    marketState: {
      ...marketState,
      nextSessionLabel: nextSession?.label || 'Sem proxima sessao mapeada',
      nextSessionIso: nextSession?.startIso || null
    },
    clocks,
    timeline: {
      sessions: timelineSessions,
      overlap: primaryOverlap,
      overlaps,
      isPaused: !marketState.isOpen
    },
    currentSession,
    lastSession,
    nextSession,
    radar: {
      ...enrichedRadar,
      context: radarContext
    }
  };
}

function getUpcomingEvents(snapshot) {
  const now = DateTime.fromISO(snapshot.nowIso);
  const marketReopenAt =
    !snapshot.marketState.isOpen && snapshot.marketState.nextGlobalOpenIso
      ? DateTime.fromISO(snapshot.marketState.nextGlobalOpenIso)
      : null;
  const events = [];

  if (snapshot.marketState.nextGlobalOpenIso) {
    const nextOpen = DateTime.fromISO(snapshot.marketState.nextGlobalOpenIso);
    if (nextOpen > now) {
      events.push({
        id: `weekly-open-${snapshot.marketState.nextGlobalOpenIso}`,
        type: 'weekly_open',
        title: 'Reabertura semanal do mercado',
        timeIso: snapshot.marketState.nextGlobalOpenIso
      });
    }
  }

  if (snapshot.marketState.isOpen && snapshot.marketState.nextGlobalCloseIso) {
    const nextClose = DateTime.fromISO(snapshot.marketState.nextGlobalCloseIso);
    if (nextClose > now) {
      events.push({
        id: `weekly-close-${snapshot.marketState.nextGlobalCloseIso}`,
        type: 'weekly_close',
        title: 'Fechamento semanal do mercado',
        timeIso: snapshot.marketState.nextGlobalCloseIso
      });
    }
  }

  snapshot.timeline.sessions.forEach((session) => {
    if (!session.startIso || !session.endIso) {
      return;
    }

    const sessionStart = DateTime.fromISO(session.startIso);
    const sessionEnd = DateTime.fromISO(session.endIso);

    if (sessionStart > now && (!marketReopenAt || sessionStart >= marketReopenAt)) {
      events.push({
        id: `${session.id}-open-${session.startIso}`,
        sessionId: session.id,
        type: 'session_open',
        title: `Abertura ${session.label}`,
        timeIso: session.startIso
      });
    }

    if (sessionEnd > now && (!marketReopenAt || sessionEnd >= marketReopenAt)) {
      events.push({
        id: `${session.id}-close-${session.endIso}`,
        sessionId: session.id,
        type: 'session_close',
        title: `Fechamento ${session.label}`,
        timeIso: session.endIso
      });
    }
  });

  snapshot.timeline.overlaps.forEach((overlap) => {
    const overlapStart = DateTime.fromISO(overlap.startIso);
    const overlapEnd = DateTime.fromISO(overlap.endIso);

    if (overlapStart > now && (!marketReopenAt || overlapStart >= marketReopenAt)) {
      events.push({
        id: `${overlap.id}-start-${overlap.startIso}`,
        type: 'overlap_start',
        title: `Inicio da Sobreposicao ${overlap.label}`,
        timeIso: overlap.startIso
      });
    }

    if (overlapEnd > now && (!marketReopenAt || overlapEnd >= marketReopenAt)) {
      events.push({
        id: `${overlap.id}-end-${overlap.endIso}`,
        type: 'ideal_window_end',
        title: `Fim da Sobreposicao ${overlap.label}`,
        timeIso: overlap.endIso
      });
    }
  });

  return events
    .sort((a, b) => DateTime.fromISO(a.timeIso).toMillis() - DateTime.fromISO(b.timeIso).toMillis())
    .map((event) => {
      const eventTime = DateTime.fromISO(event.timeIso);
      return {
        ...event,
        countdownSeconds: Math.max(0, Math.floor((eventTime.toMillis() - now.toMillis()) / 1000))
      };
    });
}

function computeDashboard(storePayload, referenceNow = DateTime.now(), runtimeTimezone = BASE_TIMEZONE) {
  const timezone = resolveEffectiveTimezone(storePayload, runtimeTimezone);
  const snapshot = buildSnapshot(referenceNow, timezone);
  const upcomingEvents = getUpcomingEvents(snapshot);

  return {
    ...snapshot,
    upcomingEvents,
    preferences: storePayload.preferences,
    planner: storePayload.planner
  };
}

module.exports = {
  buildSnapshot,
  getUpcomingEvents,
  computeDashboard
};
