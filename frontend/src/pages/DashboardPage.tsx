import { memo, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Radar } from 'lucide-react';
import { DateTime } from 'luxon';
import { useAlertNotifications } from '@/hooks/useAlertNotifications';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useLiveNow } from '@/hooks/useLiveNow';
import {
  detectBrowserTimezone,
  findTimezoneOptionByTimezone,
  persistStoredTimezoneSelection,
  readStoredTimezoneSelection,
  resolveTimezoneFromCityValue,
  TIMEZONE_CITY_OPTIONS
} from '@/lib/timezone-city-options';
import { localizeSessionLabel, t, type SupportedLocale } from '@/lib/i18n';
import {
  persistStoredLocaleSelection,
  readStoredLocaleSelection,
  resolveEffectiveLocale
} from '@/lib/locale-selection';
import { formatCountdown } from '@/lib/utils';
import { AlertCard } from '@/components/AlertCard';
import { AssetRadar } from '@/components/AssetRadar';
import { CurrentSessionCard } from '@/components/CurrentSessionCard';
import { FloatingChatAssistant } from '@/components/FloatingChatAssistant';
import { OperationalPlanner } from '@/components/OperationalPlanner';
import { SessionPhaseCard } from '@/components/SessionPhaseCard';
import { SessionTimeline } from '@/components/SessionTimeline';
import { WorldClocks } from '@/components/WorldClocks';
import type { Preferences } from '@/types/dashboard';

const HeaderStatus = memo(function HeaderStatus({
  seedNowIso,
  baseTimezone,
  locale,
  marketState,
  nextSession
}: {
  seedNowIso: string;
  baseTimezone: string;
  locale: SupportedLocale;
  marketState: {
    isOpen: boolean;
    mode: 'open' | 'week_closing' | 'weekend_closed' | 'pre_open';
    statusLabel: string;
    nextGlobalOpenIso: string | null;
  };
  nextSession: { label: string; startIso: string } | null;
}) {
  const nowIso = useLiveNow(seedNowIso, 1000);
  const now = DateTime.fromISO(nowIso, { setZone: true });

  const nextSessionCountdown = nextSession
    ? Math.max(0, Math.floor((DateTime.fromISO(nextSession.startIso, { setZone: true }).toMillis() - now.toMillis()) / 1000))
    : null;

  const reopenCountdown = marketState.nextGlobalOpenIso
    ? Math.max(0, Math.floor((DateTime.fromISO(marketState.nextGlobalOpenIso, { setZone: true }).toMillis() - now.toMillis()) / 1000))
    : null;

  const headline = marketState.isOpen
    ? t(locale, 'header.nextSession', {
        session: nextSession ? localizeSessionLabel(nextSession.label, locale) : t(locale, 'current.na'),
        countdown: formatCountdown(nextSessionCountdown ?? 0)
      })
    : t(locale, 'header.marketClosed', { countdown: formatCountdown(reopenCountdown ?? 0) });

  const subline = marketState.isOpen
    ? marketState.mode === 'week_closing'
      ? t(locale, 'header.marketOpen')
      : t(locale, 'header.marketOpen')
    : t(locale, 'header.reopen', {
        session: localizeSessionLabel(nextSession?.label || 'Sessao Asiatica', locale)
      });

  const timestampLabel = now.setZone(baseTimezone).toFormat("dd/MM/yyyy 'as' HH:mm:ss");

  return (
    <div className="rounded-lg border border-border/70 bg-black/25 px-4 py-2 text-left lg:text-right">
      <p className="text-sm text-mutedForeground">{headline}</p>
      <p className="font-mono text-lg font-semibold text-gold">{subline}</p>
      <p className="text-xs text-mutedForeground">{t(locale, 'header.updatedAt', { timestamp: timestampLabel })}</p>
    </div>
  );
});

