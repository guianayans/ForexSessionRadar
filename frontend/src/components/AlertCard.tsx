import { DateTime } from 'luxon';
import { Bell } from 'lucide-react';
import { formatCountdown } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useLiveNow } from '@/hooks/useLiveNow';
import { formatIsoInTimezone, localizeEventTitle, t, type SupportedLocale } from '@/lib/i18n';
import type { MarketState, NextAlert, Preferences } from '@/types/dashboard';

interface AlertCardProps {
  nextAlert: NextAlert | null;
  preferences: Preferences;
  seedNowIso: string;
  baseTimezone: string;
  locale: SupportedLocale;
  marketOpen: boolean;
  marketState: MarketState;
  onUpdatePreferences: (payload: Partial<Preferences>) => Promise<void>;
}

const leadOptions: Array<5 | 10 | 15 | 30> = [5, 10, 15, 30];

export function AlertCard({
  nextAlert,
  preferences,
  seedNowIso,
  baseTimezone,
  locale,
  marketOpen,
  marketState,
  onUpdatePreferences
}: AlertCardProps) {
  const nowIso = useLiveNow(seedNowIso, 1000);
  const liveCountdownSeconds = nextAlert
    ? Math.max(
        0,
        Math.floor(
          (DateTime.fromISO(nextAlert.triggerTimeIso, { setZone: true }).toMillis() - DateTime.fromISO(nowIso, { setZone: true }).toMillis()) / 1000
        )
      )
    : 0;
  const reopenCountdown = marketState.nextGlobalOpenIso
    ? Math.max(0, Math.floor((DateTime.fromISO(marketState.nextGlobalOpenIso, { setZone: true }).toMillis() - DateTime.fromISO(nowIso, { setZone: true }).toMillis()) / 1000))
    : 0;

  if (!marketOpen) {
    return (
      <Card className="h-full border-border/70">
        <CardHeader>
          <CardTitle>{t(locale, 'alert.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/70 bg-background/30 p-3">
            <div className="mb-1 flex items-center gap-2 text-sm text-mutedForeground">
              <Bell className="h-4 w-4 text-cyan" />
              {t(locale, 'alert.event')}
            </div>
            <p className="text-sm text-mutedForeground">{t(locale, 'alert.closedMessage')}</p>
          </div>

          <div className="rounded-lg border border-warning/45 bg-warning/10 p-3 text-sm text-slate-100">
            {t(locale, 'alert.reopenIn', { countdown: formatCountdown(reopenCountdown) })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full border-border/70">
      <CardHeader>
        <CardTitle>{t(locale, 'alert.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border/70 bg-background/30 p-3">
          <div className="mb-1 flex items-center gap-2 text-sm text-mutedForeground">
            <Bell className="h-4 w-4 text-cyan" />
            {t(locale, 'alert.event')}
          </div>
          {nextAlert ? (
            <>
              <p className="text-base font-semibold">{localizeEventTitle(nextAlert.title, locale)}</p>
              <p className="text-sm text-mutedForeground">
                {t(locale, 'alert.triggersIn', {
                  countdown: formatCountdown(liveCountdownSeconds),
                  time: formatIsoInTimezone(nextAlert.eventTimeIso, baseTimezone, locale, 'HH:mm')
                })}
              </p>
            </>
          ) : (
            <p className="text-sm text-mutedForeground">{t(locale, 'alert.noPending')}</p>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-mutedForeground">{t(locale, 'alert.leadMinutes')}</p>
          <div className="flex flex-wrap gap-2">
            {leadOptions.map((minutes) => (
              <Button
                key={minutes}
                variant={preferences.alertLeadMinutes === minutes ? 'default' : 'outline'}
                size="sm"
                onClick={() => void onUpdatePreferences({ alertLeadMinutes: minutes })}
              >
                {minutes}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={preferences.alertOnSessionOpen}
              onChange={(event) => void onUpdatePreferences({ alertOnSessionOpen: event.target.checked })}
            />
            {t(locale, 'alert.openSession')}
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={preferences.alertOnOverlapStart}
              onChange={(event) => void onUpdatePreferences({ alertOnOverlapStart: event.target.checked })}
            />
            {t(locale, 'alert.overlapStart')}
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={preferences.alertOnIdealWindowEnd}
              onChange={(event) => void onUpdatePreferences({ alertOnIdealWindowEnd: event.target.checked })}
            />
            {t(locale, 'alert.idealWindowEnd')}
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
