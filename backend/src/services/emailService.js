const nodemailer = require('nodemailer');
const dns = require('node:dns').promises;
const net = require('node:net');

function parseBooleanEnv(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function parsePort(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function parseIpFamily(value, fallback = 4) {
  const parsed = Number(value);
  if (parsed === 4 || parsed === 6) {
    return parsed;
  }
  return fallback;
}

function toRuntimeConfig(input = {}) {
  return {
    enabled: parseBooleanEnv(input.enabled),
    host: typeof input.host === 'string' ? input.host.trim() : '',
    port: parsePort(input.port, 587),
    secure: parseBooleanEnv(input.secure),
    user: typeof input.user === 'string' ? input.user.trim() : '',
    pass: typeof input.pass === 'string' ? input.pass : '',
    ipFamily: parseIpFamily(input.ipFamily, 4),
    from:
      (typeof input.whitelabelFrom === 'string' ? input.whitelabelFrom.trim() : '') ||
      (typeof input.from === 'string' ? input.from.trim() : '') ||
      (typeof input.user === 'string' ? input.user.trim() : ''),
    defaultRecipient: typeof input.defaultRecipient === 'string' ? input.defaultRecipient.trim() : ''
  };
}

function createDisabledService(defaultRecipient) {
  return {
    isEnabled() {
      return false;
    },
    getStatus() {
      return {
        enabled: false,
        configured: false,
        reason: 'EMAIL_NOTIFICATIONS_ENABLED desativado',
        defaultRecipient
      };
    },
    async verifyConnection() {
      return {
        ok: false,
        reason: 'EMAIL_NOTIFICATIONS_ENABLED desativado'
      };
    },
    async sendAlertEmail() {
      return {
        sent: false,
        skipped: true,
        reason: 'EMAIL_NOTIFICATIONS_ENABLED desativado'
      };
    }
  };
}

function createIncompleteConfigService(defaultRecipient) {
  return {
    isEnabled() {
      return false;
    },
    getStatus() {
      return {
        enabled: true,
        configured: false,
        reason: 'Config SMTP incompleta (SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM)',
        defaultRecipient
      };
    },
    async verifyConnection() {
      return {
        ok: false,
        reason: 'Config SMTP incompleta'
      };
    },
    async sendAlertEmail() {
      return {
        sent: false,
        skipped: true,
        reason: 'Config SMTP incompleta'
      };
    }
  };
}

function createEmailServiceFromConfig(configInput, options = {}) {
  const logger = options.logger || console;
  const config = toRuntimeConfig(configInput);
  const { enabled, host, port, secure, user, pass, ipFamily, from, defaultRecipient } = config;
  let effectiveSecure = secure;

  if (port === 587 && secure) {
    effectiveSecure = false;
    logger.warn?.('[email] SMTP_SECURE=true com porta 587 detectado. Aplicando STARTTLS (secure=false).');
  }

  if (!enabled) {
    return createDisabledService(defaultRecipient);
  }

  if (!host || !user || !pass || !from) {
    return createIncompleteConfigService(defaultRecipient);
  }

  const shouldResolveIpv4 = ipFamily === 4 && net.isIP(host) === 0;

  async function resolveConnectionHost() {
    if (!shouldResolveIpv4) {
      return host;
    }

    try {
      const resolved = await dns.lookup(host, { family: 4 });
      return resolved?.address || host;
    } catch (error) {
      logger.warn?.(`[email] Falha ao resolver IPv4 para ${host}. Tentando host original.`);
      return host;
    }
  }

  async function createTransporter() {
    const connectionHost = await resolveConnectionHost();
    const tlsServername = net.isIP(host) === 0 ? host : undefined;

    return nodemailer.createTransport({
      host: connectionHost,
      port,
      secure: effectiveSecure,
      family: ipFamily,
      auth: { user, pass },
      ...(tlsServername ? { tls: { servername: tlsServername } } : {})
    });
  }

  return {
    isEnabled() {
      return true;
    },
    getStatus() {
      return {
        enabled: true,
        configured: true,
        host,
        port,
        secure: effectiveSecure,
        ipFamily,
        from,
        defaultRecipient
      };
    },
    async verifyConnection() {
      try {
        const transporter = await createTransporter();
        await transporter.verify();
        return {
          ok: true
        };
      } catch (error) {
        logger.error('[email] Falha ao verificar conexao SMTP:', error?.message || error);
        return {
          ok: false,
          reason: error?.message || 'Falha SMTP'
        };
      }
    },
    async sendAlertEmail({ to, subject, text, html, attachments }) {
      if (!to || !subject || (!text && !html)) {
        return {
          sent: false,
          skipped: true,
          reason: 'Payload de e-mail invalido'
        };
      }

      try {
        const transporter = await createTransporter();
        const info = await transporter.sendMail({
          from,
          to,
          subject,
          text,
          html,
          ...(Array.isArray(attachments) && attachments.length ? { attachments } : {})
        });

        return {
          sent: true,
          messageId: info.messageId
        };
      } catch (error) {
        logger.error('[email] Falha ao enviar e-mail:', error?.message || error);
        return {
          sent: false,
          skipped: false,
          reason: error?.message || 'Falha SMTP'
        };
      }
    }
  };
}

function createEmailService(options = {}) {
  return createEmailServiceFromConfig(
    {
      enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED || '',
      host: process.env.SMTP_HOST || '',
      port: process.env.SMTP_PORT || '',
      secure: process.env.SMTP_SECURE || '',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      ipFamily: process.env.SMTP_IP_FAMILY || '4',
      from: process.env.SMTP_FROM || '',
      whitelabelFrom: process.env.EMAIL_WHITELABEL_FROM || '',
      defaultRecipient: process.env.EMAIL_DEFAULT_TO || ''
    },
    options
  );
}

module.exports = {
  createEmailService,
  createEmailServiceFromConfig
};
