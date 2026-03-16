import { DateTime } from 'luxon';

export type SupportedLocale = 'pt-BR' | 'en-US' | 'es-ES';

const SPANISH_TIMEZONES = [
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

const PORTUGUESE_TIMEZONES = ['America/Sao_Paulo', 'Europe/Lisbon', 'Atlantic/Cape_Verde'];

export function resolveLocaleFromTimezone(timezone?: string | null): SupportedLocale {
  if (!timezone) {
    return 'en-US';
  }

  if (PORTUGUESE_TIMEZONES.some((prefix) => timezone.startsWith(prefix))) {
    return 'pt-BR';
  }

  if (SPANISH_TIMEZONES.some((prefix) => timezone.startsWith(prefix))) {
    return 'es-ES';
  }

  return 'en-US';
}

type MessageKey =
  | 'app.subtitle'
  | 'loading.dashboard'
  | 'error.dashboard'
  | 'error.backendUnavailable'
  | 'timezone.label'
  | 'timezone.locked'
  | 'timezone.auto'
  | 'timezone.optionAuto'
  | 'timezone.optionCustom'
  | 'language.label'
  | 'language.auto'
  | 'language.manual'
  | 'language.optionAuto'
  | 'language.option.pt-BR'
  | 'language.option.en-US'
  | 'language.option.es-ES'
  | 'timezone.btn.cancel'
  | 'timezone.btn.save'
  | 'timezone.btn.test'
  | 'timezone.btn.testing'
  | 'timezone.test.ok'
  | 'timezone.test.error'
  | 'header.marketClosed'
  | 'header.marketOpen'
  | 'header.reopen'
  | 'header.nextSession'
  | 'header.updatedAt'
  | 'world.overlapNow'
  | 'world.activeBadge'
  | 'world.activeSessions'
  | 'world.closedHint'
  | 'world.session.sydney'
  | 'world.session.tokyo'
  | 'world.session.london'
  | 'world.session.new_york'
  | 'timeline.title'
  | 'timeline.paused'
  | 'timeline.noOverlap'
  | 'timeline.overlapActive'
  | 'timeline.windowLabel'
  | 'timeline.opening'
  | 'timeline.overlapStart'
  | 'timeline.overlapEnd'
  | 'timeline.weeklyClose'
  | 'timeline.weeklyOpen'
  | 'timeline.now'
  | 'timeline.phase'
  | 'timeline.session'
  | 'timeline.market'
  | 'timeline.marketOpen'
  | 'timeline.marketClosed'
  | 'timeline.closedTitle'
  | 'timeline.reopenIn'
  | 'timeline.nextSession'
  | 'timeline.nextEvent'
  | 'timeline.pausedBadge'
  | 'timeline.overlap'
  | 'timeline.alarmOpen'
  | 'timeline.alarmClose'
  | 'timeline.favoriteSession'
  | 'timeline.viewDetails'
  | 'timeline.alarmOn'
  | 'timeline.alarmOff'
  | 'timeline.alarm'
  | 'timeline.assetsRelevant'
  | 'timeline.goldDescription'
  | 'timeline.enableAlarm'
  | 'timeline.disableAlarm'
  | 'current.closedTitle'
  | 'current.reopenIn'
  | 'current.lastSession'
  | 'current.nextSession'
  | 'current.na'
  | 'current.currentSession'
  | 'current.closeForecast'
  | 'current.bestWindow'
  | 'current.volatility'
  | 'current.block'
  | 'radar.title'
  | 'radar.closed'
  | 'radar.closedMessage'
  | 'radar.idealNow'
  | 'radar.acceptable'
  | 'radar.avoid'
  | 'alert.title'
  | 'alert.event'
  | 'alert.closedMessage'
  | 'alert.reopenIn'
  | 'alert.triggersIn'
  | 'alert.noPending'
  | 'alert.leadMinutes'
  | 'alert.openSession'
  | 'alert.overlapStart'
  | 'alert.idealWindowEnd'
  | 'phase.marketTitle'
  | 'phase.sessionTitle'
  | 'phase.status'
  | 'phase.context'
  | 'phase.lastSession'
  | 'phase.nextEvent'
  | 'phase.timeRemaining'
  | 'phase.closed'
  | 'phase.weekOpen'
  | 'phase.noActiveSession'
  | 'phase.session'
  | 'phase.currentPhase'
  | 'phase.expectedBehavior'
  | 'phase.expectedLiquidity'
  | 'planner.title'
  | 'planner.favorites'
  | 'planner.addAssetPlaceholder'
  | 'planner.notes'
  | 'planner.notesPlaceholder'
  | 'planner.lockout'
  | 'chat.title'
  | 'chat.context'
  | 'chat.close'
  | 'chat.open'
  | 'chat.inputPlaceholder'
  | 'chat.provider.local'
  | 'chat.provider.openai'
  | 'chat.apiKey.edit'
  | 'chat.apiKey.first'
  | 'chat.apiKey.show'
  | 'chat.apiKey.hide'
  | 'chat.apiKey.test'
  | 'chat.apiKey.testing'
  | 'chat.apiKey.ok'
  | 'chat.apiKey.error'
  | 'chat.apiKey.cancel'
  | 'chat.apiKey.save'
  | 'chat.apiKey.configured'
  | 'chat.apiKey.change'
  | 'chat.rule.closed'
  | 'chat.rule.ready'
  | 'chat.rule.reopened'
  | 'chat.rule.fallback';

type Dictionary = Record<MessageKey, string>;

const PT_BR: Dictionary = {
  'app.subtitle': 'Painel operacional local para Forex, indices e ouro',
  'loading.dashboard': 'Carregando painel...',
  'error.dashboard': 'Falha ao carregar dashboard.',
  'error.backendUnavailable': 'Backend indisponivel.',
  'timezone.label': 'Fuso',
  'timezone.locked': 'Travado',
  'timezone.auto': 'Automatico',
  'timezone.optionAuto': 'Automatico (fuso do navegador)',
  'timezone.optionCustom': 'Fuso travado custom ({timezone})',
  'language.label': 'Idioma',
  'language.auto': 'Automatico',
  'language.manual': 'Manual',
  'language.optionAuto': 'Automatico (do fuso)',
  'language.option.pt-BR': 'Portugues (Brasil)',
  'language.option.en-US': 'Ingles (US)',
  'language.option.es-ES': 'Espanhol',
  'timezone.btn.cancel': 'Cancelar',
  'timezone.btn.save': 'Salvar chave',
  'timezone.btn.test': 'Testar conexao',
  'timezone.btn.testing': 'Testando...',
  'timezone.test.ok': 'Conexao validada com sucesso.',
  'timezone.test.error': 'Falha no teste. Verifique a chave e sua conexao.',
  'header.marketClosed': 'Mercado Fechado | Reabertura em {countdown}',
  'header.marketOpen': 'Mercado global aberto',
  'header.reopen': 'Proxima sessao: {session}',
  'header.nextSession': 'Proxima sessao: {session} em {countdown}',
  'header.updatedAt': 'Atualizado: {timestamp}',
  'world.overlapNow': 'Maior liquidez agora: {label}',
  'world.activeBadge': 'Ativa',
  'world.activeSessions': 'Sessoes ativas:',
  'world.closedHint': 'Mercado fechado: relogios sem destaque operacional.',
  'world.session.sydney': 'Sydney',
  'world.session.tokyo': 'Asiatica',
  'world.session.london': 'Europeia',
  'world.session.new_york': 'Americana',
  'timeline.title': 'Timeline de Sessoes',
  'timeline.paused': 'Mercado em Pausa',
  'timeline.noOverlap': 'Sem overlap ativo',
  'timeline.overlapActive': '{label} ativo',
  'timeline.windowLabel': 'Janela móvel de 24h centrada no agora ({city}).',
  'timeline.opening': 'Abertura {session}',
  'timeline.overlapStart': 'Inicio {label}',
  'timeline.overlapEnd': 'Fim {label}',
  'timeline.weeklyClose': 'Fechamento semanal',
  'timeline.weeklyOpen': 'Reabertura semanal',
  'timeline.now': 'Agora {time}',
  'timeline.phase': 'Fase: {phase}',
  'timeline.session': 'Sessao: {session}',
  'timeline.market': 'Mercado: {status}',
  'timeline.marketOpen': 'Aberto',
  'timeline.marketClosed': 'Fechado',
  'timeline.closedTitle': 'Mercado Fechado',
  'timeline.reopenIn': 'Reabertura em {countdown}',
  'timeline.nextSession': 'Proxima sessao: {session} ({time})',
  'timeline.nextEvent': 'Proximo evento: {title}',
  'timeline.pausedBadge': 'Timeline em modo pausa',
  'timeline.overlap': 'Overlap',
  'timeline.alarmOpen': 'Ativar alarme de abertura',
  'timeline.alarmClose': 'Ativar alarme de fechamento',
  'timeline.favoriteSession': 'Marcar sessao como favorita',
  'timeline.viewDetails': 'Ver detalhes da sessao',
  'timeline.alarmOn': 'Ativado',
  'timeline.alarmOff': 'Desativado',
  'timeline.alarm': 'Alarme',
  'timeline.assetsRelevant': 'Ativos relevantes',
  'timeline.goldDescription': 'Maior liquidez do dia com forte participacao institucional.',
  'timeline.enableAlarm': 'Ativar alarme',
  'timeline.disableAlarm': 'Desativar alarme',
  'current.closedTitle': 'Mercado Fechado',
  'current.reopenIn': 'Reabertura da semana em {countdown}',
  'current.lastSession': 'Ultima sessao encerrada:',
  'current.nextSession': 'Proxima sessao:',
  'current.na': 'N/A',
  'current.currentSession': 'Sessao Atual: {session}',
  'current.closeForecast': 'Encerramento previsto: {time}',
  'current.bestWindow': 'Melhor hora para operar: {assets}',
  'current.volatility': 'Volatilidade',
  'current.block': 'Bloco {index}',
  'radar.title': 'Radar de Ativos',
  'radar.closed': 'Mercado Fechado',
  'radar.closedMessage': 'Mercado fechado. Use este periodo para revisao e planejamento.',
  'radar.idealNow': 'Ideal Agora',
  'radar.acceptable': 'Aceitavel',
  'radar.avoid': 'Evitar',
  'alert.title': 'Proximo Alerta',
  'alert.event': 'Evento',
  'alert.closedMessage': 'Mercado fechado. Alertas operacionais retomam na abertura da semana.',
  'alert.reopenIn': 'Reabertura em {countdown}',
  'alert.triggersIn': 'Disparo em {countdown} | Evento {time}',
  'alert.noPending': 'Sem alertas pendentes neste ciclo.',
  'alert.leadMinutes': 'Antecedencia (min)',
  'alert.openSession': 'Abertura de sessao',
  'alert.overlapStart': 'Inicio do overlap Londres + Nova York',
  'alert.idealWindowEnd': 'Fim da janela ideal',
  'phase.marketTitle': 'Fase do Mercado',
  'phase.sessionTitle': 'Fase da Sessao',
  'phase.status': 'Status',
  'phase.context': 'Contexto',
  'phase.lastSession': 'Ultima sessao',
  'phase.nextEvent': 'Proximo evento',
  'phase.timeRemaining': 'Tempo restante',
  'phase.closed': 'Fechado',
  'phase.weekOpen': 'Abertura da semana',
  'phase.noActiveSession': 'Sem sessao ativa no momento. Aguarde a proxima abertura relevante.',
  'phase.session': 'Sessao',
  'phase.currentPhase': 'Fase atual',
  'phase.expectedBehavior': 'Comportamento Esperado',
  'phase.expectedLiquidity': 'Liquidez Esperada',
  'planner.title': 'Planner Operacional',
  'planner.favorites': 'Ativos favoritos',
  'planner.addAssetPlaceholder': 'Adicionar ativo (ex: XAUUSD)',
  'planner.notes': 'Anotacoes',
  'planner.notesPlaceholder': 'Observacoes de contexto, niveis e regras do dia...',
  'planner.lockout': 'Lockout apos fim da janela operacional',
  'chat.title': 'Assistente Inteligente',
  'chat.context': 'Contexto da sessao atual',
  'chat.close': 'Fechar chat',
  'chat.open': 'Abrir assistente inteligente',
  'chat.inputPlaceholder': 'Pergunte sobre sessao, liquidez ou ativos do horario atual...',
  'chat.provider.local': 'Local',
  'chat.provider.openai': 'ChatGPT',
  'chat.apiKey.edit': 'Digite a nova chave OpenAI',
  'chat.apiKey.first': 'Insira sua chave OpenAI (primeiro acesso)',
  'chat.apiKey.show': 'Mostrar',
  'chat.apiKey.hide': 'Ocultar',
  'chat.apiKey.test': 'Testar conexao',
  'chat.apiKey.testing': 'Testando...',
  'chat.apiKey.ok': 'Conexao validada com sucesso.',
  'chat.apiKey.error': 'Falha no teste. Verifique a chave e sua conexao.',
  'chat.apiKey.cancel': 'Cancelar',
  'chat.apiKey.save': 'Salvar chave',
  'chat.apiKey.configured': 'Chave OpenAI configurada neste dispositivo.',
  'chat.apiKey.change': 'Alterar chave',
  'chat.rule.closed':
    'Mercado fechado no fim de semana. Proxima abertura prevista: {nextOpen}. Este e um bom momento para revisar plano operacional, niveis tecnicos e calendario economico.',
  'chat.rule.ready': 'Assistente pronto. Pergunte sobre timing operacional, liquidez e ativos por sessao.',
  'chat.rule.reopened': 'Mercado reaberto. Posso te ajudar com sessao ativa, liquidez e ativos mais adequados agora.',
  'chat.rule.fallback': 'Nao consegui responder agora. Verifique o backend local e a chave OpenAI.'
};

const EN_US: Dictionary = {
  ...PT_BR,
  'app.subtitle': 'Local operational dashboard for Forex, indices and gold',
  'loading.dashboard': 'Loading dashboard...',
  'error.dashboard': 'Failed to load dashboard.',
  'error.backendUnavailable': 'Backend unavailable.',
  'timezone.label': 'Timezone',
  'timezone.locked': 'Locked',
  'timezone.auto': 'Automatic',
  'timezone.optionAuto': 'Automatic (browser timezone)',
  'timezone.optionCustom': 'Custom locked timezone ({timezone})',
  'language.label': 'Language',
  'language.auto': 'Automatic',
  'language.manual': 'Manual',
  'language.optionAuto': 'Automatic (from timezone)',
  'language.option.pt-BR': 'Portuguese (Brazil)',
  'language.option.en-US': 'English (US)',
  'language.option.es-ES': 'Spanish',
  'timezone.btn.cancel': 'Cancel',
  'timezone.btn.save': 'Save key',
  'timezone.btn.test': 'Test connection',
  'timezone.btn.testing': 'Testing...',
  'timezone.test.ok': 'Connection validated successfully.',
  'timezone.test.error': 'Test failed. Check the key and your connection.',
  'header.marketClosed': 'Market Closed | Reopens in {countdown}',
  'header.marketOpen': 'Global market open',
  'header.reopen': 'Next session: {session}',
  'header.nextSession': 'Next session: {session} in {countdown}',
  'header.updatedAt': 'Updated: {timestamp}',
  'world.overlapNow': 'Highest liquidity now: {label}',
  'world.activeBadge': 'Active',
  'world.activeSessions': 'Active sessions:',
  'world.closedHint': 'Market closed: clocks without operational highlight.',
  'world.session.tokyo': 'Asian',
  'world.session.london': 'European',
  'world.session.new_york': 'American',
  'timeline.title': 'Session Timeline',
  'timeline.paused': 'Market Paused',
  'timeline.noOverlap': 'No active overlap',
  'timeline.overlapActive': '{label} active',
  'timeline.windowLabel': 'Rolling 24h window centered on now ({city}).',
  'timeline.opening': '{session} open',
  'timeline.overlapStart': '{label} start',
  'timeline.overlapEnd': '{label} end',
  'timeline.weeklyClose': 'Weekly close',
  'timeline.weeklyOpen': 'Weekly reopen',
  'timeline.now': 'Now {time}',
  'timeline.phase': 'Phase: {phase}',
  'timeline.session': 'Session: {session}',
  'timeline.market': 'Market: {status}',
  'timeline.marketOpen': 'Open',
  'timeline.marketClosed': 'Closed',
  'timeline.closedTitle': 'Market Closed',
  'timeline.reopenIn': 'Reopens in {countdown}',
  'timeline.nextSession': 'Next session: {session} ({time})',
  'timeline.nextEvent': 'Next event: {title}',
  'timeline.pausedBadge': 'Timeline paused',
  'timeline.overlap': 'Overlap',
  'timeline.alarmOpen': 'Enable open alarm',
  'timeline.alarmClose': 'Enable close alarm',
  'timeline.favoriteSession': 'Mark session as favorite',
  'timeline.viewDetails': 'View session details',
  'timeline.alarmOn': 'Enabled',
  'timeline.alarmOff': 'Disabled',
  'timeline.alarm': 'Alarm',
  'timeline.assetsRelevant': 'Relevant assets',
  'timeline.goldDescription': 'Highest liquidity window with strong institutional participation.',
  'timeline.enableAlarm': 'Enable alarm',
  'timeline.disableAlarm': 'Disable alarm',
  'current.closedTitle': 'Market Closed',
  'current.reopenIn': 'Weekly reopen in {countdown}',
  'current.lastSession': 'Last closed session:',
  'current.nextSession': 'Next session:',
  'current.na': 'N/A',
  'current.currentSession': 'Current Session: {session}',
  'current.closeForecast': 'Expected close: {time}',
  'current.bestWindow': 'Best trading window: {assets}',
  'current.volatility': 'Volatility',
  'current.block': 'Block {index}',
  'radar.title': 'Asset Radar',
  'radar.closed': 'Market Closed',
  'radar.closedMessage': 'Market closed. Use this period for review and planning.',
  'radar.idealNow': 'Ideal Now',
  'radar.acceptable': 'Acceptable',
  'radar.avoid': 'Avoid',
  'alert.title': 'Next Alert',
  'alert.event': 'Event',
  'alert.closedMessage': 'Market closed. Operational alerts resume at weekly open.',
  'alert.reopenIn': 'Reopens in {countdown}',
  'alert.triggersIn': 'Triggers in {countdown} | Event {time}',
  'alert.noPending': 'No pending alerts in this cycle.',
  'alert.leadMinutes': 'Lead time (min)',
  'alert.openSession': 'Session open',
  'alert.overlapStart': 'London + New York overlap start',
  'alert.idealWindowEnd': 'Ideal window end',
  'phase.marketTitle': 'Market Phase',
  'phase.sessionTitle': 'Session Phase',
  'phase.status': 'Status',
  'phase.context': 'Context',
  'phase.lastSession': 'Last session',
  'phase.nextEvent': 'Next event',
  'phase.timeRemaining': 'Time remaining',
  'phase.closed': 'Closed',
  'phase.weekOpen': 'Weekly open',
  'phase.noActiveSession': 'No active session right now. Wait for the next relevant open.',
  'phase.session': 'Session',
  'phase.currentPhase': 'Current phase',
  'phase.expectedBehavior': 'Expected behavior',
  'phase.expectedLiquidity': 'Expected liquidity',
  'planner.title': 'Operational Planner',
  'planner.favorites': 'Favorite assets',
  'planner.addAssetPlaceholder': 'Add asset (e.g. XAUUSD)',
  'planner.notes': 'Notes',
  'planner.notesPlaceholder': 'Context notes, levels and trading rules for today...',
  'planner.lockout': 'Lockout after operational window ends',
  'chat.title': 'Smart Assistant',
  'chat.context': 'Current session context',
  'chat.close': 'Close chat',
  'chat.open': 'Open smart assistant',
  'chat.inputPlaceholder': 'Ask about session timing, liquidity or assets right now...',
  'chat.provider.local': 'Local',
  'chat.provider.openai': 'ChatGPT',
  'chat.apiKey.edit': 'Enter the new OpenAI key',
  'chat.apiKey.first': 'Enter your OpenAI key (first access)',
  'chat.apiKey.show': 'Show',
  'chat.apiKey.hide': 'Hide',
  'chat.apiKey.test': 'Test connection',
  'chat.apiKey.testing': 'Testing...',
  'chat.apiKey.ok': 'Connection validated successfully.',
  'chat.apiKey.error': 'Connection test failed. Check your key and network.',
  'chat.apiKey.cancel': 'Cancel',
  'chat.apiKey.save': 'Save key',
  'chat.apiKey.configured': 'OpenAI key configured on this device.',
  'chat.apiKey.change': 'Change key',
  'chat.rule.closed':
    'Forex market is closed during the weekend interval. Next global open is expected at {nextOpen}. This is a good time to review levels, macro calendar and your trading plan.',
  'chat.rule.ready': 'Assistant ready. Ask about timing, liquidity and best assets by session.',
  'chat.rule.reopened': 'Market reopened. I can help with active session, liquidity and best assets right now.',
  'chat.rule.fallback': 'Could not answer right now. Check local backend and OpenAI key.'
};

const ES_ES: Dictionary = {
  ...EN_US,
  'app.subtitle': 'Panel operativo local para Forex, indices y oro',
  'loading.dashboard': 'Cargando panel...',
  'error.dashboard': 'No fue posible cargar el panel.',
  'error.backendUnavailable': 'Backend no disponible.',
  'timezone.label': 'Zona horaria',
  'timezone.locked': 'Fijado',
  'timezone.auto': 'Automatico',
  'timezone.optionAuto': 'Automatico (zona del navegador)',
  'timezone.optionCustom': 'Zona fijada personalizada ({timezone})',
  'language.label': 'Idioma',
  'language.auto': 'Automatico',
  'language.manual': 'Manual',
  'language.optionAuto': 'Automatico (de la zona horaria)',
  'language.option.pt-BR': 'Portugues (Brasil)',
  'language.option.en-US': 'Ingles (US)',
  'language.option.es-ES': 'Espanol',
  'timezone.btn.cancel': 'Cancelar',
  'timezone.btn.save': 'Guardar clave',
  'timezone.btn.test': 'Probar conexion',
  'timezone.btn.testing': 'Probando...',
  'timezone.test.ok': 'Conexion validada correctamente.',
  'timezone.test.error': 'Fallo en la prueba. Verifica la clave y la conexion.',
  'header.marketClosed': 'Mercado Cerrado | Reapertura en {countdown}',
  'header.marketOpen': 'Mercado global abierto',
  'header.reopen': 'Proxima sesion: {session}',
  'header.nextSession': 'Proxima sesion: {session} en {countdown}',
  'header.updatedAt': 'Actualizado: {timestamp}',
  'world.overlapNow': 'Mayor liquidez ahora: {label}',
  'world.activeBadge': 'Activa',
  'world.activeSessions': 'Sesiones activas:',
  'world.closedHint': 'Mercado cerrado: relojes sin destaque operativo.',
  'timeline.title': 'Linea de Tiempo de Sesiones',
  'timeline.paused': 'Mercado en Pausa',
  'timeline.noOverlap': 'Sin overlap activo',
  'timeline.overlapActive': '{label} activo',
  'timeline.windowLabel': 'Ventana movil de 24h centrada en ahora ({city}).',
  'timeline.opening': 'Apertura {session}',
  'timeline.overlapStart': 'Inicio {label}',
  'timeline.overlapEnd': 'Fin {label}',
  'timeline.weeklyClose': 'Cierre semanal',
  'timeline.weeklyOpen': 'Reapertura semanal',
  'timeline.now': 'Ahora {time}',
  'timeline.phase': 'Fase: {phase}',
  'timeline.session': 'Sesion: {session}',
  'timeline.market': 'Mercado: {status}',
  'timeline.marketOpen': 'Abierto',
  'timeline.marketClosed': 'Cerrado',
  'timeline.closedTitle': 'Mercado Cerrado',
  'timeline.reopenIn': 'Reapertura en {countdown}',
  'timeline.nextSession': 'Proxima sesion: {session} ({time})',
  'timeline.nextEvent': 'Proximo evento: {title}',
  'timeline.pausedBadge': 'Timeline en pausa',
  'timeline.overlap': 'Overlap',
  'timeline.alarmOpen': 'Activar alarma de apertura',
  'timeline.alarmClose': 'Activar alarma de cierre',
  'timeline.favoriteSession': 'Marcar sesion como favorita',
  'timeline.viewDetails': 'Ver detalles de la sesion',
  'timeline.alarmOn': 'Activado',
  'timeline.alarmOff': 'Desactivado',
  'timeline.alarm': 'Alarma',
  'timeline.assetsRelevant': 'Activos relevantes',
  'timeline.goldDescription': 'Mayor liquidez del dia con fuerte participacion institucional.',
  'timeline.enableAlarm': 'Activar alarma',
  'timeline.disableAlarm': 'Desactivar alarma',
  'current.closedTitle': 'Mercado Cerrado',
  'current.reopenIn': 'Reapertura semanal en {countdown}',
  'current.lastSession': 'Ultima sesion cerrada:',
  'current.nextSession': 'Proxima sesion:',
  'radar.title': 'Radar de Activos',
  'radar.closed': 'Mercado Cerrado',
  'radar.closedMessage': 'Mercado cerrado. Usa este periodo para revision y planificacion.',
  'radar.idealNow': 'Ideal Ahora',
  'radar.acceptable': 'Aceptable',
  'alert.title': 'Proxima Alerta',
  'alert.closedMessage': 'Mercado cerrado. Las alertas operativas vuelven en la reapertura semanal.',
  'alert.reopenIn': 'Reapertura en {countdown}',
  'alert.triggersIn': 'Disparo en {countdown} | Evento {time}',
  'alert.noPending': 'Sin alertas pendientes en este ciclo.',
  'alert.leadMinutes': 'Anticipacion (min)',
  'alert.openSession': 'Apertura de sesion',
  'alert.overlapStart': 'Inicio del overlap Londres + Nueva York',
  'alert.idealWindowEnd': 'Fin de la ventana ideal',
  'phase.marketTitle': 'Fase del Mercado',
  'phase.sessionTitle': 'Fase de la Sesion',
  'phase.context': 'Contexto',
  'phase.lastSession': 'Ultima sesion',
  'phase.nextEvent': 'Proximo evento',
  'phase.timeRemaining': 'Tiempo restante',
  'phase.closed': 'Cerrado',
  'phase.weekOpen': 'Apertura semanal',
  'phase.noActiveSession': 'No hay sesion activa ahora. Espera la proxima apertura relevante.',
  'phase.session': 'Sesion',
  'phase.currentPhase': 'Fase actual',
  'phase.expectedBehavior': 'Comportamiento esperado',
  'phase.expectedLiquidity': 'Liquidez esperada',
  'planner.title': 'Planificador Operativo',
  'planner.favorites': 'Activos favoritos',
  'planner.addAssetPlaceholder': 'Agregar activo (ej: XAUUSD)',
  'planner.notes': 'Notas',
  'planner.notesPlaceholder': 'Notas de contexto, niveles y reglas del dia...',
  'planner.lockout': 'Bloqueo despues del fin de la ventana operativa',
  'chat.title': 'Asistente Inteligente',
  'chat.context': 'Contexto de la sesion actual',
  'chat.close': 'Cerrar chat',
  'chat.open': 'Abrir asistente inteligente',
  'chat.inputPlaceholder': 'Pregunta sobre sesion, liquidez o activos del horario actual...',
  'chat.apiKey.edit': 'Ingresa la nueva clave de OpenAI',
  'chat.apiKey.first': 'Ingresa tu clave de OpenAI (primer acceso)',
  'chat.apiKey.show': 'Mostrar',
  'chat.apiKey.hide': 'Ocultar',
  'chat.apiKey.test': 'Probar conexion',
  'chat.apiKey.testing': 'Probando...',
  'chat.apiKey.ok': 'Conexion validada correctamente.',
  'chat.apiKey.error': 'Fallo en la prueba. Verifica clave y conexion.',
  'chat.apiKey.cancel': 'Cancelar',
  'chat.apiKey.save': 'Guardar clave',
  'chat.apiKey.configured': 'Clave de OpenAI configurada en este dispositivo.',
  'chat.apiKey.change': 'Cambiar clave',
  'chat.rule.closed':
    'El mercado Forex esta cerrado durante el fin de semana. La proxima apertura global esta prevista para {nextOpen}. Este es un buen momento para revisar niveles, calendario economico y plan operativo.',
  'chat.rule.ready': 'Asistente listo. Pregunta sobre timing operativo, liquidez y activos por sesion.',
  'chat.rule.reopened': 'Mercado reabierto. Te ayudo con sesion activa, liquidez y activos mas adecuados ahora.',
  'chat.rule.fallback': 'No pude responder ahora. Verifica el backend local y la clave de OpenAI.'
};

const MESSAGES: Record<SupportedLocale, Dictionary> = {
  'pt-BR': PT_BR,
  'en-US': EN_US,
  'es-ES': ES_ES
};

export function t(locale: SupportedLocale, key: MessageKey, params: Record<string, string | number> = {}) {
  const template = MESSAGES[locale][key] || MESSAGES['en-US'][key] || key;
  return template.replace(/\{(\w+)\}/g, (_, token) => String(params[token] ?? ''));
}

const SESSION_LABEL_TRANSLATIONS: Record<string, { 'pt-BR': string; 'en-US': string; 'es-ES': string }> = {
  'Sessao de Sydney': { 'pt-BR': 'Sessao de Sydney', 'en-US': 'Sydney Session', 'es-ES': 'Sesion de Sydney' },
  'Sessao Asiatica': { 'pt-BR': 'Sessao Asiatica', 'en-US': 'Asian Session', 'es-ES': 'Sesion Asiatica' },
  'Sessao Europeia': { 'pt-BR': 'Sessao Europeia', 'en-US': 'European Session', 'es-ES': 'Sesion Europea' },
  'Sessao Americana': { 'pt-BR': 'Sessao Americana', 'en-US': 'American Session', 'es-ES': 'Sesion Americana' },
  'Janela de Ouro': { 'pt-BR': 'Janela de Ouro', 'en-US': 'Golden Window', 'es-ES': 'Ventana Dorada' },
  'Mercado Fechado': { 'pt-BR': 'Mercado Fechado', 'en-US': 'Market Closed', 'es-ES': 'Mercado Cerrado' },
  'Transicao de Mercado': { 'pt-BR': 'Transicao de Mercado', 'en-US': 'Market Transition', 'es-ES': 'Transicion de Mercado' }
};

export function localizeSessionLabel(label: string, locale: SupportedLocale): string {
  if (!label) {
    return label;
  }

  const reopeningPrefix = 'Reabertura da semana - ';
  if (label.startsWith(reopeningPrefix)) {
    const sessionPart = label.slice(reopeningPrefix.length);
    const translatedSession: string = localizeSessionLabel(sessionPart, locale);
    if (locale === 'pt-BR') {
      return `${reopeningPrefix}${translatedSession}`;
    }
    if (locale === 'es-ES') {
      return `Reapertura semanal - ${translatedSession}`;
    }
    return `Weekly reopen - ${translatedSession}`;
  }

  return SESSION_LABEL_TRANSLATIONS[label]?.[locale] || label;
}

export function localizeMarketStatusLabel(label: string, locale: SupportedLocale) {
  if (!label) {
    return label;
  }

  const byLocale: Record<string, Record<SupportedLocale, string>> = {
    'Mercado Aberto': { 'pt-BR': 'Mercado Aberto', 'en-US': 'Market Open', 'es-ES': 'Mercado Abierto' },
    'Mercado Fechado': { 'pt-BR': 'Mercado Fechado', 'en-US': 'Market Closed', 'es-ES': 'Mercado Cerrado' },
    'Encerramento da Semana': {
      'pt-BR': 'Encerramento da Semana',
      'en-US': 'Week Closing',
      'es-ES': 'Cierre de Semana'
    },
    'Pre-abertura da Semana': {
      'pt-BR': 'Pre-abertura da Semana',
      'en-US': 'Pre-open Week',
      'es-ES': 'Preapertura Semanal'
    }
  };

  return byLocale[label]?.[locale] || label;
}

export function localizeMarketContextLabel(label: string, locale: SupportedLocale) {
  if (!label) {
    return label;
  }

  const byLocale: Record<string, Record<SupportedLocale, string>> = {
    'Mercado em funcionamento normal': {
      'pt-BR': 'Mercado em funcionamento normal',
      'en-US': 'Market running normally',
      'es-ES': 'Mercado operando normalmente'
    },
    'Intervalo de fim de semana': {
      'pt-BR': 'Intervalo de fim de semana',
      'en-US': 'Weekend interval',
      'es-ES': 'Intervalo de fin de semana'
    },
    'Aguardando abertura global do mercado': {
      'pt-BR': 'Aguardando abertura global do mercado',
      'en-US': 'Waiting for global market open',
      'es-ES': 'Esperando apertura global del mercado'
    }
  };

  return byLocale[label]?.[locale] || label;
}

export function formatIsoInTimezone(
  iso: string,
  timezone: string,
  locale: SupportedLocale,
  format = 'dd/LL HH:mm'
) {
  return DateTime.fromISO(iso, { setZone: true }).setZone(timezone).setLocale(locale).toFormat(format);
}

const OPERATIONAL_TRANSLATIONS: Record<string, { 'pt-BR': string; 'en-US': string; 'es-ES': string }> = {
  'Ativa agora': { 'pt-BR': 'Ativa agora', 'en-US': 'Active now', 'es-ES': 'Activa ahora' },
  Proxima: { 'pt-BR': 'Proxima', 'en-US': 'Upcoming', 'es-ES': 'Proxima' },
  Encerrada: { 'pt-BR': 'Encerrada', 'en-US': 'Closed', 'es-ES': 'Cerrada' },
  'Sem sobreposicao': { 'pt-BR': 'Sem sobreposicao', 'en-US': 'No overlap', 'es-ES': 'Sin overlap' },
  ativa: { 'pt-BR': 'ativa', 'en-US': 'active', 'es-ES': 'activa' },
  'Mercado fechado': { 'pt-BR': 'Mercado fechado', 'en-US': 'Market closed', 'es-ES': 'Mercado cerrado' },
  'Janela de ouro': { 'pt-BR': 'Janela de ouro', 'en-US': 'Golden window', 'es-ES': 'Ventana dorada' },
  'Expansao Europeia': { 'pt-BR': 'Expansao Europeia', 'en-US': 'European expansion', 'es-ES': 'Expansion europea' },
  'Movimento Americano': { 'pt-BR': 'Movimento Americano', 'en-US': 'American move', 'es-ES': 'Movimiento americano' },
  'Range Asiatico': { 'pt-BR': 'Range Asiatico', 'en-US': 'Asian range', 'es-ES': 'Rango asiatico' },
  Transicao: { 'pt-BR': 'Transicao', 'en-US': 'Transition', 'es-ES': 'Transicion' },
  'Sydney + Toquio': { 'pt-BR': 'Sydney + Toquio', 'en-US': 'Sydney + Tokyo', 'es-ES': 'Sydney + Tokio' },
  'Toquio + Londres': { 'pt-BR': 'Toquio + Londres', 'en-US': 'Tokyo + London', 'es-ES': 'Tokio + Londres' },
  'Londres + Nova York': { 'pt-BR': 'Londres + Nova York', 'en-US': 'London + New York', 'es-ES': 'Londres + Nueva York' },
  Abertura: { 'pt-BR': 'Abertura', 'en-US': 'Open', 'es-ES': 'Apertura' },
  Expansao: { 'pt-BR': 'Expansao', 'en-US': 'Expansion', 'es-ES': 'Expansion' },
  'Meio do Dia': { 'pt-BR': 'Meio do Dia', 'en-US': 'Midday', 'es-ES': 'Mediodia' },
  'Movimento da Tarde': { 'pt-BR': 'Movimento da Tarde', 'en-US': 'Afternoon move', 'es-ES': 'Movimiento de la tarde' },
  Encerramento: { 'pt-BR': 'Encerramento', 'en-US': 'Close', 'es-ES': 'Cierre' },
  'Abertura Europeia': { 'pt-BR': 'Abertura Europeia', 'en-US': 'European open', 'es-ES': 'Apertura europea' },
  'Expansao Inicial': { 'pt-BR': 'Expansao Inicial', 'en-US': 'Initial expansion', 'es-ES': 'Expansion inicial' },
  Continuacao: { 'pt-BR': 'Continuacao', 'en-US': 'Continuation', 'es-ES': 'Continuacion' },
  'Pre-Sobreposicao': { 'pt-BR': 'Pre-Sobreposicao', 'en-US': 'Pre-overlap', 'es-ES': 'Pre-overlap' },
  'Sobreposicao com Nova York': {
    'pt-BR': 'Sobreposicao com Nova York',
    'en-US': 'Overlap with New York',
    'es-ES': 'Overlap con Nueva York'
  },
  'Abertura Asiatica': { 'pt-BR': 'Abertura Asiatica', 'en-US': 'Asian open', 'es-ES': 'Apertura asiatica' },
  Consolidacao: { 'pt-BR': 'Consolidacao', 'en-US': 'Consolidation', 'es-ES': 'Consolidacion' },
  Desenvolvimento: { 'pt-BR': 'Desenvolvimento', 'en-US': 'Development', 'es-ES': 'Desarrollo' },
  'Final da Sessao': { 'pt-BR': 'Final da Sessao', 'en-US': 'Session end', 'es-ES': 'Fin de sesion' },
  'Abertura de Sydney': { 'pt-BR': 'Abertura de Sydney', 'en-US': 'Sydney open', 'es-ES': 'Apertura de Sydney' },
  'Formacao de Faixa': { 'pt-BR': 'Formacao de Faixa', 'en-US': 'Range formation', 'es-ES': 'Formacion de rango' },
  'Transicao para Asia': { 'pt-BR': 'Transicao para Asia', 'en-US': 'Transition to Asia', 'es-ES': 'Transicion a Asia' },
  'Inicio da Janela': { 'pt-BR': 'Inicio da Janela', 'en-US': 'Window start', 'es-ES': 'Inicio de la ventana' },
  'Final da Janela': { 'pt-BR': 'Final da Janela', 'en-US': 'Window end', 'es-ES': 'Fin de la ventana' },
  'Rompimentos iniciais e ajuste de preco': {
    'pt-BR': 'Rompimentos iniciais e ajuste de preco',
    'en-US': 'Initial breakouts and price adjustment',
    'es-ES': 'Rupturas iniciales y ajuste de precio'
  },
  'Expansao de volatilidade e continuidade': {
    'pt-BR': 'Expansao de volatilidade e continuidade',
    'en-US': 'Volatility expansion and continuation',
    'es-ES': 'Expansion de volatilidad y continuidad'
  },
  'Consolidacao e seletividade maior': {
    'pt-BR': 'Consolidacao e seletividade maior',
    'en-US': 'Consolidation with higher selectivity',
    'es-ES': 'Consolidacion con mayor selectividad'
  },
  'Continuacao moderada ou reversoes': {
    'pt-BR': 'Continuacao moderada ou reversoes',
    'en-US': 'Moderate continuation or reversals',
    'es-ES': 'Continuacion moderada o reversiones'
  },
  'Desaceleracao e ajuste final': {
    'pt-BR': 'Desaceleracao e ajuste final',
    'en-US': 'Deceleration and final adjustment',
    'es-ES': 'Desaceleracion y ajuste final'
  },
  'Rompimentos iniciais da sessao': {
    'pt-BR': 'Rompimentos iniciais da sessao',
    'en-US': 'Initial session breakouts',
    'es-ES': 'Rupturas iniciales de la sesion'
  },
  'Rompimentos iniciais e expansao do range': {
    'pt-BR': 'Rompimentos iniciais e expansao do range',
    'en-US': 'Initial breakouts and range expansion',
    'es-ES': 'Rupturas iniciales y expansion del rango'
  },
  'Consolidacao, range tecnico e rompimentos pontuais': {
    'pt-BR': 'Consolidacao, range tecnico e rompimentos pontuais',
    'en-US': 'Consolidation, technical range and occasional breakouts',
    'es-ES': 'Consolidacion, rango tecnico y rupturas puntuales'
  },
  'Expansao do range asiatico': {
    'pt-BR': 'Expansao do range asiatico',
    'en-US': 'Asian range expansion',
    'es-ES': 'Expansion del rango asiatico'
  },
  'Fluxo direcional com pullbacks': {
    'pt-BR': 'Fluxo direcional com pullbacks',
    'en-US': 'Directional flow with pullbacks',
    'es-ES': 'Flujo direccional con pullbacks'
  },
  'Ajustes e preparacao para NY': {
    'pt-BR': 'Ajustes e preparacao para NY',
    'en-US': 'Adjustments and prep for NY',
    'es-ES': 'Ajustes y preparacion para NY'
  },
  'Movimentos mais fortes e liquidos': {
    'pt-BR': 'Movimentos mais fortes e liquidos',
    'en-US': 'Stronger, more liquid moves',
    'es-ES': 'Movimientos mas fuertes y liquidos'
  },
  'Ajustes iniciais e formacao de faixa': {
    'pt-BR': 'Ajustes iniciais e formacao de faixa',
    'en-US': 'Initial adjustments and range formation',
    'es-ES': 'Ajustes iniciales y formacion de rango'
  },
  'Range com respeito a niveis tecnicos': {
    'pt-BR': 'Range com respeito a niveis tecnicos',
    'en-US': 'Range respecting technical levels',
    'es-ES': 'Rango respetando niveles tecnicos'
  },
  'Movimentos direcionais pontuais': {
    'pt-BR': 'Movimentos direcionais pontuais',
    'en-US': 'Occasional directional moves',
    'es-ES': 'Movimientos direccionales puntuales'
  },
  'Desaceleracao e transicao de fluxo': {
    'pt-BR': 'Desaceleracao e transicao de fluxo',
    'en-US': 'Deceleration and flow transition',
    'es-ES': 'Desaceleracion y transicion de flujo'
  },
  'Ajustes iniciais e precificacao de risco': {
    'pt-BR': 'Ajustes iniciais e precificacao de risco',
    'en-US': 'Initial adjustments and risk pricing',
    'es-ES': 'Ajustes iniciales y valoracion de riesgo'
  },
  'Consolidacao com movimentos tecnicos curtos': {
    'pt-BR': 'Consolidacao com movimentos tecnicos curtos',
    'en-US': 'Consolidation with short technical moves',
    'es-ES': 'Consolidacion con movimientos tecnicos cortos'
  },
  'Movimentos direcionais mais limpos em pares AUD/NZD': {
    'pt-BR': 'Movimentos direcionais mais limpos em pares AUD/NZD',
    'en-US': 'Cleaner directional moves in AUD/NZD pairs',
    'es-ES': 'Movimientos direccionales mas limpios en pares AUD/NZD'
  },
  'Preparacao para fluxo de Toquio': {
    'pt-BR': 'Preparacao para fluxo de Toquio',
    'en-US': 'Preparation for Tokyo flow',
    'es-ES': 'Preparacion para flujo de Tokio'
  },
  'Aceleracao institucional': {
    'pt-BR': 'Aceleracao institucional',
    'en-US': 'Institutional acceleration',
    'es-ES': 'Aceleracion institucional'
  },
  'Movimentos estendidos e ajuste': {
    'pt-BR': 'Movimentos estendidos e ajuste',
    'en-US': 'Extended moves and adjustment',
    'es-ES': 'Movimientos extendidos y ajuste'
  },
  'Baixa a moderada': { 'pt-BR': 'Baixa a moderada', 'en-US': 'Low to moderate', 'es-ES': 'Baja a moderada' },
  Moderada: { 'pt-BR': 'Moderada', 'en-US': 'Moderate', 'es-ES': 'Moderada' },
  Alta: { 'pt-BR': 'Alta', 'en-US': 'High', 'es-ES': 'Alta' },
  'Muito alta': { 'pt-BR': 'Muito alta', 'en-US': 'Very high', 'es-ES': 'Muy alta' },
  'Moderada a alta': { 'pt-BR': 'Moderada a alta', 'en-US': 'Moderate to high', 'es-ES': 'Moderada a alta' },
  Baixa: { 'pt-BR': 'Baixa', 'en-US': 'Low', 'es-ES': 'Baja' }
};

function normalizeOperationalKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const OPERATIONAL_TRANSLATIONS_NORMALIZED = Object.entries(OPERATIONAL_TRANSLATIONS).reduce<
  Record<string, { 'pt-BR': string; 'en-US': string; 'es-ES': string }>
>((acc, [key, value]) => {
  acc[normalizeOperationalKey(key)] = value;
  return acc;
}, {});

export function localizeOperationalText(text: string, locale: SupportedLocale): string {
  if (!text) {
    return text;
  }

  const trailing = text.match(/[.!?]+$/)?.[0] || '';
  const baseText = trailing ? text.slice(0, -trailing.length) : text;
  const normalized = normalizeOperationalKey(baseText);
  const translated = OPERATIONAL_TRANSLATIONS[text]?.[locale] || OPERATIONAL_TRANSLATIONS_NORMALIZED[normalized]?.[locale];

  if (!translated) {
    return text;
  }

  return `${translated}${trailing}`;
}

export function localizeEventTitle(title: string, locale: SupportedLocale): string {
  if (!title) {
    return title;
  }

  const weeklyOpen = 'Reabertura semanal do mercado';
  const weeklyClose = 'Fechamento semanal do mercado';
  if (title === weeklyOpen) {
    return t(locale, 'timeline.weeklyOpen');
  }
  if (title === weeklyClose) {
    return t(locale, 'timeline.weeklyClose');
  }

  const opening = title.match(/^Abertura\s+(.+)$/i);
  if (opening) {
    return t(locale, 'timeline.opening', { session: localizeSessionLabel(opening[1].trim(), locale) });
  }

  const closing = title.match(/^Fechamento\s+(.+)$/i);
  if (closing) {
    const session = localizeSessionLabel(closing[1].trim(), locale);
    if (locale === 'pt-BR') {
      return `Fechamento ${session}`;
    }
    if (locale === 'es-ES') {
      return `Cierre ${session}`;
    }
    return `${session} close`;
  }

  const overlapStart = title.match(/^Inicio da Sobreposicao\s+(.+)$/i);
  if (overlapStart) {
    return t(locale, 'timeline.overlapStart', { label: localizeOperationalText(overlapStart[1].trim(), locale) });
  }

  const overlapEnd = title.match(/^Fim da Sobreposicao\s+(.+)$/i);
  if (overlapEnd) {
    return t(locale, 'timeline.overlapEnd', { label: localizeOperationalText(overlapEnd[1].trim(), locale) });
  }

  return localizeOperationalText(title, locale);
}
