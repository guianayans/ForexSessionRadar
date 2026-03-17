const { DateTime } = require('luxon');
const { computeDashboard, getAlertTriggerCandidates } = require('../services/sessionService');
const { resolveLocale, localizeSessionLabel } = require('../utils/locale');
const { buildAlertTemplate } = require('../services/emailTemplateService');

const SCHEDULER_INTERVAL_MS = 15_000;
const TRIGGER_LOOKAHEAD_SECONDS = 75;
const TRIGGER_GRACE_SECONDS = 300;
const SENT_RETENTION_DAYS = 7;

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function translate(locale, key, params = {}) {
  const dict = {
    'pt-BR': {
      subject: 'Forex Session Radar | {title}',
      summary: 'Alerta operacional disparado',
      event: 'Evento',
      session: 'Sessao',
      trigger: 'Disparo',
      lead: 'Antecedencia',
      timezone: 'Fuso',
      close: 'Este e-mail foi enviado automaticamente pelo Forex Session Radar.'
    },
    'en-US': {
      subject: 'Forex Session Radar | {title}',
      summary: 'Operational alert triggered',
      event: 'Event',
      session: 'Session',
      trigger: 'Trigger',
      lead: 'Lead time',
      timezone: 'Timezone',
      close: 'This email was automatically sent by Forex Session Radar.'
    },
    'es-ES': {
      subject: 'Forex Session Radar | {title}',
      summary: 'Alerta operacional disparada',
      event: 'Evento',
      session: 'Sesion',
      trigger: 'Disparo',
      lead: 'Anticipacion',
      timezone: 'Zona horaria',
      close: 'Este correo fue enviado automaticamente por Forex Session Radar.'
    }
  };

  const source = dict[locale] || dict['en-US'];
  const template = source[key] || dict['en-US'][key] || key;
  return template.replace(/\{(\w+)\}/g, (_, token) => String(params[token] ?? ''));
}

function formatEventTitle(title, locale) {
  if (!title) {
    return title;
  }

  return title
    .replace('Abertura ', '')
    .replace('Fechamento ', '')
    .replace('Inicio da Sobreposicao ', '')
    .replace('Fim da Sobreposicao ', '')
    .replace('Reabertura semanal do mercado', locale === 'pt-BR' ? 'Reabertura semanal' : locale === 'es-ES' ? 'Reapertura semanal' : 'Weekly reopen')
    .replace('Fechamento semanal do mercado', locale === 'pt-BR' ? 'Fechamento semanal' : locale === 'es-ES' ? 'Cierre semanal' : 'Weekly close');
}

function extractSessionLabelFromTitle(title, locale) {
  if (!title) {
    return '-';
  }

  return localizeSessionLabel(
    title
      .replace('Abertura ', '')
      .replace('Fechamento ', '')
      .replace('Inicio da Sobreposicao ', '')
      .replace('Fim da Sobreposicao ', ''),
    locale
  );
}

function buildEmailPayload(trigger, dashboard, locale, options = {}) {
  const timelineImageCid = options.timelineImageCid || null;
  const timelineImageCapturedAt = options.timelineImageCapturedAt || null;
  const localizedTitle = formatEventTitle(localizeSessionLabel(trigger.title, locale) || trigger.title, locale);
  const leadLabel = trigger.leadMinutes === 0 ? 'agora' : `${trigger.leadMinutes} min antes`;
  const message = `Evento monitorado: ${localizedTitle || trigger.title}. Disparo configurado para ${leadLabel}.`;
  const sessionLabel = extractSessionLabelFromTitle(trigger.title, locale);
  const subject = translate(locale, 'subject', { title: localizedTitle || trigger.title });
  const template = buildAlertTemplate({
    trigger: {
      ...trigger,
      title: localizedTitle || trigger.title,
      sessionLabel,
      message
    },
    dashboard,
    locale,
    timelineImageCid,
    timelineImageCapturedAt
  });

  return {
    subject,
    text: template.text,
    html: template.html
  };
}

