const { DateTime } = require('luxon');

const SPANISH_TIMEZONE_PREFIXES = [
  'America/Argentina',
  'America/Santiago',
  'America/Bogota',
  'America/Lima',
  'America/Caracas',
  'America/La_Paz',
  'America/Mexico_City',
  'America/Montevideo',
  'Europe/Madrid'
];

const PORTUGUESE_TIMEZONE_PREFIXES = ['America/Sao_Paulo', 'Europe/Lisbon', 'Atlantic/Cape_Verde'];
const SUPPORTED_LOCALES = ['pt-BR', 'en-US', 'es-ES'];

const LOCALE_BY_LANGUAGE = {
  'pt-BR': 'pt-BR',
  'en-US': 'en-US',
  'es-ES': 'es'
};

const SESSION_LABELS = {
  'Sessao de Sydney': { 'pt-BR': 'Sessao de Sydney', 'en-US': 'Sydney Session', 'es-ES': 'Sesion de Sydney' },
  'Sessao Asiatica': { 'pt-BR': 'Sessao Asiatica', 'en-US': 'Asian Session', 'es-ES': 'Sesion Asiatica' },
  'Sessao Europeia': { 'pt-BR': 'Sessao Europeia', 'en-US': 'European Session', 'es-ES': 'Sesion Europea' },
  'Sessao Americana': { 'pt-BR': 'Sessao Americana', 'en-US': 'American Session', 'es-ES': 'Sesion Americana' },
  'Janela de Ouro': { 'pt-BR': 'Janela de Ouro', 'en-US': 'Golden Window', 'es-ES': 'Ventana Dorada' },
  'Mercado Fechado': { 'pt-BR': 'Mercado Fechado', 'en-US': 'Market Closed', 'es-ES': 'Mercado Cerrado' },
  'Transicao de Mercado': { 'pt-BR': 'Transicao de Mercado', 'en-US': 'Market Transition', 'es-ES': 'Transicion de Mercado' },
  'Reabertura da semana - Sessao de Sydney': {
    'pt-BR': 'Reabertura da semana - Sessao de Sydney',
    'en-US': 'Weekly reopen - Sydney Session',
    'es-ES': 'Reapertura semanal - Sesion de Sydney'
  }
};

function resolveLocaleFromTimezone(timezone = '') {
  if (!timezone) {
    return 'en-US';
  }

  if (PORTUGUESE_TIMEZONE_PREFIXES.some((prefix) => timezone.startsWith(prefix))) {
    return 'pt-BR';
  }

  if (SPANISH_TIMEZONE_PREFIXES.some((prefix) => timezone.startsWith(prefix))) {
    return 'es-ES';
  }

  return 'en-US';
}

function resolveLocale(inputLocale, timezone = '') {
  if (typeof inputLocale === 'string') {
    const normalized = inputLocale.trim();
    if (SUPPORTED_LOCALES.includes(normalized)) {
      return normalized;
    }
  }

  return resolveLocaleFromTimezone(timezone);
}

function resolveLanguageName(locale) {
  if (locale === 'pt-BR') {
    return 'Portuguese';
  }
  if (locale === 'es-ES') {
    return 'Spanish';
  }
  return 'English';
}

function localizeSessionLabel(label, locale = 'en-US') {
  if (!label) {
    return label;
  }

  const exact = SESSION_LABELS[label]?.[locale];
  if (exact) {
    return exact;
  }

  const reopenPrefix = 'Reabertura da semana - ';
  if (label.startsWith(reopenPrefix)) {
    const tail = label.slice(reopenPrefix.length);
    const translatedTail = localizeSessionLabel(tail, locale);
    if (locale === 'pt-BR') {
      return `${reopenPrefix}${translatedTail}`;
    }
    if (locale === 'es-ES') {
      return `Reapertura semanal - ${translatedTail}`;
    }
    return `Weekly reopen - ${translatedTail}`;
  }

  return label;
}

function formatIsoInTimezone(iso, timezone, format = 'dd/LL HH:mm', locale = 'en-US') {
  if (!iso) {
    return null;
  }
  return DateTime.fromISO(iso, { setZone: true })
    .setZone(timezone || 'UTC')
    .setLocale(LOCALE_BY_LANGUAGE[locale] || 'en-US')
    .toFormat(format);
}

module.exports = {
  SUPPORTED_LOCALES,
  resolveLocale,
  resolveLocaleFromTimezone,
  resolveLanguageName,
  localizeSessionLabel,
  formatIsoInTimezone
};
