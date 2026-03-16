import { memo, useMemo } from 'react';
import { DateTime } from 'luxon';
import { Clock3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useLiveNow } from '@/hooks/useLiveNow';
import { localizeOperationalText, localizeSessionLabel, t, type SupportedLocale } from '@/lib/i18n';
import {
  detectBrowserTimezone,
  formatTimezoneCityLabel,
  readStoredTimezoneSelection,
  resolveTimezoneFromCityValue
} from '@/lib/timezone-city-options';
import { cn } from '@/lib/utils';
import type { ClockItem, MarketState, OverlapWindow, Preferences, SessionWindow } from '@/types/dashboard';

interface WorldClocksProps {
  clocks: ClockItem[];
  seedNowIso: string;
  baseTimezone: string;
  locale: SupportedLocale;
  preferences: Preferences;
  marketState: MarketState;
  sessions: SessionWindow[];
  overlaps: OverlapWindow[];
}

const CLOCK_TO_SESSION: Partial<Record<ClockItem['id'], SessionWindow['id']>> = {
  london: 'london',
  new_york: 'new_york',
  sydney: 'sydney',
  tokyo: 'tokyo'
};

function getLocalizedClockLabel(clockId: string, fallback: string, locale: SupportedLocale) {
  if (clockId === 'london') {
    return locale === 'en-US' ? 'London' : 'Londres';
  }
  if (clockId === 'new_york') {
    return locale === 'pt-BR' ? 'Nova York' : 'New York';
  }
  if (clockId === 'sydney') {
    return 'Sydney';
  }
  if (clockId === 'tokyo') {
    return locale === 'en-US' ? 'Tokyo' : locale === 'es-ES' ? 'Tokio' : 'Toquio';
  }
  return fallback;
}

function toSessionId(value: string): SessionWindow['id'] | null {
  if (value === 'sydney' || value === 'tokyo' || value === 'london' || value === 'new_york') {
    return value;
  }
  return null;
}

const CLOCK_DISPLAY_ORDER = ['london', 'new_york', 'sydney', 'tokyo'] as const;
const CLOCK_DEFAULTS: Record<(typeof CLOCK_DISPLAY_ORDER)[number], Pick<ClockItem, 'label' | 'timezone'>> = {
  london: { label: 'Londres', timezone: 'Europe/London' },
  new_york: { label: 'Nova York', timezone: 'America/New_York' },
  sydney: { label: 'Sydney', timezone: 'Australia/Sydney' },
  tokyo: { label: 'Toquio', timezone: 'Asia/Tokyo' }
};

