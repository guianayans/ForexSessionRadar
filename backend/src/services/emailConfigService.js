const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const dotenv = require('dotenv');

const ENV_KEYS = [
  'EMAIL_NOTIFICATIONS_ENABLED',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'EMAIL_WHITELABEL_FROM',
  'EMAIL_DEFAULT_TO'
];

function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function toPort(value, fallback = 587) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function resolveWritableEnvPath() {
  if (process.env.FOREX_ENV_FILE) {
    return path.resolve(process.env.FOREX_ENV_FILE);
  }

  return path.join(os.homedir(), 'Library', 'Application Support', 'Forex Session Radar', 'backend.env');
}

function getRuntimeEmailConfig() {
  const runtimeUser = process.env.SMTP_USER || '';
  const runtimeDefaultTo = process.env.EMAIL_DEFAULT_TO || runtimeUser;
  const runtimeFrom = process.env.SMTP_FROM || (runtimeUser ? `Forex Session Radar <${runtimeUser}>` : '');

  return {
    enabled: toBoolean(process.env.EMAIL_NOTIFICATIONS_ENABLED, true),
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: toPort(process.env.SMTP_PORT, 587),
    smtpSecure: toBoolean(process.env.SMTP_SECURE, false),
    smtpUser: runtimeUser,
    smtpPass: process.env.SMTP_PASS || '',
    smtpFrom: runtimeFrom,
    whitelabelFrom: process.env.EMAIL_WHITELABEL_FROM || '',
    defaultTo: runtimeDefaultTo,
    envPath: resolveWritableEnvPath()
  };
}

function mapConfigToEnv(config) {
  return {
    EMAIL_NOTIFICATIONS_ENABLED: config.enabled ? 'true' : 'false',
    SMTP_HOST: config.smtpHost || '',
    SMTP_PORT: String(config.smtpPort || 587),
    SMTP_SECURE: config.smtpSecure ? 'true' : 'false',
    SMTP_USER: config.smtpUser || '',
    SMTP_PASS: config.smtpPass || '',
    SMTP_FROM: config.smtpFrom || '',
    EMAIL_WHITELABEL_FROM: config.whitelabelFrom || '',
    EMAIL_DEFAULT_TO: config.defaultTo || ''
  };
}

function applyConfigToProcessEnv(config) {
  const nextEnv = mapConfigToEnv(config);
  Object.entries(nextEnv).forEach(([key, value]) => {
    process.env[key] = value;
  });
}

function formatEnvValue(value) {
  const stringValue = String(value ?? '');
  if (stringValue === '') {
    return '';
  }

  if (/^[A-Za-z0-9._:/@+-]+$/.test(stringValue)) {
    return stringValue;
  }

  const escaped = stringValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  return `"${escaped}"`;
}

async function readEnvObject(envPath) {
  if (!fsSync.existsSync(envPath)) {
    return {};
  }

  const raw = await fs.readFile(envPath, 'utf8');
  return dotenv.parse(raw);
}

async function writeEnvObject(envPath, envObject) {
  await fs.mkdir(path.dirname(envPath), { recursive: true });

  const lines = Object.entries(envObject)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${formatEnvValue(value)}`);

  await fs.writeFile(envPath, `${lines.join('\n')}\n`, 'utf8');
}

async function saveEmailConfig(partialConfig) {
  const current = getRuntimeEmailConfig();
  const merged = {
    ...current,
    ...partialConfig
  };

  // Regra: por padrao, destino e remetente podem iniciar iguais, mas devem permanecer independentes.
  // Copia destino -> remetente somente quando remetente ainda nao esta definido.
  const normalizedRecipient = String(merged.defaultTo || '').trim().toLowerCase();
  const normalizedSender = String(merged.smtpUser || '').trim().toLowerCase();
  if (!normalizedSender && normalizedRecipient) {
    merged.smtpUser = normalizedRecipient;
  }

  if (!String(merged.smtpFrom || '').trim() && String(merged.smtpUser || '').trim()) {
    merged.smtpFrom = `Forex Session Radar <${String(merged.smtpUser).trim()}>`;
  }

  const envPath = resolveWritableEnvPath();
  const currentEnvObject = await readEnvObject(envPath);
  const nextEmailEnv = mapConfigToEnv(merged);

  ENV_KEYS.forEach((key) => {
    currentEnvObject[key] = nextEmailEnv[key];
  });

  await writeEnvObject(envPath, currentEnvObject);
  applyConfigToProcessEnv(merged);

  return {
    ...getRuntimeEmailConfig(),
    envPath
  };
}

module.exports = {
  getRuntimeEmailConfig,
  saveEmailConfig,
  resolveWritableEnvPath
};
