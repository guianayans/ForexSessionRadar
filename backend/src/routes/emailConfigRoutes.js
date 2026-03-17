const { Router } = require('express');
const { z } = require('zod');
const { DateTime } = require('luxon');
const { getRuntimeEmailConfig, saveEmailConfig } = require('../services/emailConfigService');
const { createEmailServiceFromConfig } = require('../services/emailService');
const { buildAlertTemplate, buildTestTemplate } = require('../services/emailTemplateService');
const { computeDashboard, getAlertTriggerCandidates } = require('../services/sessionService');
const { resolveLocale, localizeSessionLabel } = require('../utils/locale');

const emailConfigSchema = z.object({
  enabled: z.boolean().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  smtpFrom: z.string().optional(),
  whitelabelFrom: z.string().optional(),
  defaultTo: z.union([z.string().email(), z.literal('')]).optional()
});

const emailConfigTestSchema = emailConfigSchema.extend({
  testTo: z.union([z.string().email(), z.literal('')]).optional()
});

function createEmailConfigRoutes(options = {}) {
  const router = Router();
  const onConfigApplied = typeof options.onConfigApplied === 'function' ? options.onConfigApplied : () => null;
  const store = options.store || null;
  const getNow = typeof options.getNow === 'function' ? options.getNow : () => DateTime.now();
  const getTimelineSnapshot = typeof options.getTimelineSnapshot === 'function' ? options.getTimelineSnapshot : () => null;
  const toTimelineInlineAttachment =
    typeof options.toTimelineInlineAttachment === 'function' ? options.toTimelineInlineAttachment : () => null;

  function parseClientTimezone(req) {
    const raw = req.query?.timezone || req.get('x-forex-timezone') || null;
    if (!raw || typeof raw !== 'string') {
      return null;
    }

    const candidate = raw.trim();
    const probe = DateTime.now().setZone(candidate);
    return probe.isValid ? candidate : null;
  }

  router.get('/email-config', async (_req, res, next) => {
    try {
      const config = getRuntimeEmailConfig();
      res.json(config);
    } catch (error) {
      next(error);
    }
  });

  router.put('/email-config', async (req, res, next) => {
    try {
      const parsed = emailConfigSchema.parse(req.body || {});
      const saved = await saveEmailConfig(parsed);
      onConfigApplied();
      res.json(saved);
    } catch (error) {
      next(error);
    }
  });

  router.post('/email-config/test', async (req, res, next) => {
    try {
      const parsed = emailConfigTestSchema.parse(req.body || {});
      const current = getRuntimeEmailConfig();
      const merged = {
        ...current,
        ...parsed
      };
      const storePayload = store ? await store.get() : null;
      const dashboardRecipient = String(storePayload?.preferences?.emailAddress || '').trim();
      const testTo = (parsed.testTo || dashboardRecipient || merged.defaultTo || merged.smtpUser || '').trim();
      if (!testTo) {
        return res.status(400).json({
          ok: false,
          message: 'Informe um e-mail de destino no dashboard (emailAddress), em EMAIL_DEFAULT_TO ou via testTo.'
        });
      }

      const timezone = parseClientTimezone(req) || merged.baseTimezone || 'America/Sao_Paulo';
      const locale = resolveLocale(req.query?.locale || req.get('x-forex-locale') || null, timezone);
      const timelineSnapshot = getTimelineSnapshot({ maxAgeSeconds: 900 }) || null;
      const timelineImageCid = timelineSnapshot ? 'timeline-snapshot' : null;
      const timelineImageCapturedAt = timelineSnapshot?.capturedAtIso
        ? DateTime.fromISO(timelineSnapshot.capturedAtIso, { setZone: true }).setZone(timezone).toFormat('dd/LL/yyyy HH:mm:ss')
        : null;
      const timelineAttachment = timelineSnapshot ? toTimelineInlineAttachment(timelineSnapshot, timelineImageCid) : null;
      const attachments = timelineAttachment ? [timelineAttachment] : undefined;

      const service = createEmailServiceFromConfig(
        {
          enabled: true,
          host: merged.smtpHost || '',
          port: merged.smtpPort || 587,
          secure: merged.smtpSecure || false,
          user: merged.smtpUser || '',
          pass: merged.smtpPass || '',
          from: merged.smtpFrom || '',
          whitelabelFrom: merged.whitelabelFrom || '',
          defaultRecipient: merged.defaultTo || ''
        },
        { logger: console }
      );

      const verification = await service.verifyConnection();
      if (!verification.ok) {
        return res.status(400).json({
          ok: false,
          message: verification.reason || 'Falha ao conectar no SMTP.'
        });
      }

      let template;
      let testSubject = 'Teste SMTP - Forex Session Radar';

      if (storePayload) {
        const dashboard = computeDashboard(storePayload, getNow(), timezone);
        const candidates = getAlertTriggerCandidates(dashboard.upcomingEvents, dashboard.preferences, dashboard.nowIso)
          .filter((trigger) => trigger.triggerInSeconds >= 0)
          .sort((a, b) => a.triggerInSeconds - b.triggerInSeconds);
        const nextTrigger = candidates[0] || null;

        const sourceEvent = nextTrigger || dashboard.upcomingEvents?.[0] || null;
        const sessionLabelFromEvent = sourceEvent?.sessionId
          ? dashboard.timeline.sessions.find((session) => session.id === sourceEvent.sessionId)?.label
          : null;
        const currentSessionLabel = localizeSessionLabel(
          dashboard.currentSession?.label || 'Mercado',
          locale
        );

        if (sourceEvent) {
          const localizedTitle = localizeSessionLabel(sourceEvent.title, locale) || sourceEvent.title;
          const sessionLabel = localizeSessionLabel(
            sessionLabelFromEvent || currentSessionLabel || 'Mercado',
            locale
          );

          template = buildAlertTemplate({
            trigger: {
              ...sourceEvent,
              // Simula envio imediato do proximo evento, mantendo o contexto operacional atual.
              timeIso: dashboard.nowIso,
              triggerTimeIso: dashboard.nowIso,
              triggerInSeconds: 0,
              title: localizedTitle,
              sessionLabel,
              message: `Simulacao de envio do proximo evento: ${localizedTitle}.`,
              insightText: `Teste operacional gerado no contexto atual de mercado (${currentSessionLabel}).`
            },
            dashboard,
            locale,
            timelineImageCid,
            timelineImageCapturedAt
          });
          testSubject = `Simulacao de alerta | ${localizedTitle}`;
        } else {
          const fallbackTitle = localizeSessionLabel(
            dashboard.marketState?.nextSessionLabel || 'Proximo evento operacional',
            locale
          );

          template = buildAlertTemplate({
            trigger: {
              id: 'smtp-test-fallback',
              type: 'session_open',
              title: fallbackTitle,
              timeIso: dashboard.nowIso,
              triggerTimeIso: dashboard.nowIso,
              triggerInSeconds: 0,
              sessionLabel: currentSessionLabel,
              message: `Simulacao operacional enviada agora para validar o canal de e-mail.`,
              insightText: `Sem eventos futuros imediatos; usando contexto atual (${currentSessionLabel}).`
            },
            dashboard,
            locale,
            timelineImageCid,
            timelineImageCapturedAt
          });
          testSubject = `Simulacao de alerta | ${fallbackTitle}`;
        }
      } else {
        template = buildTestTemplate({
          timezone,
          destinationEmail: testTo,
          timelineImageCid,
          timelineImageCapturedAt
        });
      }

      const sendResult = await service.sendAlertEmail({
        to: testTo,
        subject: testSubject,
        text: template.text,
        html: template.html,
        attachments
      });

      if (!sendResult.sent) {
        return res.status(400).json({
          ok: false,
          message: sendResult.reason || 'Falha ao enviar e-mail de teste.'
        });
      }

      return res.json({
        ok: true,
        message: `E-mail de teste enviado para ${testTo}.`,
        messageId: sendResult.messageId || null
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = {
  createEmailConfigRoutes
};
