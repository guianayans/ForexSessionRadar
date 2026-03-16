const { DateTime } = require('luxon');

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MAX_HISTORY_MESSAGES = 10;

const TEMPLATE_SECTION_KEYWORDS = [
  /sess[aã]o atual/i,
  /contexto de liquidez/i,
  /ativos? (mais )?adequad/i,
  /aviso de risco/i,
  /dica pr[aá]tica/i
];

const LIST_NUMBERING_PATTERN = /(?:^|\n)\s*[1-5][\)\.\-:]\s+/i;
const CLOSING_FILLER_PATTERN = /se precisar.*(?:a disposi[cç][aã]o|à disposição).*/i;

const SYSTEM_PROMPT = `
ROLE

Voce e um analista profissional de mercado especializado em timing operacional para Forex, indices e ouro.
Seu trabalho e orientar o trader com base em contexto de sessao, liquidez, volatilidade e disciplina.

LIMITES

- Nao prever preco.
- Nao dar sinal de compra/venda.
- Nao prometer lucro.

ESTILO

- Fale em portugues do Brasil.
- Tom profissional, humano e direto.
- Responda exatamente o que o usuario perguntou agora.
- Mantenha continuidade com a conversa recente.
- Em geral, use 2 a 6 frases.

REGRA CRITICA DE FORMATO

- Nao use template fixo numerado (1, 2, 3, 4, 5).
- Nao repita sempre os mesmos blocos (sessao, liquidez, ativos, risco, dica) se o usuario nao pediu isso.
- So use lista quando o usuario pedir explicitamente.
- Nao finalize com frase padrao do tipo "se precisar, estou a disposicao".

CONHECIMENTO OPERACIONAL BASE

- Sessao Asiatica: liquidez baixa a moderada, foco maior em JPY/AUD/NZD/JP225/HK50.
- Sessao Europeia: liquidez alta, costuma acelerar EURUSD/GBPUSD/DAX/Ouro.
- Sessao Americana: liquidez muito alta, destaque para US100/US500/EURUSD/XAUUSD/DXY.
- Sobreposicao Londres + Nova York costuma concentrar maior fluxo intraday.

COMPORTAMENTO

- Se a pergunta for objetiva, responda objetivo.
- Se o usuario fizer follow-up, continue a linha de raciocinio sem reiniciar explicacao do zero.
- Se faltar contexto para afirmar algo, diga isso de forma curta.
`;

function formatDuration(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
  }

  return `${minutes}m`;
}

function translateSessionLabel(label) {
  if (!label) {
    return 'Unknown';
  }

  const normalized = label.toLowerCase();
  if (normalized.includes('asiat')) {
    return 'Asian';
  }
  if (normalized.includes('europe')) {
    return 'European';
  }
  if (normalized.includes('america')) {
    return 'American';
  }
  if (normalized.includes('ouro') || normalized.includes('gold')) {
    return 'London + New York Overlap';
  }

  return label;
}

function buildMarketContext(dashboard) {
  const now = DateTime.fromISO(dashboard.nowIso);
  const currentTime = now.toFormat('HH:mm');
  const currentSession = translateSessionLabel(dashboard.currentSession?.label);

  let nextSession = 'None';
  if (dashboard.nextSession?.startIso) {
    const nextStart = DateTime.fromISO(dashboard.nextSession.startIso);
    const diffSeconds = Math.floor((nextStart.toMillis() - now.toMillis()) / 1000);
    nextSession = `${translateSessionLabel(dashboard.nextSession.label)} in ${formatDuration(diffSeconds)}`;
  }

  let overlap = 'None';
  const overlapWindow = dashboard.timeline?.overlap;
  if (overlapWindow?.isActive) {
    overlap = `Active (${overlapWindow.startLabel}-${overlapWindow.endLabel})`;
  } else if (overlapWindow?.startIso) {
    const overlapStart = DateTime.fromISO(overlapWindow.startIso);
    const diffSeconds = Math.floor((overlapStart.toMillis() - now.toMillis()) / 1000);
    if (diffSeconds > 0) {
      overlap = `Starts in ${formatDuration(diffSeconds)} (${overlapWindow.startLabel})`;
    }
  }

  return [
    'Market Context:',
    '',
    `Current Time: ${currentTime}`,
    `Session: ${currentSession}`,
    `Next Session: ${nextSession}`,
    `Overlap: ${overlap}`,
    '',
    'Recommended Assets:',
    ...(dashboard.radar?.recommended?.length ? dashboard.radar.recommended : ['None']),
    '',
    'Avoid Assets:',
    ...(dashboard.radar?.avoid?.length ? dashboard.radar.avoid : ['None'])
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
    'resuma em itens'
  ];

  return structureTerms.some((term) => normalized.includes(term));
}

function flattenTemplateResponse(text) {
  const lines = text
    .split(/\n+/)
    .map((line) =>
      line
        .replace(/^\s*[1-9][\)\.\-:]\s*/g, '')
        .replace(/^(sess[aã]o atual|contexto de liquidez|ativos? (mais )?adequados?|aviso de risco|dica pr[aá]tica)\s*:\s*/i, '')
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

      // Evita realimentar o modelo com respostas antigas no formato rigido.
      if (role === 'assistant' && isRigidTemplateResponse(text)) {
        return null;
      }

      return { role, content: text };
    })
    .filter(Boolean);
}

function buildMessages(question, dashboard, history) {
  const marketContext = buildMarketContext(dashboard);
  const normalizedHistory = normalizeHistory(history);

  return [
    {
      role: 'system',
      content: SYSTEM_PROMPT
    },
    {
      role: 'system',
      content: `Contexto dinamico do app (considere sempre antes de responder):\n\n${marketContext}`
    },
    ...normalizedHistory,
    {
      role: 'user',
      content: `Pergunta atual do trader: ${question}`
    }
  ];
}

async function askOpenAI(question, dashboard, apiKeyOverride, history = []) {
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
        messages: buildMessages(question, dashboard, history)
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
