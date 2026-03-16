import { Badge } from '@/components/ui/badge';
import { localizeSessionLabel, t, type SupportedLocale } from '@/lib/i18n';
import type { SessionWindow } from '@/types/dashboard';

interface SessionTooltipProps {
  locale: SupportedLocale;
  session: SessionWindow;
  startLabel: string;
  endLabel: string;
  timezoneLabel: string;
  statusLabel: string;
  liquidity: string;
  behavior: string;
  assets: string[];
  overlapLabel: string;
  alarmEnabled: boolean;
}

export function SessionTooltip({
  locale,
  session,
  startLabel,
  endLabel,
  timezoneLabel,
  statusLabel,
  liquidity,
  behavior,
  assets,
  overlapLabel,
  alarmEnabled
}: SessionTooltipProps) {
  const statusKey = statusLabel.toLowerCase();
  const statusVariant =
    statusKey.includes('active') || statusKey.includes('ativa') || statusKey.includes('activa')
      ? 'success'
      : statusKey.includes('upcoming') || statusKey.includes('proxima')
        ? 'warning'
        : 'neutral';

  return (
    <div className="w-72 rounded-lg border border-border/80 bg-[#050d1d]/95 p-3 shadow-[0_12px_30px_rgba(2,10,25,.68)] backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-100">{localizeSessionLabel(session.label, locale)}</p>
        <Badge variant={statusVariant}>
          {statusLabel}
        </Badge>
      </div>

      <p className="font-mono text-xs text-mutedForeground">
        {startLabel} - {endLabel} ({timezoneLabel})
      </p>

      <div className="mt-3 space-y-1.5 text-xs text-slate-200">
        <p>
          <span className="text-mutedForeground">{t(locale, 'phase.expectedLiquidity')}:</span> {liquidity}
        </p>
        <p>
          <span className="text-mutedForeground">{t(locale, 'phase.expectedBehavior')}:</span> {behavior}
        </p>
        <p>
          <span className="text-mutedForeground">{t(locale, 'planner.favorites')}:</span> {assets.join(', ')}
        </p>
        <p>
          <span className="text-mutedForeground">{t(locale, 'timeline.overlap')}:</span> {overlapLabel}
        </p>
        <p>
          <span className="text-mutedForeground">{t(locale, 'timeline.alarm')}:</span>{' '}
          {alarmEnabled ? t(locale, 'timeline.alarmOn') : t(locale, 'timeline.alarmOff')}
        </p>
      </div>
    </div>
  );
}
