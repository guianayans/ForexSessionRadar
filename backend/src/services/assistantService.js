const { DateTime } = require('luxon');
const { formatIsoInTimezone, localizeSessionLabel, resolveLocale } = require('../utils/locale');

const MESSAGES = {
  'pt-BR': {
    emptyQuestion: 'Nao recebi sua pergunta. Pode reformular em uma frase curta?',
    marketClosed:
      'O mercado Forex esta fechado no intervalo de fim de semana. Proxima abertura global: {nextOpen}. Use este periodo para revisar niveis, calendario economico e plano operacional.',
    recommended:
      '{asset} esta em boa janela agora ({now}) na {session}. Priorize entrada com setup claro, sem perseguir movimento esticado.',
    neutral:
      '{asset} esta neutro neste horario ({now}). So vale insistir se houver confirmacao tecnica limpa e risco controlado.',
    avoid:
      '{asset} nao esta favoravel agora ({now}) para day trade. Melhor realocar foco para ativos da sessao atual.',
    worthNow:
      'No horario atual ({now}), {session} esta ativa com {volatility}. Se for operar, escolha ativos em janela favoravel e evite overtrading.',
    bestAssets:
      'Agora ({now}), os melhores candidatos sao {assets}. Foque em 1 ou 2 ativos para manter execucao disciplinada.',
    avoidList:
      'Neste momento, evite: {assets}. Esses ativos tendem a ter pior relacao entre clareza de setup e risco neste horario.',
    sessionInfo:
      'Estamos em {session}, com {volatility}. Se quiser, eu te digo o melhor ativo para forex, indice ou ouro agora.',
    fallback:
      'Entendi seu ponto. Posso te responder de forma objetiva sobre ativo especifico, qualidade do horario atual, ou o que evitar nesta sessao.',
    none: 'indisponivel',
    unknownSession: 'Sessao atual'
  },
  'en-US': {
    emptyQuestion: 'I did not receive your question. Can you rephrase it in one short sentence?',
    marketClosed:
      'Forex market is closed for the weekend interval. Next global opening: {nextOpen}. Use this period to review levels, economic calendar and execution plan.',
    recommended:
      '{asset} is in a favorable window now ({now}) during {session}. Prioritize clear setups and avoid chasing stretched moves.',
    neutral:
      '{asset} is neutral at this time ({now}). It only makes sense with clean technical confirmation and controlled risk.',
    avoid:
      '{asset} is not favorable now ({now}) for day trading. Better rotate focus to assets aligned with the current session.',
    worthNow:
      'At the current time ({now}), {session} is active with {volatility} conditions. If you trade now, choose assets in favorable windows and avoid overtrading.',
    bestAssets:
      'Right now ({now}), top candidates are {assets}. Focus on 1 or 2 assets to keep disciplined execution.',
    avoidList:
      'At this moment, avoid: {assets}. These assets tend to offer weaker setup clarity versus risk in this time window.',
    sessionInfo:
      'We are in {session}, with {volatility} conditions. If you want, I can suggest the best asset for forex, index or gold right now.',
    fallback:
      'Understood. I can give an objective answer about a specific asset, the quality of the current time window, or what to avoid in this session.',
    none: 'none',
    unknownSession: 'Current session'
  },
  'es-ES': {
    emptyQuestion: 'No recibi tu pregunta. Puedes reformularla en una frase corta?',
    marketClosed:
      'El mercado Forex esta cerrado por el intervalo de fin de semana. Proxima apertura global: {nextOpen}. Usa este periodo para revisar niveles, calendario economico y plan operativo.',
    recommended:
      '{asset} esta en una ventana favorable ahora ({now}) durante {session}. Prioriza setups claros y evita perseguir movimientos estirados.',
    neutral:
      '{asset} esta neutral en este horario ({now}). Solo conviene con confirmacion tecnica limpia y riesgo controlado.',
    avoid:
      '{asset} no esta favorable ahora ({now}) para day trading. Mejor mover el foco a activos alineados con la sesion actual.',
    worthNow:
      'En el horario actual ({now}), {session} esta activa con {volatility}. Si operas ahora, elige activos en ventana favorable y evita overtrading.',
    bestAssets:
      'Ahora ({now}), los mejores candidatos son {assets}. Enfocate en 1 o 2 activos para mantener disciplina de ejecucion.',
    avoidList:
      'En este momento, evita: {assets}. Estos activos tienden a tener peor relacion entre claridad de setup y riesgo en esta franja.',
    sessionInfo:
      'Estamos en {session}, con {volatility}. Si quieres, te digo el mejor activo para forex, indice u oro ahora.',
    fallback:
      'Entendido. Puedo responder de forma objetiva sobre un activo especifico, la calidad del horario actual o que evitar en esta sesion.',
    none: 'sin datos',
    unknownSession: 'Sesion actual'
  }
};

