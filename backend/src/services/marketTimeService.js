const { DateTime } = require('luxon');
const { BASE_TIMEZONE, FOREX_UTC_CONFIG, SESSION_DEFINITIONS } = require('../types/constants');

const UTC_ZONE = 'UTC';
const OVERLAP_DEFINITIONS = [
  { id: 'london_newyork', label: 'Londres + Nova York', a: 'london', b: 'new_york' },
  { id: 'tokyo_london', label: 'Toquio + Londres', a: 'tokyo', b: 'london' },
  { id: 'sydney_tokyo', label: 'Sydney + Toquio', a: 'sydney', b: 'tokyo' }
];
const PRIMARY_SESSION_IDS = new Set(['tokyo', 'london', 'new_york']);
const CLOSE_SESSION_PRIORITY = ['new_york', 'london', 'tokyo', 'sydney'];
const OPEN_SESSION_PRIORITY = ['sydney', 'tokyo', 'london', 'new_york'];

function parseClock(clock) {
  const [hour, minute] = clock.split(':').map((value) => Number(value));
  return { hour, minute };
}

function formatOffset(offsetMinutes) {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absolute = Math.abs(offsetMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  return `UTC${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function resolveDateTime(datetimeLocal = undefined, timezone = BASE_TIMEZONE) {
  if (!datetimeLocal) {
    return DateTime.now().setZone(timezone);
  }

  if (DateTime.isDateTime(datetimeLocal)) {
    return datetimeLocal.setZone(timezone);
  }

  if (typeof datetimeLocal === 'string') {
    const hasExplicitZone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(datetimeLocal);

    if (hasExplicitZone) {
      const parsedWithZone = DateTime.fromISO(datetimeLocal, { setZone: true });
      if (parsedWithZone.isValid) {
        return parsedWithZone.setZone(timezone);
      }
    }

    const parsedFallback = DateTime.fromISO(datetimeLocal, { zone: timezone });
    if (parsedFallback.isValid) {
      return parsedFallback;
    }
  }

  throw new Error(`Data invalida para conversao: ${String(datetimeLocal)}`);
}

function toUtc(datetimeLocal = undefined, timezone = BASE_TIMEZONE) {
  return resolveDateTime(datetimeLocal, timezone).setZone(UTC_ZONE);
}

function getDstInfo(timezone, date = undefined, referenceTimezone = BASE_TIMEZONE) {
  const zoned = resolveDateTime(date, referenceTimezone).setZone(timezone);
  return {
    timezone,
    isDstNow: zoned.isInDST,
    offsetMinutes: zoned.offset,
    currentOffset: formatOffset(zoned.offset)
  };
}

function getUtcWeekdayBoundary(referenceUtc, weekday, clock, mode) {
  const { hour, minute } = parseClock(clock);
  let candidate = referenceUtc.startOf('week').plus({ days: weekday - 1 }).set({
    hour,
    minute,
    second: 0,
    millisecond: 0
  });

  if (mode === 'next' && referenceUtc >= candidate) {
    candidate = candidate.plus({ weeks: 1 });
  }

  if (mode === 'previous' && referenceUtc < candidate) {
    candidate = candidate.minus({ weeks: 1 });
  }

  return candidate;
}

function getNextGlobalOpenUtc(referenceUtc) {
  return getUtcWeekdayBoundary(referenceUtc, FOREX_UTC_CONFIG.global.open.weekday, FOREX_UTC_CONFIG.global.open.time, 'next');
}

function getNextGlobalCloseUtc(referenceUtc) {
  return getUtcWeekdayBoundary(
    referenceUtc,
    FOREX_UTC_CONFIG.global.close.weekday,
    FOREX_UTC_CONFIG.global.close.time,
    'next'
  );
}

function getPreviousGlobalCloseUtc(referenceUtc) {
  return getUtcWeekdayBoundary(
    referenceUtc,
    FOREX_UTC_CONFIG.global.close.weekday,
    FOREX_UTC_CONFIG.global.close.time,
    'previous'
  );
}

function isForexOpenUtc(utcInstant) {
  const weekday = utcInstant.weekday; // 1=Mon ... 7=Sun
  const minuteOfDay = utcInstant.hour * 60 + utcInstant.minute + utcInstant.second / 60;
  const openMinuteSunday = parseClock(FOREX_UTC_CONFIG.global.open.time).hour * 60 +
    parseClock(FOREX_UTC_CONFIG.global.open.time).minute;
  const closeMinuteFriday = parseClock(FOREX_UTC_CONFIG.global.close.time).hour * 60 +
    parseClock(FOREX_UTC_CONFIG.global.close.time).minute;

  if (weekday >= 1 && weekday <= 4) {
    return true;
  }

  if (weekday === 5) {
    return minuteOfDay < closeMinuteFriday;
  }

  if (weekday === 6) {
    return false;
  }

  return minuteOfDay >= openMinuteSunday;
}

function isForexOpen(datetimeLocal, timezone = BASE_TIMEZONE) {
  return isForexOpenUtc(toUtc(datetimeLocal, timezone));
}

function normalizeSessionName(sessionName) {
  return String(sessionName || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function resolveSessionId(sessionName) {
  const normalized = normalizeSessionName(sessionName);
  const aliases = {
    sydney: 'sydney',
    sessaodesydney: 'sydney',
    tokyo: 'tokyo',
    toquio: 'tokyo',
    sessaoasiatica: 'tokyo',
    asian: 'tokyo',
    london: 'london',
    londres: 'london',
    sessaoeuropeia: 'london',
    newyork: 'new_york',
    novayork: 'new_york',
    sessaoamericana: 'new_york',
    ny: 'new_york'
  };

  return aliases[normalized] || null;
}

function isSessionOpen(sessionName, datetimeLocal, timezone = BASE_TIMEZONE) {
  const sessionId = resolveSessionId(sessionName);
  if (!sessionId) {
    return false;
  }

  const config = FOREX_UTC_CONFIG.sessions[sessionId];
  if (!config) {
    return false;
  }

  const instantUtc = toUtc(datetimeLocal, timezone);
  if (!isForexOpenUtc(instantUtc)) {
    return false;
  }

  const { hour: openHour, minute: openMinuteUtc } = parseClock(config.open);
  const { hour: closeHour, minute: closeMinuteUtc } = parseClock(config.close);
  const minuteOfDay = instantUtc.hour * 60 + instantUtc.minute + instantUtc.second / 60;
  const openMinute = openHour * 60 + openMinuteUtc;
  const closeMinute = closeHour * 60 + closeMinuteUtc;

  if (closeMinute > openMinute) {
    return minuteOfDay >= openMinute && minuteOfDay < closeMinute;
  }

  return minuteOfDay >= openMinute || minuteOfDay < closeMinute;
}

function getSessionPriority(sessionId, priorityList) {
  const index = priorityList.indexOf(sessionId);
  return index === -1 ? priorityList.length + 1 : index;
}

function pickWindowContainingInstant(windows, instant, priorityList) {
  const containing = windows.filter((window) => window.start <= instant && instant < window.end);
  if (!containing.length) {
    return null;
  }

  return containing.sort((a, b) => {
    const priorityDiff =
      getSessionPriority(a.sessionId, priorityList) - getSessionPriority(b.sessionId, priorityList);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return a.end.toMillis() - b.end.toMillis();
  })[0];
}

function sliceWindowToTradableSegments(startUtc, endUtc) {
  if (endUtc <= startUtc) {
    return [];
  }

  if (isForexOpenUtc(startUtc)) {
    const nextCloseUtc = getNextGlobalCloseUtc(startUtc);
    return [{ startUtc, endUtc: nextCloseUtc < endUtc ? nextCloseUtc : endUtc }];
  }

  const nextOpenUtc = getNextGlobalOpenUtc(startUtc);
  if (nextOpenUtc >= endUtc) {
    return [];
  }

  const nextCloseAfterOpenUtc = getNextGlobalCloseUtc(nextOpenUtc);
  return [{ startUtc: nextOpenUtc, endUtc: nextCloseAfterOpenUtc < endUtc ? nextCloseAfterOpenUtc : endUtc }];
}

function buildSessionUtcCandidates(definition, anchorUtc, options = {}) {
  const config = FOREX_UTC_CONFIG.sessions[definition.id];
  if (!config) {
    return [];
  }

  const { hour: openHour, minute: openMinute } = parseClock(config.open);
  const { hour: closeHour, minute: closeMinute } = parseClock(config.close);
  const offsetStart = options.offsetStart ?? -4;
  const offsetEnd = options.offsetEnd ?? 6;
  const candidates = [];

  for (let offset = offsetStart; offset <= offsetEnd; offset += 1) {
    const dayUtc = anchorUtc.startOf('day').plus({ days: offset });
    const startUtc = dayUtc.set({ hour: openHour, minute: openMinute, second: 0, millisecond: 0 });
    let endUtc = dayUtc.set({ hour: closeHour, minute: closeMinute, second: 0, millisecond: 0 });

    if (endUtc <= startUtc) {
      endUtc = endUtc.plus({ days: 1 });
    }

    sliceWindowToTradableSegments(startUtc, endUtc).forEach((segment) => {
      candidates.push(segment);
    });
  }

  return candidates.sort((a, b) => a.startUtc.toMillis() - b.startUtc.toMillis());
}

function buildSessionCandidates(definition, now, options = {}, timezone = BASE_TIMEZONE) {
  const displayNow = resolveDateTime(now, timezone);
  const displayZone = displayNow.zoneName;
  const candidatesUtc = buildSessionUtcCandidates(definition, displayNow.setZone(UTC_ZONE), options);

  return candidatesUtc.map((candidate) => {
    const start = candidate.startUtc.setZone(displayZone);
    const end = candidate.endUtc.setZone(displayZone);
    const startLocal = candidate.startUtc.setZone(definition.timezone);

    return {
      start,
      end,
      startUtc: candidate.startUtc,
      endUtc: candidate.endUtc,
      startLocal,
      endLocal: candidate.endUtc.setZone(definition.timezone),
      dstActive: startLocal.isInDST,
      offsetMinutes: startLocal.offset,
      currentOffset: formatOffset(startLocal.offset)
    };
  });
}

function collectSessionWindows(anchorNow, options = {}, timezone = BASE_TIMEZONE) {
  const base = resolveDateTime(anchorNow, timezone);

  return SESSION_DEFINITIONS.flatMap((definition) =>
    buildSessionCandidates(definition, base, {
      offsetStart: options.offsetStart ?? -4,
      offsetEnd: options.offsetEnd ?? 6
    }, timezone).map((window) => ({
      sessionId: definition.id,
      sessionLabel: definition.label,
      start: window.start,
      end: window.end
    }))
  );
}

function deriveWeekendBoundaries(globalCloseUtc, globalOpenUtc, timezone = BASE_TIMEZONE) {
  const closeApprox = globalCloseUtc.setZone(timezone);
  const openApprox = globalOpenUtc.setZone(timezone);
  const windows = collectSessionWindows(closeApprox, { offsetStart: -4, offsetEnd: 5 }, timezone);

  const lastSession =
    pickWindowContainingInstant(windows, closeApprox.minus({ seconds: 1 }), CLOSE_SESSION_PRIORITY) ||
    [...windows]
      .filter((window) => window.end <= closeApprox)
      .sort((a, b) => b.end.toMillis() - a.end.toMillis())[0] ||
    null;

  const firstSession =
    pickWindowContainingInstant(windows, openApprox.plus({ seconds: 1 }), OPEN_SESSION_PRIORITY) ||
    windows
      .filter((window) => window.start >= openApprox)
      .sort((a, b) => a.start.toMillis() - b.start.toMillis())[0] ||
    null;

  return {
    start: closeApprox,
    end: openApprox,
    lastSession,
    firstSession,
    closeApprox,
    openApprox
  };
}

function getWeekendWindow(referenceNow = undefined, timezone = BASE_TIMEZONE) {
  const now = resolveDateTime(referenceNow, timezone);
  const nowUtc = now.setZone(UTC_ZONE);

  const previousCloseUtc = getPreviousGlobalCloseUtc(nowUtc);
  const nextOpenUtc = getNextGlobalOpenUtc(nowUtc);
  const upcomingCloseUtc = getNextGlobalCloseUtc(nowUtc);
  const upcomingOpenUtc = getNextGlobalOpenUtc(upcomingCloseUtc.plus({ seconds: 1 }));
  const previousPreviousCloseUtc = getPreviousGlobalCloseUtc(previousCloseUtc.minus({ seconds: 1 }));
  const previousOpenUtc = getNextGlobalOpenUtc(previousPreviousCloseUtc.plus({ seconds: 1 }));

  const marketOpenNow = isForexOpenUtc(nowUtc);
  const activeCandidate = marketOpenNow ? null : deriveWeekendBoundaries(previousCloseUtc, nextOpenUtc, timezone);
  const previousWeekend = deriveWeekendBoundaries(previousPreviousCloseUtc, previousOpenUtc, timezone);
  const upcomingWeekend = deriveWeekendBoundaries(upcomingCloseUtc, upcomingOpenUtc, timezone);
  const activeWeekend =
    activeCandidate && now >= activeCandidate.start && now < activeCandidate.end ? activeCandidate : null;

  return {
    now,
    isWithinWeekend: Boolean(activeWeekend),
    active: activeWeekend,
    previous: previousWeekend,
    upcoming: upcomingWeekend
  };
}

function getLastSessionOfWeek(now = undefined, timezone = BASE_TIMEZONE) {
  const weekend = getWeekendWindow(now, timezone);
  const target = weekend.isWithinWeekend ? weekend.active : weekend.upcoming;
  return target?.lastSession || null;
}

function getFirstSessionOfNextWeek(now = undefined, timezone = BASE_TIMEZONE) {
  const weekend = getWeekendWindow(now, timezone);
  const target = weekend.isWithinWeekend ? weekend.active : weekend.upcoming;
  return target?.firstSession || null;
}

function isMarketOpen(now = undefined, timezone = BASE_TIMEZONE) {
  return isForexOpen(now, timezone);
}

function getCurrentMarketState(referenceNow = undefined, timezone = BASE_TIMEZONE) {
  const now = resolveDateTime(referenceNow, timezone);
  const weekend = getWeekendWindow(now, timezone);
  const activeWeekend = weekend.active;
  const upcomingWeekend = weekend.upcoming;
  const previousWeekend = weekend.previous;

  if (!weekend.isWithinWeekend) {
    const nextGlobalClose = upcomingWeekend.start;
    const nextGlobalOpen = upcomingWeekend.end;
    const lastGlobalClose = previousWeekend.start;
    const secondsUntilClose = Math.max(0, Math.floor((nextGlobalClose.toMillis() - now.toMillis()) / 1000));
    const weekClosing = secondsUntilClose <= 3 * 60 * 60;

    return {
      isOpen: true,
      mode: weekClosing ? 'week_closing' : 'open',
      statusLabel: weekClosing ? 'Encerramento da Semana' : 'Mercado Aberto',
      contextLabel: weekClosing
        ? 'Ultima sessao da semana em andamento'
        : 'Mercado em funcionamento normal',
      nextGlobalOpenIso: nextGlobalOpen.toISO(),
      nextGlobalCloseIso: nextGlobalClose.toISO(),
      lastGlobalCloseIso: lastGlobalClose.toISO(),
      countdownToOpenSeconds: 0,
      countdownToCloseSeconds: secondsUntilClose,
      weekendWindow: {
        weekendStartIso: upcomingWeekend.start.toISO(),
        weekendEndIso: upcomingWeekend.end.toISO(),
        lastSessionId: upcomingWeekend.lastSession?.sessionId || null,
        lastSessionLabel: upcomingWeekend.lastSession?.sessionLabel || null,
        firstSessionId: upcomingWeekend.firstSession?.sessionId || null,
        firstSessionLabel: upcomingWeekend.firstSession?.sessionLabel || null
      }
    };
  }

  const nextGlobalOpen = activeWeekend.end;
  const lastGlobalClose = activeWeekend.start;
  const secondsUntilOpen = Math.max(0, Math.floor((nextGlobalOpen.toMillis() - now.toMillis()) / 1000));
  const preOpen = secondsUntilOpen <= 3 * 60 * 60;

  return {
    isOpen: false,
    mode: preOpen ? 'pre_open' : 'weekend_closed',
    statusLabel: preOpen ? 'Pre-abertura da Semana' : 'Mercado Fechado',
    contextLabel: preOpen
      ? 'Abertura da primeira sessao da semana se aproximando'
      : 'Intervalo de fim de semana',
    nextGlobalOpenIso: nextGlobalOpen.toISO(),
    nextGlobalCloseIso: null,
    lastGlobalCloseIso: lastGlobalClose.toISO(),
    countdownToOpenSeconds: secondsUntilOpen,
    countdownToCloseSeconds: 0,
    weekendWindow: {
      weekendStartIso: activeWeekend.start.toISO(),
      weekendEndIso: activeWeekend.end.toISO(),
      lastSessionId: activeWeekend.lastSession?.sessionId || null,
      lastSessionLabel: activeWeekend.lastSession?.sessionLabel || null,
      firstSessionId: activeWeekend.firstSession?.sessionId || null,
      firstSessionLabel: activeWeekend.firstSession?.sessionLabel || null
    }
  };
}

function pickActiveNextLast(candidates, now, marketOpen) {
  const activeWindow = marketOpen
    ? candidates.find((candidate) => now >= candidate.start && now < candidate.end) || null
    : null;
  const nextWindow = candidates.find((candidate) => candidate.start > now) || null;
  const lastWindow =
    [...candidates]
      .reverse()
      .find((candidate) => candidate.end <= now) || null;

  return {
    activeWindow,
    nextWindow,
    lastWindow,
    displayWindow: activeWindow || nextWindow || lastWindow || candidates[0] || null
  };
}

function getSessionScheduleByDate(sessionId, referenceDate = undefined, timezone = BASE_TIMEZONE) {
  const definition = SESSION_DEFINITIONS.find((session) => session.id === sessionId);
  if (!definition) {
    return null;
  }

  const now = resolveDateTime(referenceDate, timezone);
  const marketState = getCurrentMarketState(now, timezone);
  const reopenAt =
    !marketState.isOpen && marketState.nextGlobalOpenIso
      ? DateTime.fromISO(marketState.nextGlobalOpenIso).setZone(timezone)
      : null;

  const candidates = buildSessionCandidates(definition, now, { offsetStart: -2, offsetEnd: 4 }, timezone).filter((window) =>
    reopenAt ? window.start >= reopenAt : true
  );

  const picked = pickActiveNextLast(candidates, now, marketState.isOpen);
  const displayWindow = picked.displayWindow;
  if (!displayWindow) {
    return null;
  }

  const utcConfig = FOREX_UTC_CONFIG.sessions[definition.id];
  const dstInfo = getDstInfo(definition.timezone, displayWindow.start, timezone);

  return {
    id: definition.id,
    label: definition.label,
    timezone: definition.timezone,
    openLocal: `${utcConfig.open} UTC`,
    closeLocal: `${utcConfig.close} UTC`,
    openInSaoPaulo: displayWindow.start.toFormat('dd/LL HH:mm'),
    closeInSaoPaulo: displayWindow.end.toFormat('dd/LL HH:mm'),
    startIso: displayWindow.start.toISO(),
    endIso: displayWindow.end.toISO(),
    isDstNow: dstInfo.isDstNow,
    currentOffset: dstInfo.currentOffset
  };
}

function getSessionSchedules(referenceNow = undefined, timezone = BASE_TIMEZONE) {
  const now = resolveDateTime(referenceNow, timezone);
  const marketState = getCurrentMarketState(now, timezone);
  const reopenAt =
    !marketState.isOpen && marketState.nextGlobalOpenIso
      ? DateTime.fromISO(marketState.nextGlobalOpenIso).setZone(timezone)
      : null;

  return SESSION_DEFINITIONS.map((definition) => {
    const candidates = buildSessionCandidates(definition, now, {}, timezone).filter((window) =>
      reopenAt ? window.start >= reopenAt : true
    );
    const picked = pickActiveNextLast(candidates, now, marketState.isOpen);
    const dstInfo = getDstInfo(definition.timezone, now, timezone);
    const utcConfig = FOREX_UTC_CONFIG.sessions[definition.id];

    const startIso = picked.displayWindow?.start.toISO() || null;
    const endIso = picked.displayWindow?.end.toISO() || null;

    return {
      id: definition.id,
      label: definition.label,
      shortLabel: definition.shortLabel,
      timezone: definition.timezone,
      color: definition.color,
      volatility: definition.volatility,
      openLocal: `${utcConfig.open} UTC`,
      closeLocal: `${utcConfig.close} UTC`,
      isActive: Boolean(picked.activeWindow),
      startIso,
      endIso,
      startLabel: picked.displayWindow ? picked.displayWindow.start.toFormat('HH:mm') : '--:--',
      endLabel: picked.displayWindow ? picked.displayWindow.end.toFormat('HH:mm') : '--:--',
      openInSaoPaulo: picked.displayWindow ? picked.displayWindow.start.toFormat('HH:mm') : '--:--',
      closeInSaoPaulo: picked.displayWindow ? picked.displayWindow.end.toFormat('HH:mm') : '--:--',
      timeToOpenSeconds: picked.nextWindow
        ? Math.max(0, Math.floor((picked.nextWindow.start.toMillis() - now.toMillis()) / 1000))
        : null,
      timeToCloseSeconds: picked.activeWindow
        ? Math.max(0, Math.floor((picked.activeWindow.end.toMillis() - now.toMillis()) / 1000))
        : null,
      isDstNow: dstInfo.isDstNow,
      currentOffset: dstInfo.currentOffset,
      offsetMinutes: dstInfo.offsetMinutes,
      _candidates: candidates,
      _activeWindow: picked.activeWindow,
      _nextWindow: picked.nextWindow,
      _lastWindow: picked.lastWindow
    };
  });
}

function getSessionScheduleInSaoPaulo(sessionId, date = undefined, timezone = BASE_TIMEZONE) {
  return getSessionSchedules(date, timezone).find((session) => session.id === sessionId) || null;
}

function isSessionActive(sessionId, now = undefined, timezone = BASE_TIMEZONE) {
  const session = getSessionScheduleInSaoPaulo(sessionId, now, timezone);
  return Boolean(session?.isActive);
}

function getNextSession(now = undefined, timezone = BASE_TIMEZONE) {
  const baseNow = resolveDateTime(now, timezone);
  const marketState = getCurrentMarketState(baseNow, timezone);
  const schedules = getSessionSchedules(baseNow, timezone);
  const minimumStart =
    !marketState.isOpen && marketState.nextGlobalOpenIso
      ? DateTime.fromISO(marketState.nextGlobalOpenIso).setZone(timezone)
      : baseNow;

  const eligible = schedules
    .filter((session) => session._nextWindow && session._nextWindow.start >= minimumStart)
    .sort((a, b) => a._nextWindow.start.toMillis() - b._nextWindow.start.toMillis());

  const next =
    (!marketState.isOpen && marketState.weekendWindow?.firstSessionId
      ? eligible.find((session) => session.id === marketState.weekendWindow.firstSessionId)
      : null) ||
    (!marketState.isOpen ? eligible.find((session) => PRIMARY_SESSION_IDS.has(session.id)) : null) ||
    eligible[0];

  if (!next || !next._nextWindow) {
    return null;
  }

  const label = !marketState.isOpen ? `Reabertura da semana - ${next.label}` : next.label;

  return {
    id: next.id,
    label,
    startIso: next._nextWindow.start.toISO(),
    countdownSeconds: Math.max(0, Math.floor((next._nextWindow.start.toMillis() - baseNow.toMillis()) / 1000))
  };
}

function getSessionOverlaps(now = undefined, timezone = BASE_TIMEZONE) {
  const baseNow = resolveDateTime(now, timezone);
  const schedules = getSessionSchedules(baseNow, timezone);
  const scheduleMap = new Map(schedules.map((session) => [session.id, session]));
  const marketState = getCurrentMarketState(baseNow, timezone);

  return OVERLAP_DEFINITIONS.map((definition) => {
    const a = scheduleMap.get(definition.a);
    const b = scheduleMap.get(definition.b);

    if (!a || !b) {
      return null;
    }

    const overlaps = [];
    a._candidates.forEach((aWindow) => {
      b._candidates.forEach((bWindow) => {
        const start = aWindow.start > bWindow.start ? aWindow.start : bWindow.start;
        const end = aWindow.end < bWindow.end ? aWindow.end : bWindow.end;
        if (end > start) {
          overlaps.push({ start, end });
        }
      });
    });

    const sorted = overlaps
      .sort((x, y) => x.start.toMillis() - y.start.toMillis())
      .filter((window, index, arr) => {
        if (index === 0) {
          return true;
        }
        const prev = arr[index - 1];
        return window.start.toISO() !== prev.start.toISO() || window.end.toISO() !== prev.end.toISO();
      });

    if (!sorted.length) {
      return null;
    }

    const activeWindow = marketState.isOpen
      ? sorted.find((window) => baseNow >= window.start && baseNow < window.end) || null
      : null;
    const nextWindow = sorted.find((window) => window.start > baseNow) || null;
    const displayWindow = activeWindow || nextWindow || sorted[0];

    return {
      id: definition.id,
      label: definition.label,
      sessions: [definition.a, definition.b],
      startIso: displayWindow.start.toISO(),
      endIso: displayWindow.end.toISO(),
      startLabel: displayWindow.start.toFormat('HH:mm'),
      endLabel: displayWindow.end.toFormat('HH:mm'),
      isActive: Boolean(activeWindow),
      countdownSeconds: activeWindow
        ? 0
        : Math.max(0, Math.floor((displayWindow.start.toMillis() - baseNow.toMillis()) / 1000))
    };
  }).filter(Boolean);
}

function getSessionOverlapsByDate(referenceDate = undefined, timezone = BASE_TIMEZONE) {
  return getSessionOverlaps(referenceDate, timezone).map((overlap) => ({
    id: overlap.id,
    label: overlap.label,
    startIso: overlap.startIso,
    endIso: overlap.endIso,
    startLabel: DateTime.fromISO(overlap.startIso).toFormat('dd/LL HH:mm'),
    endLabel: DateTime.fromISO(overlap.endIso).toFormat('dd/LL HH:mm')
  }));
}

module.exports = {
  OVERLAP_DEFINITIONS,
  FOREX_UTC_CONFIG,
  formatOffset,
  getDstInfo,
  toUtc,
  isForexOpen,
  isSessionOpen,
  isMarketOpen,
  getCurrentMarketState,
  getWeekendWindow,
  getLastSessionOfWeek,
  getFirstSessionOfNextWeek,
  getSessionSchedules,
  getSessionScheduleByDate,
  getSessionScheduleInSaoPaulo,
  isSessionActive,
  getNextSession,
  getSessionOverlaps,
  getSessionOverlapsByDate
};