export const WorldClocks = memo(function WorldClocks({
  clocks,
  seedNowIso,
  baseTimezone,
  locale,
  preferences,
  marketState,
  sessions,
  overlaps
}: WorldClocksProps) {
  const nowIso = useLiveNow(seedNowIso, 1000);
  const marketOpen = marketState.isOpen;

  const activeSessionIds = new Set(sessions.filter((session) => session.isActive).map((session) => session.id));
  const orderedClocks = useMemo(() => {
    const map = new Map(clocks.map((clock) => [clock.id, clock]));
    const storedSelection = readStoredTimezoneSelection();
    const browserTimezone = detectBrowserTimezone();
    const fallbackTimezone = preferences.baseTimezone || baseTimezone;
    const lockEnabled = storedSelection.lock || Boolean(preferences.lockBaseTimezone);
    const storedCity = resolveTimezoneFromCityValue(storedSelection.cityValue);
    const primaryTimezone = lockEnabled
      ? storedSelection.timezone || fallbackTimezone
      : browserTimezone || fallbackTimezone;
    const primaryLabel = lockEnabled
      ? storedCity?.value
        ? storedCity.value.split('__')[0] || formatTimezoneCityLabel(primaryTimezone)
        : formatTimezoneCityLabel(primaryTimezone)
      : formatTimezoneCityLabel(primaryTimezone);
    const primaryClock: ClockItem = {
      id: 'local',
      label: primaryLabel,
      timezone: primaryTimezone,
      time: DateTime.fromISO(nowIso, { setZone: true }).setZone(primaryTimezone).toFormat('HH:mm:ss')
    };

    const secondaryClocks = CLOCK_DISPLAY_ORDER.map((id) => {
      const existing = map.get(id);
      if (existing) {
        return existing;
      }

      const fallback = CLOCK_DEFAULTS[id];
      return {
        id,
        label: fallback.label,
        timezone: fallback.timezone,
        time: DateTime.fromISO(nowIso, { setZone: true }).setZone(fallback.timezone).toFormat('HH:mm:ss')
      } as ClockItem;
    });

    return [primaryClock, ...secondaryClocks];
  }, [baseTimezone, clocks, nowIso, preferences.baseTimezone, preferences.lockBaseTimezone]);

  const activeOverlap =
    overlaps.find((overlap) => overlap.isActive) ||
    overlaps.find((overlap) => overlap.sessions.every((id) => activeSessionIds.has(id as SessionWindow['id']))) ||
    null;
  const overlapSessionIds = new Set(
    (activeOverlap?.sessions || []).map((sessionId) => toSessionId(sessionId)).filter(Boolean) as SessionWindow['id'][]
  );

  const activeSessionTags = Array.from(activeSessionIds).filter(Boolean);

  return (
    <div className="space-y-3">
      {marketOpen && activeOverlap ? (
        <div className="rounded-lg border border-warning/60 bg-warning/10 px-3 py-2 text-center text-sm font-medium text-gold">
          {t(locale, 'world.overlapNow', { label: localizeOperationalText(activeOverlap.label, locale) })}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <div className="grid min-w-[1320px] grid-cols-5 gap-3">
        {orderedClocks.map((clock) => {
          const sessionId = CLOCK_TO_SESSION[clock.id];
          const isActive = Boolean(marketOpen && sessionId && activeSessionIds.has(sessionId));
          const isOverlap = Boolean(isActive && sessionId && overlapSessionIds.has(sessionId));
          const displayLabel = getLocalizedClockLabel(clock.id, clock.label, locale);

          return (
            <Card
              key={clock.id}
              className={cn(
                'relative h-full border-border/70 bg-slate-950/65 transition-all duration-200',
                !marketOpen && 'opacity-55 saturate-50',
                isActive && 'border-cyan/70 bg-cyan/10 shadow-[0_0_18px_rgba(34,211,238,0.28)]',
                isOverlap && 'border-warning/70 bg-warning/10 shadow-[0_0_22px_rgba(245,158,11,0.34)]'
              )}
            >
              <CardContent className="py-4">
                <div className="mb-2 flex items-center gap-2 text-mutedForeground">
                  <Clock3 className={cn('h-4 w-4 text-cyan', isOverlap && 'text-warning')} />
                  <span className={cn('text-sm tracking-wide', isActive && 'text-slate-200')}>{displayLabel}</span>
                  {isActive ? (
                    <span
                      className={cn(
                        'ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        isOverlap ? 'bg-warning text-slate-950' : 'bg-cyan text-slate-950'
                      )}
                    >
                      {t(locale, 'world.activeBadge')}
                    </span>
                  ) : null}
                </div>
                <div
                  className={cn(
                    'font-mono text-2xl font-semibold tracking-wide text-slate-100 md:text-3xl',
                    isActive && !isOverlap && 'text-cyan drop-shadow-[0_0_10px_rgba(34,211,238,0.45)]',
                    isOverlap && 'text-warning drop-shadow-[0_0_12px_rgba(245,158,11,0.55)]'
                  )}
                >
                  {DateTime.fromISO(nowIso, { setZone: true }).setZone(clock.timezone).toFormat('HH:mm:ss')}
                </div>
              </CardContent>
              {isActive ? (
                <span
                  className={cn(
                    'absolute right-2 top-2 inline-flex h-2.5 w-2.5 rounded-full animate-pulse',
                    isOverlap ? 'bg-warning' : 'bg-cyan'
                  )}
                />
              ) : null}
            </Card>
          );
        })}
        </div>
      </div>

      {marketOpen && activeSessionTags.length ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-slate-950/50 px-3 py-2 text-xs">
          <span className="uppercase tracking-wide text-mutedForeground">{t(locale, 'world.activeSessions')}</span>
          {activeSessionTags.map((sessionId) => (
            <span key={sessionId} className="rounded-full border border-cyan/40 bg-cyan/10 px-2 py-0.5 text-cyan">
              {localizeSessionLabel(
                sessionId === 'sydney'
                  ? 'Sessao de Sydney'
                  : sessionId === 'tokyo'
                    ? 'Sessao Asiatica'
                    : sessionId === 'london'
                      ? 'Sessao Europeia'
                      : 'Sessao Americana',
                locale
              )}
            </span>
          ))}
        </div>
      ) : null}

      {!marketOpen ? (
        <div className="rounded-lg border border-border/70 bg-slate-950/50 px-3 py-2 text-xs text-mutedForeground">
          {t(locale, 'world.closedHint')}
        </div>
      ) : null}
    </div>
  );
});