function template(locale, key, params = {}) {
  const source = MESSAGES[locale] || MESSAGES['en-US'];
  const base = source[key] || MESSAGES['en-US'][key] || key;
  return base.replace(/\{(\w+)\}/g, (_, token) => String(params[token] ?? ''));
}

function contains(text, terms) {
  const normalized = text.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function classifyAsset(asset, radar) {
  if (radar.recommended.includes(asset)) {
    return 'recommended';
  }
  if (radar.neutral.includes(asset)) {
    return 'neutral';
  }
  if (radar.avoid.includes(asset)) {
    return 'avoid';
  }
  return 'unknown';
}

function detectAssetFromQuestion(question, radar) {
  const q = question.toLowerCase();
  const mappedAliases = {
    ouro: 'XAUUSD',
    xau: 'XAUUSD',
    gold: 'XAUUSD',
    nasdaq: 'US100',
    us100: 'US100',
    sp500: 'US500',
    's&p500': 'US500',
    us500: 'US500'
  };

  const allAssets = [...radar.recommended, ...radar.neutral, ...radar.avoid];

  for (const asset of allAssets) {
    if (q.includes(asset.toLowerCase())) {
      return asset;
    }
  }

  for (const [alias, asset] of Object.entries(mappedAliases)) {
    if (q.includes(alias) && allAssets.includes(asset)) {
      return asset;
    }
  }

  return null;
}

function answerQuestionByRules(question, dashboard, localeOverride) {
  const q = (question || '').trim().toLowerCase();
  const locale = resolveLocale(localeOverride, dashboard?.baseTimezone);
  const timezone = dashboard?.baseTimezone || 'UTC';
  const radar = dashboard?.radar || { recommended: [], neutral: [], avoid: [] };
  const now = DateTime.fromISO(dashboard?.nowIso, { setZone: true }).setZone(timezone).toFormat('HH:mm');
  const marketClosed = Boolean(dashboard?.marketState && !dashboard.marketState.isOpen);
  const currentSession = localizeSessionLabel(
    dashboard?.currentSession?.label || template(locale, 'unknownSession'),
    locale
  );
  const volatility = dashboard?.currentSession?.volatility || template(locale, 'none');

  if (!q) {
    return {
      answer: template(locale, 'emptyQuestion'),
      confidence: 'low'
    };
  }

  if (marketClosed) {
    const nextOpen = dashboard?.marketState?.nextGlobalOpenIso
      ? formatIsoInTimezone(dashboard.marketState.nextGlobalOpenIso, timezone, 'dd/LL HH:mm', locale)
      : template(locale, 'none');

    return {
      answer: template(locale, 'marketClosed', { nextOpen }),
      confidence: 'high'
    };
  }

  const detectedAsset = detectAssetFromQuestion(q, radar);
  if (detectedAsset) {
    const status = classifyAsset(detectedAsset, radar);

    if (status === 'recommended') {
      return {
        answer: template(locale, 'recommended', { asset: detectedAsset, now, session: currentSession }),
        confidence: 'high'
      };
    }

    if (status === 'neutral') {
      return {
        answer: template(locale, 'neutral', { asset: detectedAsset, now }),
        confidence: 'medium'
      };
    }

    if (status === 'avoid') {
      return {
        answer: template(locale, 'avoid', { asset: detectedAsset, now }),
        confidence: 'high'
      };
    }
  }

  if (contains(q, ['vale a pena operar', 'devo operar agora', 'bom operar agora', 'worth it now', 'vale la pena'])) {
    return {
      answer: template(locale, 'worthNow', { now, session: currentSession, volatility }),
      confidence: 'high'
    };
  }

  if (contains(q, ['melhor ativo', 'qual ativo', 'recomenda', 'operar agora', 'best asset', 'mejor activo', 'cual activo', 'que activo'])) {
    const topAssets = radar.recommended.slice(0, 3).join(', ') || template(locale, 'none');
    return {
      answer: template(locale, 'bestAssets', { now, assets: topAssets }),
      confidence: 'high'
    };
  }

  if (contains(q, ['evitar', 'o que evitar', 'quais pares evitar', 'avoid now', 'evitar ahora', 'que evitar'])) {
    const avoidAssets = radar.avoid.join(', ') || template(locale, 'none');
    return {
      answer: template(locale, 'avoidList', { assets: avoidAssets }),
      confidence: 'high'
    };
  }

  if (contains(q, ['sessao', 'janela', 'liquidez', 'volatilidade', 'session', 'liquidity', 'volatility', 'sesion', 'ventana'])) {
    return {
      answer: template(locale, 'sessionInfo', { session: currentSession, volatility }),
      confidence: 'high'
    };
  }

  return {
    answer: template(locale, 'fallback'),
    confidence: 'medium'
  };
}

module.exports = {
  answerQuestionByRules
};
