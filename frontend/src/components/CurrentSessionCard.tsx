import { useEffect, useRef, useState } from 'react';
import { DateTime } from 'luxon';
import { Area, AreaChart, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLiveNow } from '@/hooks/useLiveNow';
import { formatIsoInTimezone, localizeSessionLabel, t, type SupportedLocale } from '@/lib/i18n';
import { formatCountdown } from '@/lib/utils';
import type { CurrentSession, LastSession, MarketState, NextSession } from '@/types/dashboard';

interface CurrentSessionCardProps {
  session: CurrentSession;
  marketState: MarketState;
  nextSession: NextSession | null;
  lastSession: LastSession | null;
  seedNowIso: string;
  baseTimezone: string;
  locale: SupportedLocale;
}

function getVolatilitySeries(sessionId: string) {
  const base = {
    sydney: [32, 36, 40, 42, 38, 35],
    tokyo: [35, 38, 41, 45, 42, 39],
    london: [55, 62, 70, 68, 64, 60],
    new_york: [58, 65, 75, 72, 69, 63],
    gold: [70, 78, 88, 84, 80, 77],
    closed: [15, 18, 14, 16, 13, 12]
  };

  const selected = base[sessionId as keyof typeof base] || base.closed;
  return selected.map((value, index) => ({
    t: index,
    v: value
  }));
}

function useMeasuredSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const update = () => {
      const rect = element.getBoundingClientRect();
      const width = Math.max(0, Math.floor(rect.width));
      const height = Math.max(0, Math.floor(rect.height));

      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };

    update();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(element);
    window.addEventListener('resize', update);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return { ref, size };
}

export function CurrentSessionCard({
  session,
  marketState,
  nextSession,
  lastSession,
  seedNowIso,
  baseTimezone,
  locale
}: CurrentSessionCardProps) {
  const { ref: chartContainerRef, size: chartSize } = useMeasuredSize<HTMLDivElement>();
  const nowIso = useLiveNow(seedNowIso, 1000);
  const series = getVolatilitySeries(session.id);
  const endLabel = session.endIso ? formatIsoInTimezone(session.endIso, baseTimezone, locale, 'HH:mm') : '--:--';
  const lastSessionEndedAt = lastSession?.endIso ? formatIsoInTimezone(lastSession.endIso, baseTimezone, locale, 'dd/LL HH:mm') : null;
  const reopenCountdown = marketState.nextGlobalOpenIso
    ? Math.max(0, Math.floor((DateTime.fromISO(marketState.nextGlobalOpenIso, { setZone: true }).toMillis() - DateTime.fromISO(nowIso, { setZone: true }).toMillis()) / 1000))
    : 0;

  if (!marketState.isOpen) {
    return (
      <Card className="min-h-[300px] border-warning/45 bg-[radial-gradient(circle_at_top_left,_rgba(102,72,22,0.35),_rgba(10,14,24,0.8)_58%)]">
        <CardHeader>
          <div className="mb-2 flex items-center justify-between">
            <CardTitle>{t(locale, 'current.closedTitle')}</CardTitle>
            <Badge variant={marketState.mode === 'pre_open' ? 'warning' : 'neutral'}>{marketState.statusLabel}</Badge>
          </div>
          <CardDescription>{marketState.contextLabel}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-warning/45 bg-warning/10 p-3 text-sm text-slate-100">
            {t(locale, 'current.reopenIn', { countdown: formatCountdown(reopenCountdown) })}
          </div>
          <div className="space-y-2 text-sm text-slate-200">
            <p>
              <span className="text-mutedForeground">{t(locale, 'current.lastSession')}</span>{' '}
              {lastSession?.label ? localizeSessionLabel(lastSession.label, locale) : t(locale, 'current.na')}{' '}
              {lastSessionEndedAt ? `(${lastSessionEndedAt})` : lastSession?.endLabel ? `(${lastSession.endLabel})` : ''}
            </p>
            <p>
              <span className="text-mutedForeground">{t(locale, 'current.nextSession')}</span>{' '}
              {nextSession
                ? `${localizeSessionLabel(nextSession.label, locale)} (${formatIsoInTimezone(nextSession.startIso, baseTimezone, locale, 'dd/LL HH:mm')})`
                : t(locale, 'current.na')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-h-[300px] border-cyan/30 bg-[radial-gradient(circle_at_top_left,_rgba(13,83,129,0.35),_rgba(7,15,28,0.8)_55%)]">
      <CardHeader>
        <div className="mb-2 flex items-center justify-between">
          <CardTitle>{t(locale, 'current.currentSession', { session: localizeSessionLabel(session.label, locale) })}</CardTitle>
          <Badge variant={session.id === 'gold' ? 'gold' : 'default'}>{session.volatility}</Badge>
        </div>
        <CardDescription>{t(locale, 'current.closeForecast', { time: endLabel })}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-gold/30 bg-gradient-to-r from-gold/10 to-transparent p-3 text-sm text-slate-200">
          {t(locale, 'current.bestWindow', { assets: session.recommendedAssets.slice(0, 3).join(' | ') })}
        </div>

        <div ref={chartContainerRef} className="h-36 rounded-lg border border-border/70 bg-background/40 p-2">
          {chartSize.width > 0 && chartSize.height > 0 ? (
            <AreaChart width={chartSize.width} height={chartSize.height} data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="volatilityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1dd1ff" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#1dd1ff" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" hide />
              <YAxis hide domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  background: '#081122',
                  border: '1px solid rgba(29,209,255,.4)',
                  borderRadius: '8px'
                }}
                formatter={(value) => [`${Number(value ?? 0)}%`, t(locale, 'current.volatility')]}
                labelFormatter={(label) => t(locale, 'current.block', { index: Number(label) + 1 })}
              />
              <Area type="monotone" dataKey="v" stroke="#1dd1ff" strokeWidth={2} fill="url(#volatilityGradient)" />
            </AreaChart>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
