import { DateTime } from 'luxon';
import { localizeOperationalText, type SupportedLocale } from '@/lib/i18n';
import type { CurrentSession, MarketState, OverlapWindow, SessionWindow } from '@/types/dashboard';

export type TimelineMode = 'hoje' | '24h' | 'semana';

export const LEAD_OPTIONS: Array<5 | 10 | 15 | 30> = [5, 10, 15, 30];

export interface TimelineRange {
  start: DateTime;
  end: DateTime;
  totalMs: number;
}

export interface SessionInsight {
  liquidity: string;
  behavior: string;
  assets: string[];
}

const SESSION_INSIGHTS: Record<SessionWindow['id'], SessionInsight> = {
  sydney: {
    liquidity: 'Baixa a moderada',
    behavior: 'Ajustes iniciais e transicao para fluxo asiatico',
    assets: ['AUD/USD', 'NZD/USD', 'USD/JPY', 'JP225']
  },
  tokyo: {
    liquidity: 'Moderada',
    behavior: 'Consolidacao, range tecnico e rompimentos pontuais',
    assets: ['USD/JPY', 'AUD/USD', 'NZD/USD', 'JP225', 'HK50']
  },
  london: {
    liquidity: 'Alta',
    behavior: 'Rompimentos iniciais e expansao do range',
    assets: ['EUR/USD', 'GBP/USD', 'GER40', 'XAUUSD']
  },
  new_york: {
    liquidity: 'Muito alta',
    behavior: 'Expansao forte, pullbacks e fluxo institucional intenso',
    assets: ['US100', 'US500', 'EUR/USD', 'GBP/USD', 'XAUUSD']
  }
};

export function getRangeForMode(mode: TimelineMode, now: DateTime): TimelineRange {
  if (mode === '24h') {
    const start = now.minus({ hours: 12 }).startOf('minute');
    const end = now.plus({ hours: 12 }).endOf('minute');
    return { start, end, totalMs: end.toMillis() - start.toMillis() };
  }

  if (mode === 'semana') {
    const start = now.startOf('week');
    const end = start.plus({ days: 7 });
    return { start, end, totalMs: end.toMillis() - start.toMillis() };
  }

  const start = now.startOf('day');
  const end = start.plus({ days: 1 });
  return { start, end, totalMs: end.toMillis() - start.toMillis() };
}

export function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function toPercent(timeIso: string, range: TimelineRange) {
  const positionMs = DateTime.fromISO(timeIso, { setZone: true }).toMillis() - range.start.toMillis();
  return clampPercent((positionMs / range.totalMs) * 100);
}

export function intersectsRange(startIso: string, endIso: string, range: TimelineRange) {
  const start = DateTime.fromISO(startIso, { setZone: true });
  const end = DateTime.fromISO(endIso, { setZone: true });
  return end > range.start && start < range.end;
}

export function getSessionInsight(sessionId: SessionWindow['id'], locale: SupportedLocale = 'pt-BR') {
  const base = SESSION_INSIGHTS[sessionId];
  return {
    liquidity: localizeOperationalText(base.liquidity, locale),
    behavior: localizeOperationalText(base.behavior, locale),
    assets: base.assets
  };
}

export function getSessionStatusLabel(now: DateTime, startIso: string, endIso: string, locale: SupportedLocale = 'pt-BR') {
  const start = DateTime.fromISO(startIso, { setZone: true });
  const end = DateTime.fromISO(endIso, { setZone: true });

  if (now >= start && now < end) {
    return localizeOperationalText('Ativa agora', locale);
  }

  if (start > now) {
    return localizeOperationalText('Proxima', locale);
  }

  return localizeOperationalText('Encerrada', locale);
}

export function getOverlapLabel(overlaps: OverlapWindow[], sessionId: SessionWindow['id'], locale: SupportedLocale = 'pt-BR') {
  const related = overlaps.filter((overlap) => overlap.sessions.includes(sessionId));
  if (!related.length) {
    return localizeOperationalText('Sem sobreposicao', locale);
  }

  const active = related.find((item) => item.isActive);
  if (active) {
    return `${localizeOperationalText(active.label, locale)} (${localizeOperationalText('ativa', locale)})`;
  }

  return localizeOperationalText(related[0].label, locale);
}

export function getSessionAlarmEnabled(sessionAlarm?: {
  open?: boolean;
  close?: boolean;
  beforeMinutes?: Array<5 | 10 | 15 | 30>;
}) {
  if (!sessionAlarm) {
    return false;
  }

  return Boolean(sessionAlarm.open || sessionAlarm.close || (sessionAlarm.beforeMinutes?.length ?? 0) > 0);
}

export function getCurrentPhaseLabel(currentSession: CurrentSession, marketState: MarketState, locale: SupportedLocale = 'pt-BR') {
  if (!marketState.isOpen || currentSession.id === 'closed') {
    return localizeOperationalText('Mercado fechado', locale);
  }

  if (currentSession.id === 'gold') {
    return localizeOperationalText('Janela de ouro', locale);
  }

  if (currentSession.id === 'london') {
    return localizeOperationalText('Expansao Europeia', locale);
  }

  if (currentSession.id === 'new_york') {
    return localizeOperationalText('Movimento Americano', locale);
  }

  if (currentSession.id === 'tokyo') {
    return localizeOperationalText('Range Asiatico', locale);
  }

  return localizeOperationalText('Transicao', locale);
}
