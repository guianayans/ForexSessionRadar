const { DateTime } = require('luxon');
const { localizeSessionLabel, resolveLanguageName, resolveLocale } = require('../utils/locale');

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MAX_HISTORY_MESSAGES = 10;

const TEMPLATE_SECTION_KEYWORDS = [
  /current session|sess[aã]o atual|sesion actual/i,
  /liquidity context|contexto de liquidez|contexto de liquidez/i,
  /best assets|ativos? (mais )?adequad|activos? recomendad/i,
  /risk warning|aviso de risco|aviso de riesgo/i
];

const LIST_NUMBERING_PATTERN = /(?:^|\n)\s*[1-9][\)\.\-:]\s+/i;
const CLOSING_FILLER_PATTERN = /(?:se precisar|if you need|si necesitas).*(?:a disposi[cç][aã]o|available|disponible).*/i;

const DICTIONARY = {
  'pt-BR': {
    none: 'Nenhum',
    unknown: 'desconhecido',
    marketContextTitle: 'Contexto de Mercado',
    currentTime: 'Horario atual',
    timezone: 'Fuso ativo',
    marketStatus: 'Status do mercado',
    marketMode: 'Modo de mercado',
    session: 'Sessao',
    nextSession: 'Proxima sessao',
    nextGlobalOpen: 'Proxima abertura global',
    nextGlobalClose: 'Proximo fechamento global',
    overlap: 'Overlap',
    overlapActive: 'Ativo ({range})',
    overlapStarts: 'Inicia em {duration} ({time})',
    recommendedAssets: 'Ativos recomendados',
    avoidAssets: 'Ativos para evitar',
    closedRules: 'Regras com mercado fechado',
    closedRuleOne: '- Mercado fechado: nao mencionar sessoes ativas ou execucao ao vivo.',
    closedRuleTwo: '- Foque em revisao, planejamento e preparacao para a reabertura.',
    questionLabel: 'Pergunta atual do trader',
    dynamicContextLabel: 'Contexto dinamico do app (considere sempre antes de responder)'
  },
  'en-US': {
    none: 'None',
    unknown: 'unknown',
    marketContextTitle: 'Market Context',
    currentTime: 'Current time',
    timezone: 'Active timezone',
    marketStatus: 'Market status',
    marketMode: 'Market mode',
    session: 'Session',
    nextSession: 'Next session',
    nextGlobalOpen: 'Next global open',
    nextGlobalClose: 'Next global close',
    overlap: 'Overlap',
    overlapActive: 'Active ({range})',
    overlapStarts: 'Starts in {duration} ({time})',
    recommendedAssets: 'Recommended assets',
    avoidAssets: 'Assets to avoid',
    closedRules: 'Closed-market rules',
    closedRuleOne: '- Market is closed now: do not mention active sessions or live execution.',
    closedRuleTwo: '- Focus on review, planning and preparation for reopening.',
    questionLabel: 'Current trader question',
    dynamicContextLabel: 'Dynamic app context (always consider this before answering)'
  },
  'es-ES': {
    none: 'Ninguno',
    unknown: 'desconocido',
    marketContextTitle: 'Contexto de Mercado',
    currentTime: 'Horario actual',
    timezone: 'Zona horaria activa',
    marketStatus: 'Estado del mercado',
    marketMode: 'Modo de mercado',
    session: 'Sesion',
    nextSession: 'Proxima sesion',
    nextGlobalOpen: 'Proxima apertura global',
    nextGlobalClose: 'Proximo cierre global',
    overlap: 'Overlap',
    overlapActive: 'Activo ({range})',
    overlapStarts: 'Comienza en {duration} ({time})',
    recommendedAssets: 'Activos recomendados',
    avoidAssets: 'Activos a evitar',
    closedRules: 'Reglas con mercado cerrado',
    closedRuleOne: '- Mercado cerrado: no mencionar sesiones activas ni ejecucion en vivo.',
    closedRuleTwo: '- Enfocarse en revision, planificacion y preparacion para la reapertura.',
    questionLabel: 'Pregunta actual del trader',
    dynamicContextLabel: 'Contexto dinamico de la app (consideralo siempre antes de responder)'
  }
};

function translate(locale, key, params = {}) {
  const source = DICTIONARY[locale] || DICTIONARY['en-US'];
  const template = source[key] || DICTIONARY['en-US'][key] || key;
  return template.replace(/\{(\w+)\}/g, (_, token) => String(params[token] ?? ''));
}

