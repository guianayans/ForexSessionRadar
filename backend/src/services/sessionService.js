const { DateTime } = require('luxon');
const { BASE_TIMEZONE, CLOCKS } = require('../types/constants');
const { getRadarForContext } = require('./radarService');
const {
  getCurrentMarketState,
  getNextSession,
  getSessionOverlaps,
  getSessionSchedules
} = require('./marketTimeService');

const ALERT_LEAD_CHOICES = new Set([5, 10, 15, 30]);

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

function getCurrentSessionPayload(marketState, sessions, primaryOverlap) {
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

  if (primaryOverlap?.isActive) {
    const radar = getRadarForContext('gold');
    return {
      session: {
        id: 'gold',
        label: 'Janela de Ouro',
        volatility: 'Muito Alta',
        startIso: primaryOverlap.startIso,
        endIso: primaryOverlap.endIso,
        recommendedAssets: radar.recommended
      },
      radar,
      radarContext: 'gold'
    };
  }

  const active = sessions
    .filter((session) => session.isActive && session.startIso)
    .sort((a, b) => DateTime.fromISO(b.startIso).toMillis() - DateTime.fromISO(a.startIso).toMillis())[0];

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

  const radar = getRadarForContext(active.id);
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

  const primaryOverlap = overlaps.find((overlap) => overlap.id === 'london_newyork') || overlaps[0] || null;

  const { session: currentSession, radar, radarContext } = getCurrentSessionPayload(
    marketState,
    timelineSessions,
    primaryOverlap
  );

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
      ...radar,
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

function normalizeBeforeMinutes(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(values.filter((value) => ALERT_LEAD_CHOICES.has(value)))].sort((a, b) => a - b);
}

function normalizeEventLeadMinutes(eventAlarm, fallbackLeadMinutes) {
  if (!eventAlarm) {
    return [fallbackLeadMinutes];
  }

  const fromArray = normalizeBeforeMinutes(eventAlarm.beforeMinutes);
  if (fromArray.length) {
    return fromArray;
  }

  if (ALERT_LEAD_CHOICES.has(eventAlarm.leadMinutes)) {
    return [eventAlarm.leadMinutes];
  }

  return [fallbackLeadMinutes];
}

function resolveEventAlarmConfig(event, preferences) {
  const eventAlarms = preferences?.eventAlarms || {};
  if (!event || !event.id) {
    return null;
  }

  if (eventAlarms[event.id]) {
    return eventAlarms[event.id];
  }

  const eventTime = event.timeIso;
  if (!eventTime) {
    return null;
  }

  const suffixByType = {
    session_open: `-open-${eventTime}`,
    session_close: `-close-${eventTime}`,
    overlap_start: `-start-${eventTime}`,
    ideal_window_end: `-end-${eventTime}`,
    weekly_open: `weekly-open-${eventTime}`,
    weekly_close: `weekly-close-${eventTime}`
  };

  const suffix = suffixByType[event.type];
  if (!suffix) {
    return null;
  }

  const matches = Object.entries(eventAlarms).filter(([alarmId]) =>
    event.type === 'weekly_open' || event.type === 'weekly_close' ? alarmId === suffix : alarmId.endsWith(suffix)
  );

  if (!matches.length) {
    return null;
  }

  // Preferir correspondencia semantica quando houver multiplos IDs "decorados" no frontend.
  const semanticPrefix = event.id.split('-')[0];
  const preferred = matches.find(([alarmId]) => alarmId.includes(semanticPrefix));
  if (preferred) {
    return preferred[1];
  }

  return matches[0][1];
}

function buildEventLeadMinutes(event, preferences) {
  const leads = new Set();

  if (event.type === 'session_open' && preferences.alertOnSessionOpen) {
    leads.add(preferences.alertLeadMinutes);
  }

  if (event.type === 'overlap_start' && preferences.alertOnOverlapStart) {
    leads.add(preferences.alertLeadMinutes);
  }

  if (event.type === 'ideal_window_end' && preferences.alertOnIdealWindowEnd) {
    leads.add(preferences.alertLeadMinutes);
  }

  if (event.sessionId) {
    const sessionAlarm = preferences.sessionAlarms?.[event.sessionId] || {};

    if (event.type === 'session_open') {
      if (sessionAlarm.open) {
        leads.add(0);
      }
      normalizeBeforeMinutes(sessionAlarm.beforeMinutes).forEach((minutes) => {
        leads.add(minutes);
      });
    }

    if (event.type === 'session_close' && sessionAlarm.close) {
      leads.add(0);
    }
  }

  const eventAlarm = resolveEventAlarmConfig(event, preferences);
  if (eventAlarm?.enabled) {
    normalizeEventLeadMinutes(eventAlarm, preferences.alertLeadMinutes).forEach((minutes) => {
      leads.add(minutes);
    });
  }

  return [...leads];
}

function getNextAlert(upcomingEvents, preferences, nowIso) {
  const triggerCandidates = getAlertTriggerCandidates(upcomingEvents, preferences, nowIso)
    .filter((event) => event.triggerInSeconds >= 0)
    .sort((a, b) => a.triggerInSeconds - b.triggerInSeconds);

  if (!triggerCandidates.length) {
    return null;
  }

  const next = triggerCandidates[0];
  return {
    id: next.triggerId,
    title: next.title,
    type: next.type,
    leadMinutes: next.leadMinutes,
    eventTimeIso: next.timeIso,
    triggerTimeIso: next.triggerTimeIso,
    countdownSeconds: next.triggerInSeconds
  };
}

function getAlertTriggerCandidates(upcomingEvents, preferences, nowIso) {
  const now = DateTime.fromISO(nowIso);

  return upcomingEvents.flatMap((event) => {
    const eventTime = DateTime.fromISO(event.timeIso);
    return buildEventLeadMinutes(event, preferences).map((leadMinutes) => {
      const triggerTime = eventTime.minus({ minutes: leadMinutes });
      return {
        ...event,
        leadMinutes,
        triggerTimeIso: triggerTime.toISO(),
        triggerInSeconds: Math.floor((triggerTime.toMillis() - now.toMillis()) / 1000),
        triggerId: `${event.id}:lead-${leadMinutes}`
      };
    });
  });
}

function computeDashboard(storePayload, referenceNow = DateTime.now(), runtimeTimezone = BASE_TIMEZONE) {
  const timezone = resolveEffectiveTimezone(storePayload, runtimeTimezone);
  const snapshot = buildSnapshot(referenceNow, timezone);
  const upcomingEvents = getUpcomingEvents(snapshot);
  const nextAlert = getNextAlert(upcomingEvents, storePayload.preferences, snapshot.nowIso);

  return {
    ...snapshot,
    upcomingEvents,
    nextAlert,
    preferences: storePayload.preferences,
    planner: storePayload.planner
  };
}

module.exports = {
  buildSnapshot,
  getUpcomingEvents,
  getAlertTriggerCandidates,
  getNextAlert,
  computeDashboard
};