function createAlertScheduler({
  store,
  getNow,
  emailService,
  getEmailService,
  getTimelineSnapshot,
  toTimelineInlineAttachment,
  logger = console
}) {
  let intervalId = null;
  let running = false;

  async function tick() {
    if (running) {
      return;
    }

    running = true;
    try {
      const activeEmailService = typeof getEmailService === 'function' ? getEmailService() : emailService;
      if (!activeEmailService?.isEnabled?.()) {
        return;
      }

      const payload = await store.get();
      const emailStatus = activeEmailService?.getStatus?.() || {};
      const defaultRecipient = typeof emailStatus.defaultRecipient === 'string' ? emailStatus.defaultRecipient.trim() : '';
      const to = payload?.preferences?.emailAddress?.trim() || defaultRecipient;
      const enabledByUser = Boolean(payload?.preferences?.emailNotificationsEnabled);

      if (!enabledByUser || !isValidEmail(to)) {
        return;
      }

      const runtimeTimezone = payload?.preferences?.baseTimezone;
      const dashboard = computeDashboard(payload, getNow(), runtimeTimezone);
      const locale = resolveLocale(null, dashboard.baseTimezone);
      const nowIso = dashboard.nowIso;
      const sentByTriggerId = payload?.notifications?.emailSentByTriggerId || {};
      const dueTriggers = getAlertTriggerCandidates(dashboard.upcomingEvents, dashboard.preferences, nowIso)
        .filter((trigger) => trigger.triggerInSeconds <= TRIGGER_LOOKAHEAD_SECONDS && trigger.triggerInSeconds >= -TRIGGER_GRACE_SECONDS)
        .sort((a, b) => a.triggerInSeconds - b.triggerInSeconds);

      if (!dueTriggers.length) {
        return;
      }

      const nextSentByTriggerId = { ...sentByTriggerId };
      let hasNewSends = false;
      const timelineSnapshot =
        typeof getTimelineSnapshot === 'function' ? getTimelineSnapshot({ maxAgeSeconds: 900 }) : null;
      const timelineImageCid = timelineSnapshot ? 'timeline-snapshot' : null;
      const timelineAttachment =
        timelineSnapshot && typeof toTimelineInlineAttachment === 'function'
          ? toTimelineInlineAttachment(timelineSnapshot, timelineImageCid)
          : null;
      const attachments = timelineAttachment ? [timelineAttachment] : undefined;
      const timelineImageCapturedAt = timelineSnapshot?.capturedAtIso
        ? DateTime.fromISO(timelineSnapshot.capturedAtIso, { setZone: true }).setZone(dashboard.baseTimezone || 'UTC').toFormat('dd/LL/yyyy HH:mm:ss')
        : null;

      for (const trigger of dueTriggers) {
        if (nextSentByTriggerId[trigger.triggerId]) {
          continue;
        }

        const mail = buildEmailPayload(trigger, dashboard, locale, {
          timelineImageCid,
          timelineImageCapturedAt
        });
        const result = await activeEmailService.sendAlertEmail({
          to,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
          attachments
        });

        if (result.sent) {
          hasNewSends = true;
          nextSentByTriggerId[trigger.triggerId] = nowIso;
          logger.info(`[email] Alerta enviado para ${to}: ${trigger.triggerId}`);
        }
      }

      const retentionLimit = DateTime.fromISO(nowIso, { setZone: true }).minus({ days: SENT_RETENTION_DAYS });
      Object.entries(nextSentByTriggerId).forEach(([triggerId, sentIso]) => {
        const sentAt = DateTime.fromISO(sentIso, { setZone: true });
        if (!sentAt.isValid || sentAt < retentionLimit) {
          delete nextSentByTriggerId[triggerId];
          hasNewSends = true;
        }
      });

      if (hasNewSends) {
        await store.update('notifications', { emailSentByTriggerId: nextSentByTriggerId });
      }
    } catch (error) {
      logger.error('[alertScheduler] erro no tick:', error?.message || error);
    } finally {
      running = false;
    }
  }

  return {
    start() {
      if (intervalId) {
        return;
      }

      void tick();
      intervalId = setInterval(() => {
        void tick();
      }, SCHEDULER_INTERVAL_MS);
    },
    stop() {
      if (!intervalId) {
        return;
      }

      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

module.exports = {
  createAlertScheduler
};