const TimezoneLockMenu = memo(function TimezoneLockMenu({
  preferences,
  effectiveTimezone,
  locale,
  onUpdatePreferences
}: {
  preferences: Preferences;
  effectiveTimezone: string;
  locale: SupportedLocale;
  onUpdatePreferences: (payload: Partial<Preferences>) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const AUTO_VALUE = '__auto__';
  const CUSTOM_VALUE = '__custom__';

  const selectedOption = useMemo(
    () => findTimezoneOptionByTimezone(preferences.baseTimezone || effectiveTimezone),
    [effectiveTimezone, preferences.baseTimezone]
  );
  const storedSelection = useMemo(() => readStoredTimezoneSelection(), [preferences.baseTimezone, preferences.lockBaseTimezone]);
  const storedCityOption = useMemo(
    () => TIMEZONE_CITY_OPTIONS.find((item) => item.value === storedSelection.cityValue) || null,
    [storedSelection.cityValue]
  );
  const effectiveLock = storedSelection.lock || Boolean(preferences.lockBaseTimezone);
  const effectiveSelectedTimezone = storedSelection.timezone || preferences.baseTimezone || effectiveTimezone;
  const fallbackOption = findTimezoneOptionByTimezone(effectiveSelectedTimezone);

  const selectedValue = effectiveLock
    ? storedCityOption && storedCityOption.timezone === effectiveSelectedTimezone
      ? storedCityOption.value
      : fallbackOption?.value || selectedOption?.value || CUSTOM_VALUE
    : AUTO_VALUE;
  const [uiValue, setUiValue] = useState(selectedValue);

  useEffect(() => {
    setUiValue(selectedValue);
  }, [selectedValue]);

  useEffect(() => {
    if (effectiveLock) {
      persistStoredTimezoneSelection({
        lock: true,
        timezone: effectiveSelectedTimezone,
        cityValue: storedCityOption?.value || fallbackOption?.value || null
      });
      return;
    }

    persistStoredTimezoneSelection({ lock: false, timezone: null, cityValue: null });
  }, [effectiveLock, effectiveSelectedTimezone, fallbackOption?.value, storedCityOption?.value]);

  const handleChange = async (nextValue: string) => {
    if (saving) {
      return;
    }

    setUiValue(nextValue);
    setSaving(true);
    try {
      if (nextValue === AUTO_VALUE) {
        persistStoredTimezoneSelection({ lock: false, timezone: null, cityValue: null });
        await onUpdatePreferences({ lockBaseTimezone: false });
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
        return;
      }

      const option = TIMEZONE_CITY_OPTIONS.find((item) => item.value === nextValue);
      const resolved = option || resolveTimezoneFromCityValue(nextValue);
      if (!resolved) {
        return;
      }

      persistStoredTimezoneSelection({
        lock: true,
        timezone: resolved.timezone,
        cityValue: option?.value || resolved.value
      });
      await onUpdatePreferences({
        baseTimezone: resolved.timezone,
        lockBaseTimezone: true
      });
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch {
      persistStoredTimezoneSelection({
        lock: effectiveLock,
        timezone: effectiveSelectedTimezone,
        cityValue: fallbackOption?.value || selectedOption?.value || null
      });
      setUiValue(selectedValue);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full rounded-md border border-border/50 bg-black/20 px-2 py-1.5 text-left lg:w-auto">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] uppercase tracking-wider text-mutedForeground">{t(locale, 'timezone.label')}</span>
        <span className={`text-[10px] ${effectiveLock ? 'text-gold' : 'text-cyan'}`}>
          {effectiveLock ? t(locale, 'timezone.locked') : t(locale, 'timezone.auto')}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <select
          className="h-7 w-full rounded-md border border-border/60 bg-background/60 px-2 text-[11px] text-slate-100 outline-none focus:border-cyan/70 lg:w-[220px]"
          value={uiValue}
          disabled={saving}
          onChange={(event) => void handleChange(event.target.value)}
        >
          <option value={AUTO_VALUE}>{t(locale, 'timezone.optionAuto')}</option>
          {TIMEZONE_CITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          {selectedValue === CUSTOM_VALUE ? (
            <option value={CUSTOM_VALUE}>
              {t(locale, 'timezone.optionCustom', {
                timezone: effectiveSelectedTimezone || detectBrowserTimezone() || effectiveTimezone
              })}
            </option>
          ) : null}
        </select>
      </div>
    </div>
  );
});

const LanguageMenu = memo(function LanguageMenu({
  baseTimezone,
  locale,
  onLocaleChange
}: {
  baseTimezone: string;
  locale: SupportedLocale;
  onLocaleChange: (next: SupportedLocale) => void;
}) {
  const AUTO_VALUE = '__auto__';
  const [uiValue, setUiValue] = useState<string>(() => {
    const stored = readStoredLocaleSelection();
    return stored.mode === 'manual' && stored.locale ? stored.locale : AUTO_VALUE;
  });

  useEffect(() => {
    const stored = readStoredLocaleSelection();
    const nextValue = stored.mode === 'manual' && stored.locale ? stored.locale : AUTO_VALUE;
    setUiValue(nextValue);
  }, [baseTimezone, locale]);

  const isAuto = uiValue === AUTO_VALUE;

  const handleChange = (nextValue: string) => {
    setUiValue(nextValue);
    if (nextValue === AUTO_VALUE) {
      persistStoredLocaleSelection({ mode: 'auto', locale: null });
      onLocaleChange(resolveEffectiveLocale(baseTimezone, { mode: 'auto', locale: null }));
      return;
    }

    const manualLocale = nextValue as SupportedLocale;
    persistStoredLocaleSelection({ mode: 'manual', locale: manualLocale });
    onLocaleChange(manualLocale);
  };

  return (
    <div className="w-full rounded-md border border-border/50 bg-black/20 px-2 py-1.5 text-left lg:w-auto">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] uppercase tracking-wider text-mutedForeground">{t(locale, 'language.label')}</span>
        <span className={`text-[10px] ${isAuto ? 'text-cyan' : 'text-gold'}`}>
          {isAuto ? t(locale, 'language.auto') : t(locale, 'language.manual')}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <select
          className="h-7 w-full rounded-md border border-border/60 bg-background/60 px-2 text-[11px] text-slate-100 outline-none focus:border-cyan/70 lg:w-[200px]"
          value={uiValue}
          onChange={(event) => handleChange(event.target.value)}
        >
          <option value={AUTO_VALUE}>{t(locale, 'language.optionAuto')}</option>
          <option value="pt-BR">{t(locale, 'language.option.pt-BR')}</option>
          <option value="en-US">{t(locale, 'language.option.en-US')}</option>
          <option value="es-ES">{t(locale, 'language.option.es-ES')}</option>
        </select>
      </div>
    </div>
  );
});

export function DashboardPage() {
  const { data, loading, error, savePlanner, savePreferences, queryAssistant } = useDashboardData();

  useAlertNotifications(data?.nextAlert ?? null);

  const fallbackTimezone = useMemo(() => {
    const storedTimezone = readStoredTimezoneSelection();
    if (storedTimezone.lock && storedTimezone.timezone) {
      return storedTimezone.timezone;
    }
    return detectBrowserTimezone() || 'America/Sao_Paulo';
  }, []);
  const effectiveTimezoneForLocale = data?.baseTimezone || fallbackTimezone;
  const [locale, setLocale] = useState<SupportedLocale>(() => resolveEffectiveLocale(effectiveTimezoneForLocale));

  useEffect(() => {
    setLocale(resolveEffectiveLocale(effectiveTimezoneForLocale));
  }, [effectiveTimezoneForLocale]);

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg border border-border bg-card/70 px-4 py-3 text-sm text-mutedForeground">{t('en-US', 'loading.dashboard')}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg border border-danger/60 bg-danger/10 px-4 py-3 text-sm text-danger">
          {t('en-US', 'error.dashboard')} {error ?? t('en-US', 'error.backendUnavailable')}
        </div>
      </div>
    );
  }

  return (
    <main className="h-[100dvh] w-full overflow-y-auto px-3 pb-3 pt-3 md:px-4 md:pt-4">
      <div className="flex h-full flex-col gap-4">
        <header className="rounded-xl border border-border/80 bg-[linear-gradient(135deg,_rgba(11,35,75,.95),_rgba(7,14,30,.96)_55%,_rgba(45,28,12,.85))] px-4 py-4 shadow-panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full border border-cyan/60 bg-cyan/10 p-2">
                <Radar className="h-6 w-6 text-cyan" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-wide text-slate-50">Forex Session Radar</h1>
                <p className="text-sm text-slate-300">{t(locale, 'app.subtitle')}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 lg:items-end">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
                <TimezoneLockMenu
                  preferences={data.preferences}
                  effectiveTimezone={data.baseTimezone}
                  locale={locale}
                  onUpdatePreferences={savePreferences}
                />
                <LanguageMenu baseTimezone={data.baseTimezone} locale={locale} onLocaleChange={setLocale} />
              </div>
              <HeaderStatus
                seedNowIso={data.nowIso}
                baseTimezone={data.baseTimezone}
                locale={locale}
                marketState={data.marketState}
                nextSession={data.nextSession}
              />
            </div>
          </div>
          {error ? (
            <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-warning/60 bg-warning/10 px-3 py-2 text-xs text-warning">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          ) : null}
        </header>

        <section className="animate-fadeUp">
          <WorldClocks
            clocks={data.clocks}
            seedNowIso={data.nowIso}
            baseTimezone={data.baseTimezone}
            locale={locale}
            preferences={data.preferences}
            marketState={data.marketState}
            sessions={data.timeline.sessions}
            overlaps={data.timeline.overlaps}
          />
        </section>

        <section className="animate-fadeUp">
          <SessionTimeline
            seedNowIso={data.nowIso}
            baseTimezone={data.baseTimezone}
            locale={locale}
            sessions={data.timeline.sessions}
            isPaused={data.timeline.isPaused}
            marketState={data.marketState}
            currentSession={data.currentSession}
            preferences={data.preferences}
            upcomingEvents={data.upcomingEvents}
            onUpdatePreferences={savePreferences}
          />
        </section>

        <section className="grid flex-1 grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <CurrentSessionCard
              session={data.currentSession}
              marketState={data.marketState}
              nextSession={data.nextSession}
              lastSession={data.lastSession}
              seedNowIso={data.nowIso}
              baseTimezone={data.baseTimezone}
              locale={locale}
            />
          </div>
          <div className="xl:col-span-5">
            <AssetRadar radar={data.radar} marketOpen={data.marketState.isOpen} locale={locale} />
          </div>
          <div className="xl:col-span-3">
            <AlertCard
              nextAlert={data.nextAlert}
              preferences={data.preferences}
              seedNowIso={data.nowIso}
              baseTimezone={data.baseTimezone}
              locale={locale}
              marketOpen={data.marketState.isOpen}
              marketState={data.marketState}
              onUpdatePreferences={savePreferences}
            />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <OperationalPlanner planner={data.planner} locale={locale} onSavePlanner={savePlanner} />
          </div>
          <div className="xl:col-span-4">
            <SessionPhaseCard
              session={data.currentSession}
              marketState={data.marketState}
              nextSession={data.nextSession}
              lastSession={data.lastSession}
              seedNowIso={data.nowIso}
              baseTimezone={data.baseTimezone}
              locale={locale}
            />
          </div>
        </section>
      </div>

      <FloatingChatAssistant dashboard={data} locale={locale} onAsk={queryAssistant} />
    </main>
  );
}