function buildSystemPrompt(locale, timezone) {
  const languageName = resolveLanguageName(locale);
  return `
You are a professional market-timing assistant focused on Forex, indices and gold.

Core behavior:
- Be concise, clear and operational.
- Do not provide buy/sell signals or price predictions.
- Prioritize session timing, liquidity, volatility and risk discipline.
- If market is closed, do not suggest live execution.

Critical localization rules:
- ALWAYS answer in ${languageName}.
- ALWAYS interpret and express times using timezone: ${timezone}.
- NEVER assume Brasilia time unless timezone is explicitly America/Sao_Paulo.
- If user timezone changes, context time references must follow the new timezone.
`;
}

function formatDuration(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
  }

  return `${minutes}m`;
}

function translateSessionLabel(label, locale) {
  return localizeSessionLabel(label || '', locale) || translate(locale, 'none');
}

function buildMarketContext(dashboard, locale) {
  const timezone = dashboard?.baseTimezone || 'UTC';
  const now = DateTime.fromISO(dashboard?.nowIso, { setZone: true }).setZone(timezone);
  const marketState = dashboard?.marketState || {};

  const currentTime = now.toFormat('HH:mm');
  const currentSession = translateSessionLabel(dashboard?.currentSession?.label, locale);

  let nextSession = translate(locale, 'none');
  if (dashboard?.nextSession?.startIso) {
    const nextStart = DateTime.fromISO(dashboard.nextSession.startIso, { setZone: true }).setZone(timezone);
    const diffSeconds = Math.floor((nextStart.toMillis() - now.toMillis()) / 1000);
    nextSession = `${translateSessionLabel(dashboard.nextSession.label, locale)} in ${formatDuration(diffSeconds)} (${nextStart.toFormat(
      'dd/LL HH:mm'
    )})`;
  }

  let nextGlobalOpen = translate(locale, 'none');
  if (marketState.nextGlobalOpenIso) {
    const nextOpen = DateTime.fromISO(marketState.nextGlobalOpenIso, { setZone: true }).setZone(timezone);
    const diffSeconds = Math.floor((nextOpen.toMillis() - now.toMillis()) / 1000);
    nextGlobalOpen = `in ${formatDuration(diffSeconds)} (${nextOpen.toFormat('dd/LL HH:mm')})`;
  }

  let nextGlobalClose = translate(locale, 'none');
  if (marketState.nextGlobalCloseIso) {
    const nextClose = DateTime.fromISO(marketState.nextGlobalCloseIso, { setZone: true }).setZone(timezone);
    const diffSeconds = Math.floor((nextClose.toMillis() - now.toMillis()) / 1000);
    nextGlobalClose = `in ${formatDuration(diffSeconds)} (${nextClose.toFormat('dd/LL HH:mm')})`;
  }

  let overlap = translate(locale, 'none');
  const overlapWindow = dashboard?.timeline?.overlap;
  if (overlapWindow?.isActive) {
    const range = `${overlapWindow.startLabel}-${overlapWindow.endLabel}`;
    overlap = translate(locale, 'overlapActive', { range });
  } else if (overlapWindow?.startIso) {
    const overlapStart = DateTime.fromISO(overlapWindow.startIso, { setZone: true }).setZone(timezone);
    const diffSeconds = Math.floor((overlapStart.toMillis() - now.toMillis()) / 1000);
    if (diffSeconds > 0) {
      overlap = translate(locale, 'overlapStarts', {
        duration: formatDuration(diffSeconds),
        time: overlapStart.toFormat('dd/LL HH:mm')
      });
    }
  }

  const closedMarketRules = !marketState.isOpen
    ? ['', `${translate(locale, 'closedRules')}:`, translate(locale, 'closedRuleOne'), translate(locale, 'closedRuleTwo')]
    : [];

  return [
    `${translate(locale, 'marketContextTitle')}:`,
    '',
    `${translate(locale, 'currentTime')}: ${currentTime}`,
    `${translate(locale, 'timezone')}: ${timezone}`,
    `${translate(locale, 'marketStatus')}: ${marketState.statusLabel || (marketState.isOpen ? 'Open' : 'Closed')}`,
    `${translate(locale, 'marketMode')}: ${marketState.mode || translate(locale, 'unknown')}`,
    `${translate(locale, 'session')}: ${currentSession}`,
    `${translate(locale, 'nextSession')}: ${nextSession}`,
    `${translate(locale, 'nextGlobalOpen')}: ${nextGlobalOpen}`,
    `${translate(locale, 'nextGlobalClose')}: ${nextGlobalClose}`,
    `${translate(locale, 'overlap')}: ${overlap}`,
    ...closedMarketRules,
    '',
    `${translate(locale, 'recommendedAssets')}:`,
    ...(dashboard?.radar?.recommended?.length ? dashboard.radar.recommended : [translate(locale, 'none')]),
    '',
    `${translate(locale, 'avoidAssets')}:`,
    ...(dashboard?.radar?.avoid?.length ? dashboard.radar.avoid : [translate(locale, 'none')])
  ].join('\n');
}

