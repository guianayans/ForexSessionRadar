const { DateTime } = require('luxon');
const { RADAR_MAP } = require('../types/constants');

const BRAZIL_TIMEZONE = 'America/Sao_Paulo';
const BRAZIL_FUTURES = ['WINFUT', 'WDOFUT'];
const BRAZIL_FUTURES_IDEAL_UNTIL_HOUR = 12;

function cloneRadar(radar) {
  return {
    recommended: [...(radar.recommended || [])],
    neutral: [...(radar.neutral || [])],
    avoid: [...(radar.avoid || [])],
    ...(radar.message ? { message: radar.message } : {})
  };
}

function isBrazilFuturesMorningWindow(now) {
  if (!now?.isValid) {
    return true;
  }

  return now.setZone(BRAZIL_TIMEZONE).hour < BRAZIL_FUTURES_IDEAL_UNTIL_HOUR;
}

function getBrazilRadar(now = DateTime.now()) {
  const base = RADAR_MAP.brazil;
  const radar = cloneRadar(base);
  const futuresInIdeal = isBrazilFuturesMorningWindow(now);

  for (const asset of BRAZIL_FUTURES) {
    radar.neutral = radar.neutral.filter((item) => item !== asset);
    radar.recommended = radar.recommended.filter((item) => item !== asset);
    radar.avoid = radar.avoid.filter((item) => item !== asset);

    if (futuresInIdeal) {
      radar.recommended.push(asset);
    } else {
      radar.neutral.push(asset);
    }
  }

  return radar;
}

function getRadarForContext(contextKey, now) {
  if (contextKey === 'brazil') {
    return getBrazilRadar(now || DateTime.now());
  }

  return cloneRadar(RADAR_MAP[contextKey] || RADAR_MAP.closed);
}

function mergeRadarTier(targetRadar, sourceRadar) {
  const merged = cloneRadar(targetRadar);

  for (const asset of sourceRadar.recommended) {
    if (merged.avoid.includes(asset) || merged.neutral.includes(asset) || merged.recommended.includes(asset)) {
      continue;
    }

    merged.recommended.push(asset);
  }

  for (const asset of sourceRadar.neutral) {
    if (merged.avoid.includes(asset) || merged.recommended.includes(asset) || merged.neutral.includes(asset)) {
      continue;
    }

    merged.neutral.push(asset);
  }

  return merged;
}

function enrichRadarWithActiveExchanges(primaryRadar, sessions = [], now = DateTime.now()) {
  const brazilSession = sessions.find((session) => session.id === 'brazil' && session.isActive);
  if (!brazilSession) {
    return cloneRadar(primaryRadar);
  }

  return mergeRadarTier(primaryRadar, getBrazilRadar(now));
}

module.exports = {
  BRAZIL_FUTURES,
  BRAZIL_FUTURES_IDEAL_UNTIL_HOUR,
  enrichRadarWithActiveExchanges,
  getBrazilRadar,
  getRadarForContext,
  isBrazilFuturesMorningWindow
};
