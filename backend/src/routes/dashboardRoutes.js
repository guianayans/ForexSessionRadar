const { Router } = require('express');
const { DateTime } = require('luxon');
const { computeDashboard } = require('../services/sessionService');
const { BASE_TIMEZONE } = require('../types/constants');

function parseClientTimezone(req) {
  const raw = req.query?.timezone || req.get('x-forex-timezone') || null;
  if (!raw || typeof raw !== 'string') {
    return null;
  }

  const candidate = raw.trim();
  const probe = DateTime.now().setZone(candidate);
  return probe.isValid ? candidate : null;
}

function parseMockNow(value, timezone = BASE_TIMEZONE) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const parsed = DateTime.fromISO(value, { setZone: true });
  if (parsed.isValid) {
    return parsed.setZone(timezone);
  }

  const fallback = DateTime.fromISO(value, { zone: timezone });
  return fallback.isValid ? fallback : null;
}

function createDashboardRoutes(store, options = {}) {
  const router = Router();
  const getNow = typeof options.getNow === 'function' ? options.getNow : () => undefined;
  const getEmailStatus = typeof options.getEmailStatus === 'function' ? options.getEmailStatus : () => null;

  router.get('/dashboard', async (req, res, next) => {
    try {
      const payload = await store.get();
      const runtimeTimezone = parseClientTimezone(req) || BASE_TIMEZONE;
      const mockFromQuery = parseMockNow(req.query?.mockNow, runtimeTimezone);
      const mockFromHeader = parseMockNow(req.get('x-forex-mock-now'), runtimeTimezone);
      const dashboard = computeDashboard(payload, mockFromQuery || mockFromHeader || getNow(), runtimeTimezone);
      const emailStatus = getEmailStatus();
      res.json({
        ...dashboard,
        email: emailStatus
          ? {
              enabled: Boolean(emailStatus.enabled),
              configured: Boolean(emailStatus.configured),
              reason: emailStatus.reason || null,
              from: emailStatus.from || null,
              defaultRecipient: emailStatus.defaultRecipient || null
            }
          : null
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = {
  createDashboardRoutes
};