function isRigidTemplateResponse(text) {
  if (!text) {
    return false;
  }

  const hasListNumbering = LIST_NUMBERING_PATTERN.test(text);
  const matchedKeywords = TEMPLATE_SECTION_KEYWORDS.filter((pattern) => pattern.test(text)).length;
  return hasListNumbering && matchedKeywords >= 3;
}

function userRequestedStructuredAnswer(question) {
  const normalized = (question || '').toLowerCase();
  const structureTerms = [
    'lista',
    'liste',
    'enumere',
    'top',
    'itens',
    'bullet',
    'passo a passo',
    '5 pontos',
    'resuma em itens',
    'step by step',
    'list',
    'paso a paso'
  ];

  return structureTerms.some((term) => normalized.includes(term));
}

function flattenTemplateResponse(text) {
  const lines = text
    .split(/\n+/)
    .map((line) =>
      line
        .replace(/^\s*[1-9][\)\.\-:]\s*/g, '')
        .replace(
          /^(current session|sess[aã]o atual|sesion actual|liquidity context|contexto de liquidez|best assets|ativos? (mais )?adequados?|activos? recomendados?|risk warning|aviso de risco|aviso de riesgo)\s*:\s*/i,
          ''
        )
        .trim()
    )
    .filter(Boolean);

  return lines
    .filter((line) => !CLOSING_FILLER_PATTERN.test(line))
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function sanitizeOpenAIText(question, text) {
  if (!text) {
    return text;
  }

  let cleaned = text.trim().replace(CLOSING_FILLER_PATTERN, '').trim();

  if (isRigidTemplateResponse(cleaned) && !userRequestedStructuredAnswer(question)) {
    cleaned = flattenTemplateResponse(cleaned);
  }

  if (!cleaned) {
    return text;
  }

  return cleaned;
}

function normalizeHistory(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return [];
  }

  return history
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => {
      const role = message?.role === 'assistant' ? 'assistant' : 'user';
      const text = typeof message?.text === 'string' ? message.text.trim() : '';
      if (!text) {
        return null;
      }

      if (role === 'assistant' && isRigidTemplateResponse(text)) {
        return null;
      }

      return { role, content: text };
    })
    .filter(Boolean);
}

function buildMessages(question, dashboard, history, localeOverride) {
  const locale = resolveLocale(localeOverride, dashboard?.baseTimezone);
  const timezone = dashboard?.baseTimezone || 'UTC';
  const marketContext = buildMarketContext(dashboard, locale);
  const normalizedHistory = normalizeHistory(history);

  return [
    {
      role: 'system',
      content: buildSystemPrompt(locale, timezone)
    },
    {
      role: 'system',
      content: `${translate(locale, 'dynamicContextLabel')}:\n\n${marketContext}`
    },
    ...normalizedHistory,
    {
      role: 'user',
      content: `${translate(locale, 'questionLabel')}: ${question}`
    }
  ];
}

async function askOpenAI(question, dashboard, apiKeyOverride, history = [], localeOverride) {
  const apiKey = apiKeyOverride || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        temperature: 0.25,
        frequency_penalty: 0.4,
        messages: buildMessages(question, dashboard, history, localeOverride)
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI ${response.status}: ${errorText}`);
    }

    const payload = await response.json();
    const rawText = payload?.choices?.[0]?.message?.content?.trim();
    const text = sanitizeOpenAIText(question, rawText);

    if (!text) {
      throw new Error('Resposta vazia da OpenAI.');
    }

    return {
      answer: text,
      confidence: 'high',
      provider: 'openai'
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = {
  askOpenAI
};
