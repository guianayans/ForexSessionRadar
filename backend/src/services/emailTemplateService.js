const { DateTime } = require('luxon');

const DEFAULT_CTA_URL = 'http://yanserver.ddns.net:4783';

const PHASE_MAP_BY_SESSION = {
  new_york: [
    { name: 'Abertura', untilPercent: 0.15, behavior: 'Rompimentos iniciais e ajuste de preco', liquidity: 'Alta' },
    { name: 'Expansao', untilPercent: 0.35, behavior: 'Expansao de volatilidade e continuidade', liquidity: 'Muito alta' },
    { name: 'Meio do Dia', untilPercent: 0.6, behavior: 'Consolidacao e seletividade maior', liquidity: 'Moderada' },
    { name: 'Movimento da Tarde', untilPercent: 0.85, behavior: 'Continuacao moderada ou reversoes', liquidity: 'Moderada' },
    { name: 'Encerramento', untilPercent: 1, behavior: 'Desaceleracao e ajuste final', liquidity: 'Baixa a moderada' }
  ],
  london: [
    { name: 'Abertura Europeia', untilPercent: 0.2, behavior: 'Rompimentos iniciais da sessao', liquidity: 'Alta' },
    { name: 'Expansao Inicial', untilPercent: 0.45, behavior: 'Expansao do range asiatico', liquidity: 'Alta' },
    { name: 'Continuacao', untilPercent: 0.7, behavior: 'Fluxo direcional com pullbacks', liquidity: 'Moderada a alta' },
    { name: 'Pre-Sobreposicao', untilPercent: 0.88, behavior: 'Ajustes e preparacao para NY', liquidity: 'Moderada' },
    { name: 'Sobreposicao com Nova York', untilPercent: 1, behavior: 'Movimentos mais fortes e liquidos', liquidity: 'Muito alta' }
  ],
  tokyo: [
    { name: 'Abertura Asiatica', untilPercent: 0.2, behavior: 'Ajustes iniciais e formacao de faixa', liquidity: 'Moderada' },
    { name: 'Consolidacao', untilPercent: 0.55, behavior: 'Range com respeito a niveis tecnicos', liquidity: 'Baixa a moderada' },
    { name: 'Desenvolvimento', untilPercent: 0.82, behavior: 'Movimentos direcionais pontuais', liquidity: 'Moderada' },
    { name: 'Final da Sessao', untilPercent: 1, behavior: 'Desaceleracao e transicao de fluxo', liquidity: 'Baixa' }
  ],
  sydney: [
    { name: 'Abertura de Sydney', untilPercent: 0.2, behavior: 'Ajustes iniciais e precificacao de risco', liquidity: 'Moderada' },
    { name: 'Formacao de Faixa', untilPercent: 0.5, behavior: 'Consolidacao com movimentos tecnicos curtos', liquidity: 'Baixa a moderada' },
    { name: 'Desenvolvimento', untilPercent: 0.8, behavior: 'Movimentos direcionais mais limpos em pares AUD/NZD', liquidity: 'Moderada' },
    { name: 'Transicao para Asia', untilPercent: 1, behavior: 'Preparacao para fluxo de Toquio', liquidity: 'Baixa' }
  ],
  gold: [
    { name: 'Inicio da Janela', untilPercent: 0.5, behavior: 'Aceleracao institucional', liquidity: 'Muito alta' },
    { name: 'Final da Janela', untilPercent: 1, behavior: 'Movimentos estendidos e ajuste', liquidity: 'Alta' }
  ]
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateTime(iso, timezone = 'UTC') {
  const dt = iso ? DateTime.fromISO(iso, { setZone: true }) : DateTime.now();
  const safe = dt.isValid ? dt.setZone(timezone) : DateTime.now().setZone(timezone);
  return safe.toFormat('dd/LL/yyyy HH:mm:ss');
}

function resolveOperationalMessage(triggerType) {
  switch (triggerType) {
    case 'session_open':
      return 'Sessao iniciando. Fique atento aos primeiros rompimentos e expansao de range.';
    case 'session_close':
      return 'Sessao entrando em encerramento. Ajuste exposicao e gerenciamento de risco.';
    case 'overlap_start':
      return 'Inicio de sobreposicao entre sessoes. Periodo de maior liquidez e volatilidade.';
    case 'ideal_window_end':
      return 'Janela ideal se aproximando do fim. Priorize setups de maior qualidade.';
    case 'weekly_open':
      return 'Mercado reabrindo para uma nova semana operacional.';
    case 'weekly_close':
      return 'Mercado em fechamento semanal. Evite novas exposicoes sem necessidade.';
    default:
      return 'Alerta operacional acionado pelo radar.';
  }
}

function getPhaseMapForSession(sessionId) {
  return PHASE_MAP_BY_SESSION[sessionId] || PHASE_MAP_BY_SESSION.gold;
}

function computeSessionPhaseSnapshot(dashboard) {
  const marketState = dashboard?.marketState || null;
  const session = dashboard?.currentSession || null;

  if (!marketState?.isOpen || !session || session.id === 'closed') {
    return {
      currentPhase: marketState?.contextLabel || 'Monitoramento',
      expectedBehavior: 'Sem sessao ativa no momento.',
      expectedLiquidity: session?.volatility || 'Moderada'
    };
  }

  if (!session.startIso || !session.endIso) {
    return {
      currentPhase: marketState?.contextLabel || 'Monitoramento',
      expectedBehavior: 'Sessao ativa sem janela temporal completa para calculo de fase.',
      expectedLiquidity: session.volatility || 'Moderada'
    };
  }

  const start = DateTime.fromISO(session.startIso, { setZone: true });
  const end = DateTime.fromISO(session.endIso, { setZone: true });
  const now = DateTime.fromISO(dashboard.nowIso, { setZone: true });

  if (!start.isValid || !end.isValid || !now.isValid || end <= start) {
    return {
      currentPhase: marketState?.contextLabel || 'Monitoramento',
      expectedBehavior: 'Nao foi possivel calcular a fase ativa com seguranca.',
      expectedLiquidity: session.volatility || 'Moderada'
    };
  }

  const durationSeconds = Math.max(1, Math.floor(end.diff(start, 'seconds').seconds));
  const elapsedSeconds = Math.max(0, Math.floor(now.diff(start, 'seconds').seconds));
  const progress = Math.min(1, elapsedSeconds / durationSeconds);
  const phases = getPhaseMapForSession(session.id);
  const activePhase = phases.find((phase) => progress <= phase.untilPercent) || phases[phases.length - 1];

  return {
    currentPhase: activePhase.name,
    expectedBehavior: activePhase.behavior,
    expectedLiquidity: activePhase.liquidity
  };
}

function renderOperationalHtml({
  alertTitle,
  alertMessage,
  sessionName,
  alertTime,
  liquidityLevel,
  sessionPhase,
  expectedBehavior,
  highlightAssets,
  insightText,
  sentAt,
  timezoneLabel,
  ctaUrl,
  timelineImageCid,
  timelineImageCapturedAt
}) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Alerta - Forex Session Radar</title>
</head>
<body style="margin:0; padding:0; background-color:#061326; font-family:Arial, Helvetica, sans-serif; color:#e8eefc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#061326; margin:0; padding:0;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px; background:linear-gradient(180deg,#091a33 0%, #071427 100%); border:1px solid #18304f; border-radius:16px; overflow:hidden;">
          <tr>
            <td style="padding:24px 28px; border-bottom:1px solid #16304f; background:linear-gradient(90deg,#0a1c38 0%, #0b2450 60%, #2b1a12 100%);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <div style="font-size:28px; font-weight:700; color:#f5f8ff; line-height:1.2;">
                      Forex Session Radar
                    </div>
                    <div style="font-size:13px; color:#99a9c7; padding-top:6px;">
                      Painel operacional local para Forex, indices e ouro
                    </div>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <div style="display:inline-block; padding:8px 12px; border:1px solid #2b4668; border-radius:999px; font-size:12px; font-weight:700; color:#0dd3ff; background-color:#0b1a2f;">
                      ALERTA OPERACIONAL
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 18px 28px;">
              <div style="font-size:14px; color:#8fa5c8; margin-bottom:8px;">
                Notificacao automatica do seu radar
              </div>
              <div style="font-size:30px; line-height:1.2; font-weight:700; color:#ffffff; margin-bottom:10px;">
                ${escapeHtml(alertTitle)}
              </div>
              <div style="font-size:16px; line-height:1.6; color:#c7d5ee;">
                ${escapeHtml(alertMessage)}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 0 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate; border-spacing:0 12px;">
                <tr>
                  <td width="50%" style="padding-right:6px;">
                    <div style="background-color:#09182d; border:1px solid #18304f; border-radius:12px; padding:14px 16px;">
                      <div style="font-size:12px; color:#8aa0c1; margin-bottom:6px;">Sessao</div>
                      <div style="font-size:18px; font-weight:700; color:#ffffff;">${escapeHtml(sessionName)}</div>
                    </div>
                  </td>
                  <td width="50%" style="padding-left:6px;">
                    <div style="background-color:#09182d; border:1px solid #18304f; border-radius:12px; padding:14px 16px;">
                      <div style="font-size:12px; color:#8aa0c1; margin-bottom:6px;">Horario</div>
                      <div style="font-size:18px; font-weight:700; color:#ffffff;">${escapeHtml(alertTime)}</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding-right:6px;">
                    <div style="background-color:#09182d; border:1px solid #18304f; border-radius:12px; padding:14px 16px;">
                      <div style="font-size:12px; color:#8aa0c1; margin-bottom:6px;">Liquidez Esperada</div>
                      <div style="font-size:18px; font-weight:700; color:#ffcf54;">${escapeHtml(liquidityLevel)}</div>
                    </div>
                  </td>
                  <td width="50%" style="padding-left:6px;">
                    <div style="background-color:#09182d; border:1px solid #18304f; border-radius:12px; padding:14px 16px;">
                      <div style="font-size:12px; color:#8aa0c1; margin-bottom:6px;">Fase / Contexto</div>
                      <div style="font-size:18px; font-weight:700; color:#0dd3ff;">${escapeHtml(sessionPhase)}</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td width="100%" colspan="2">
                    <div style="background-color:#09182d; border:1px solid #18304f; border-radius:12px; padding:14px 16px;">
                      <div style="font-size:12px; color:#8aa0c1; margin-bottom:6px;">Comportamento Esperado</div>
                      <div style="font-size:16px; font-weight:700; color:#ffffff;">${escapeHtml(expectedBehavior)}</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 28px 0 28px;">
              <div style="background-color:#09182d; border:1px solid #18304f; border-radius:12px; padding:18px 18px 14px 18px;">
                <div style="font-size:14px; font-weight:700; color:#ffffff; margin-bottom:10px;">
                  Ativos em destaque
                </div>
                <div style="font-size:15px; line-height:1.8; color:#c9d8f2;">
                  ${escapeHtml(highlightAssets)}
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 0 28px;">
              <div style="background:linear-gradient(90deg, rgba(13,211,255,0.10) 0%, rgba(255,191,71,0.10) 100%); border:1px solid #27486e; border-radius:12px; padding:16px 18px;">
                <div style="font-size:13px; font-weight:700; letter-spacing:0.3px; color:#ffcf54; margin-bottom:8px;">
                  Insight operacional
                </div>
                <div style="font-size:15px; line-height:1.7; color:#d4e0f5;">
                  ${escapeHtml(insightText)}
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:26px 28px 10px 28px;">
              <a href="${escapeHtml(ctaUrl)}"
                 style="display:inline-block; background:linear-gradient(90deg,#0dd3ff 0%, #18a4ff 100%); color:#03101d; text-decoration:none; font-size:15px; font-weight:700; padding:14px 22px; border-radius:10px;">
                Abrir o Forex Session Radar
              </a>
            </td>
          </tr>
          ${
            timelineImageCid
              ? `<tr>
            <td style="padding:12px 28px 4px 28px;">
              <div style="background-color:#09182d; border:1px solid #18304f; border-radius:12px; padding:14px;">
                <div style="font-size:13px; font-weight:700; color:#ffffff; margin-bottom:10px;">
                  Snapshot da timeline
                </div>
                <img src="cid:${escapeHtml(timelineImageCid)}"
                     alt="Timeline atual"
                     style="width:100%; height:auto; border-radius:10px; border:1px solid #1f3d62; display:block;" />
                <div style="font-size:11px; line-height:1.6; color:#8aa0c1; margin-top:8px;">
                  Capturado em: ${escapeHtml(timelineImageCapturedAt || sentAt)}
                </div>
              </div>
            </td>
          </tr>`
              : ''
          }
          <tr>
            <td style="padding:18px 28px 10px 28px;">
              <div style="font-size:12px; line-height:1.7; color:#8196b5; text-align:center;">
                Este alerta foi gerado automaticamente pelo seu app Forex Session Radar.<br>
                Data de envio: ${escapeHtml(sentAt)}<br>
                Fuso de referencia: ${escapeHtml(timezoneLabel)}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 28px 28px 28px; text-align:center;">
              <div style="font-size:11px; color:#637898; line-height:1.6;">
                Voce esta recebendo este e-mail porque ativou alertas operacionais no app.<br>
                Para alterar suas preferencias, acesse as configuracoes do Forex Session Radar.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderOperationalText({
  alertTitle,
  alertMessage,
  sessionName,
  alertTime,
  liquidityLevel,
  sessionPhase,
  expectedBehavior,
  highlightAssets,
  insightText,
  sentAt,
  timezoneLabel,
  ctaUrl,
  timelineImageCapturedAt
}) {
  return [
    'Forex Session Radar',
    '',
    `Alerta: ${alertTitle}`,
    `Mensagem: ${alertMessage}`,
    `Sessao: ${sessionName}`,
    `Horario: ${alertTime}`,
    `Liquidez: ${liquidityLevel}`,
    `Fase: ${sessionPhase}`,
    `Comportamento esperado: ${expectedBehavior}`,
    `Ativos: ${highlightAssets}`,
    `Insight: ${insightText}`,
    ...(timelineImageCapturedAt ? [`Snapshot timeline: ${timelineImageCapturedAt}`] : []),
    '',
    `Data de envio: ${sentAt}`,
    `Fuso: ${timezoneLabel}`,
    `Abrir app: ${ctaUrl}`
  ].join('\n');
}

function createOperationalTemplate(payload) {
  const html = renderOperationalHtml(payload);
  const text = renderOperationalText(payload);
  return { html, text };
}

function buildAlertTemplate({ trigger, dashboard, locale, timelineImageCid = null, timelineImageCapturedAt = null }) {
  const timezoneLabel = dashboard.baseTimezone || 'UTC';
  const sentAt = formatDateTime(dashboard.nowIso, timezoneLabel);
  const alertTime = formatDateTime(trigger.timeIso, timezoneLabel);
  const sessionName = trigger.sessionLabel || dashboard.currentSession?.label || 'Mercado';
  const phaseSnapshot = computeSessionPhaseSnapshot(dashboard);
  const liquidityLevel = phaseSnapshot.expectedLiquidity || dashboard.currentSession?.volatility || 'Moderada';
  const sessionPhase = phaseSnapshot.currentPhase || dashboard.marketState?.contextLabel || dashboard.marketState?.statusLabel || 'Monitoramento';
  const expectedBehavior = phaseSnapshot.expectedBehavior || resolveOperationalMessage(trigger.type);
  const highlightAssets = Array.isArray(dashboard.currentSession?.recommendedAssets) && dashboard.currentSession.recommendedAssets.length
    ? dashboard.currentSession.recommendedAssets.join(', ')
    : Array.isArray(dashboard.radar?.recommended) && dashboard.radar.recommended.length
    ? dashboard.radar.recommended.join(', ')
    : 'Sem ativos em destaque neste momento.';
  const insightText = trigger.insightText || resolveOperationalMessage(trigger.type);
  const ctaUrl = process.env.EMAIL_CTA_URL || process.env.APP_PUBLIC_URL || DEFAULT_CTA_URL;

  return createOperationalTemplate({
    alertTitle: trigger.title,
    alertMessage: trigger.message || resolveOperationalMessage(trigger.type),
    sessionName,
    alertTime,
    liquidityLevel,
    sessionPhase,
    expectedBehavior,
    highlightAssets,
    insightText,
    sentAt,
    timezoneLabel,
    ctaUrl,
    timelineImageCid,
    timelineImageCapturedAt,
    locale
  });
}

function buildTestTemplate({ timezone = 'UTC', destinationEmail, timelineImageCid = null, timelineImageCapturedAt = null }) {
  const nowIso = DateTime.now().setZone(timezone).toISO();
  const sentAt = formatDateTime(nowIso, timezone);
  const ctaUrl = process.env.EMAIL_CTA_URL || process.env.APP_PUBLIC_URL || DEFAULT_CTA_URL;

  return createOperationalTemplate({
    alertTitle: 'Teste de conexao SMTP',
    alertMessage: 'Este e-mail confirma que o envio do Forex Session Radar esta funcionando normalmente.',
    sessionName: 'Canal SMTP',
    alertTime: sentAt,
    liquidityLevel: 'N/A',
    sessionPhase: 'Validacao tecnica',
    expectedBehavior: 'Verificacao de conectividade e autenticacao SMTP.',
    highlightAssets: destinationEmail ? `Destino configurado: ${destinationEmail}` : 'Nao aplicavel',
    insightText: 'Se voce recebeu este e-mail, a configuracao SMTP foi concluida e pronta para uso.',
    sentAt,
    timezoneLabel: timezone,
    ctaUrl,
    timelineImageCid,
    timelineImageCapturedAt
  });
}

module.exports = {
  buildAlertTemplate,
  buildTestTemplate
};
