import { DateTime } from 'luxon';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLiveNow } from '@/hooks/useLiveNow';
import { localizeMarketContextLabel, localizeOperationalText, localizeSessionLabel, t, type SupportedLocale } from '@/lib/i18n';
import { formatCountdown } from '@/lib/utils';
import type { CurrentSession, LastSession, MarketState, NextSession } from '@/types/dashboard';

interface SessionPhaseCardProps {
  session: CurrentSession;
  marketState: MarketState;
  nextSession: NextSession | null;
  lastSession: LastSession | null;
  seedNowIso: string;
  baseTimezone: string;
  locale: SupportedLocale;
}

interface PhaseDefinition {
  name: string;
  untilPercent: number;
  behavior: string;
  liquidity: string;
}

function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}min`;
}

function localizePhaseList(list: PhaseDefinition[], locale: SupportedLocale): PhaseDefinition[] {
  return list.map((item) => ({
    ...item,
    name: localizeOperationalText(item.name, locale),
    behavior: localizeOperationalText(item.behavior, locale),
    liquidity: localizeOperationalText(item.liquidity, locale)
  }));
}

function getPhaseMap(sessionId: string, locale: SupportedLocale): PhaseDefinition[] {
  if (sessionId === 'new_york') {
    return localizePhaseList([
      { name: 'Abertura', untilPercent: 0.15, behavior: 'Rompimentos iniciais e ajuste de preco', liquidity: 'Alta' },
      { name: 'Expansao', untilPercent: 0.35, behavior: 'Expansao de volatilidade e continuidade', liquidity: 'Muito alta' },
      { name: 'Meio do Dia', untilPercent: 0.6, behavior: 'Consolidacao e seletividade maior', liquidity: 'Moderada' },
      { name: 'Movimento da Tarde', untilPercent: 0.85, behavior: 'Continuacao moderada ou reversoes', liquidity: 'Moderada' },
      { name: 'Encerramento', untilPercent: 1, behavior: 'Desaceleracao e ajuste final', liquidity: 'Baixa a moderada' }
    ], locale);
  }

  if (sessionId === 'london') {
    return localizePhaseList([
      { name: 'Abertura Europeia', untilPercent: 0.2, behavior: 'Rompimentos iniciais da sessao', liquidity: 'Alta' },
      { name: 'Expansao Inicial', untilPercent: 0.45, behavior: 'Expansao do range asiatico', liquidity: 'Alta' },
      { name: 'Continuacao', untilPercent: 0.7, behavior: 'Fluxo direcional com pullbacks', liquidity: 'Moderada a alta' },
      { name: 'Pre-Sobreposicao', untilPercent: 0.88, behavior: 'Ajustes e preparacao para NY', liquidity: 'Moderada' },
      { name: 'Sobreposicao com Nova York', untilPercent: 1, behavior: 'Movimentos mais fortes e liquidos', liquidity: 'Muito alta' }
    ], locale);
  }

  if (sessionId === 'tokyo') {
    return localizePhaseList([
      { name: 'Abertura Asiatica', untilPercent: 0.2, behavior: 'Ajustes iniciais e formacao de faixa', liquidity: 'Moderada' },
      { name: 'Consolidacao', untilPercent: 0.55, behavior: 'Range com respeito a niveis tecnicos', liquidity: 'Baixa a moderada' },
      { name: 'Desenvolvimento', untilPercent: 0.82, behavior: 'Movimentos direcionais pontuais', liquidity: 'Moderada' },
      { name: 'Final da Sessao', untilPercent: 1, behavior: 'Desaceleracao e transicao de fluxo', liquidity: 'Baixa' }
    ], locale);
  }

  if (sessionId === 'sydney') {
    return localizePhaseList([
      { name: 'Abertura de Sydney', untilPercent: 0.2, behavior: 'Ajustes iniciais e precificacao de risco', liquidity: 'Moderada' },
      { name: 'Formacao de Faixa', untilPercent: 0.5, behavior: 'Consolidacao com movimentos tecnicos curtos', liquidity: 'Baixa a moderada' },
      { name: 'Desenvolvimento', untilPercent: 0.8, behavior: 'Movimentos direcionais mais limpos em pares AUD/NZD', liquidity: 'Moderada' },
      { name: 'Transicao para Asia', untilPercent: 1, behavior: 'Preparacao para fluxo de Toquio', liquidity: 'Baixa' }
    ], locale);
  }

  return localizePhaseList([
    { name: 'Inicio da Janela', untilPercent: 0.5, behavior: 'Aceleracao institucional', liquidity: 'Muito alta' },
    { name: 'Final da Janela', untilPercent: 1, behavior: 'Movimentos estendidos e ajuste', liquidity: 'Alta' }
  ], locale);
}

export function SessionPhaseCard({
  session,
  marketState,
  nextSession,
  lastSession,
  seedNowIso,
  baseTimezone,
  locale
}: SessionPhaseCardProps) {
  const nowIso = useLiveNow(seedNowIso, 1000);
  const now = DateTime.fromISO(nowIso, { setZone: true }).setZone(baseTimezone);

  if (!marketState.isOpen) {
    const remainingToOpen = marketState.nextGlobalOpenIso
      ? Math.max(0, Math.floor((DateTime.fromISO(marketState.nextGlobalOpenIso, { setZone: true }).toMillis() - now.toMillis()) / 1000))
      : 0;

    return (
      <Card className="h-full border-border/70">
        <CardHeader>
          <CardTitle>{t(locale, 'phase.marketTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-mutedForeground">{t(locale, 'phase.status')}</p>
            <Badge variant={marketState.mode === 'pre_open' ? 'warning' : 'neutral'}>{t(locale, 'phase.closed')}</Badge>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-mutedForeground">{t(locale, 'phase.context')}</p>
            <p className="text-sm text-slate-200">{localizeMarketContextLabel(marketState.contextLabel, locale)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-mutedForeground">{t(locale, 'phase.lastSession')}</p>
            <p className="text-sm text-slate-200">{lastSession?.label ? localizeSessionLabel(lastSession.label, locale) : t(locale, 'current.na')}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-mutedForeground">{t(locale, 'phase.nextEvent')}</p>
            <p className="text-sm text-slate-200">
              {t(locale, 'phase.weekOpen')} {nextSession ? `(${localizeSessionLabel(nextSession.label, locale)})` : ''}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-mutedForeground">{t(locale, 'phase.timeRemaining')}</p>
            <p className="font-mono text-base text-gold">{formatCountdown(remainingToOpen)}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!session.startIso || !session.endIso || session.id === 'closed') {
    return (
      <Card className="h-full border-border/70">
        <CardHeader>
          <CardTitle>{t(locale, 'phase.sessionTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-mutedForeground">{t(locale, 'phase.noActiveSession')}</p>
        </CardContent>
      </Card>
    );
  }

  const start = DateTime.fromISO(session.startIso, { setZone: true });
  const end = DateTime.fromISO(session.endIso, { setZone: true });

  const durationSeconds = Math.max(1, Math.floor(end.diff(start, 'seconds').seconds));
  const elapsedSeconds = Math.max(0, Math.floor(now.diff(start, 'seconds').seconds));
  const progress = Math.min(1, elapsedSeconds / durationSeconds);

  const phases = getPhaseMap(session.id, locale);
  const activePhase = phases.find((phase) => progress <= phase.untilPercent) || phases[phases.length - 1];

  const phaseBoundarySeconds = Math.floor(durationSeconds * activePhase.untilPercent);
  const secondsUntilBoundary = Math.max(0, phaseBoundarySeconds - elapsedSeconds);
  const secondsUntilClose = Math.max(0, Math.floor(end.diff(now, 'seconds').seconds));
  const showCloseCountdown = activePhase.untilPercent >= 1;

  return (
    <Card className="h-full border-border/70">
      <CardHeader>
        <CardTitle>{t(locale, 'phase.sessionTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-mutedForeground">{t(locale, 'phase.session')}</p>
          <Badge variant="default">{localizeSessionLabel(session.label, locale)}</Badge>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-mutedForeground">{t(locale, 'phase.currentPhase')}</p>
          <p className="text-lg font-semibold text-slate-100">{activePhase.name}</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-mutedForeground">{t(locale, 'phase.expectedBehavior')}</p>
          <p className="text-sm text-slate-200">{activePhase.behavior}</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-mutedForeground">{t(locale, 'phase.expectedLiquidity')}</p>
          <p className="text-sm text-slate-200">{activePhase.liquidity}</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-mutedForeground">{t(locale, 'phase.timeRemaining')}</p>
          <p className="font-mono text-base text-gold">
            {showCloseCountdown ? formatDuration(secondsUntilClose) : formatDuration(secondsUntilBoundary)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
