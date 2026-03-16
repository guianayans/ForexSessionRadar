const { Router } = require('express');
const { DateTime } = require('luxon');
const { z } = require('zod');
const { answerQuestionByRules } = require('../services/assistantService');
const { askOpenAI } = require('../services/openaiService');
const { computeDashboard } = require('../services/sessionService');
const { BASE_TIMEZONE } = require('../types/constants');
const { resolveLocale } = require('../utils/locale');

const requestSchema = z.object({
  question: z.string().min(1),
  apiKey: z.string().min(20).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        text: z.string().min(1).max(800)
      })
    )
    .max(8)
    .optional()
});

function parseClientTimezone(req) {
  const raw = req.query?.timezone || req.get('x-forex-timezone') || null;
  if (!raw || typeof raw !== 'string') {
    return null;
  }

  const candidate = raw.trim();
  const probe = DateTime.now().setZone(candidate);
  return probe.isValid ? candidate : null;
}

function parseClientLocale(req, timezone = BASE_TIMEZONE) {
  const raw = req.query?.locale || req.get('x-forex-locale') || null;
  return resolveLocale(raw, timezone);
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

function createAssistantRoutes(store, options = {}) {
  const router = Router();
  const getNow = typeof options.getNow === 'function' ? options.getNow : () => undefined;

  router.post('/assistant/query', async (req, res, next) => {
    try {
      const parsed = requestSchema.parse(req.body || {});
      const payload = await store.get();
      const runtimeTimezone = parseClientTimezone(req) || BASE_TIMEZONE;
      const runtimeLocale = parseClientLocale(req, runtimeTimezone);
      const mockFromQuery = parseMockNow(req.query?.mockNow, runtimeTimezone);
      const mockFromHeader = parseMockNow(req.get('x-forex-mock-now'), runtimeTimezone);
      const dashboard = computeDashboard(payload, mockFromQuery || mockFromHeader || getNow(), runtimeTimezone);
      let answer;

      try {
        answer = await askOpenAI(parsed.question, dashboard, parsed.apiKey, parsed.history || [], runtimeLocale);
      } catch (error) {
        // Falha de rede/credencial nao bloqueia o app: cai para modo local.
        console.warn('OpenAI indisponivel, usando assistente local:', error.message);
      }

      if (!answer) {
        answer = {
          ...answerQuestionByRules(parsed.question, dashboard, runtimeLocale),
          provider: 'local'
        };
      }

      res.json({
        ...answer,
        context: {
          session: dashboard.currentSession.label,
          nowIso: dashboard.nowIso
        }
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = {
  createAssistantRoutes
};
