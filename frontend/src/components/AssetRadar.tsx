import type { ComponentType } from 'react';
import { Check, Minus, OctagonX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { t, type SupportedLocale } from '@/lib/i18n';
import type { Radar } from '@/types/dashboard';

interface AssetRadarProps {
  radar: Radar;
  marketOpen: boolean;
  locale: SupportedLocale;
}

function Column({
  title,
  items,
  variant,
  icon: Icon
}: {
  title: string;
  items: string[];
  variant: 'success' | 'warning' | 'danger';
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/30 p-3">
      <div className="mb-3 flex items-center gap-2">
        <Badge variant={variant}>{title}</Badge>
      </div>
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={`${title}-${item}`} className="flex items-center gap-2 rounded-md border border-white/5 bg-black/20 px-2 py-1.5">
            <Icon className="h-4 w-4" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AssetRadar({ radar, marketOpen, locale }: AssetRadarProps) {
  if (!marketOpen) {
    return (
      <Card className="h-full border-border/70">
        <CardHeader>
          <CardTitle>{t(locale, 'radar.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/70 bg-background/30 p-4">
            <Badge variant="neutral">{t(locale, 'radar.closed')}</Badge>
            <p className="mt-3 text-sm text-mutedForeground">
              {radar.message || t(locale, 'radar.closedMessage')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full border-border/70">
      <CardHeader>
        <CardTitle>{t(locale, 'radar.title')}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Column title={t(locale, 'radar.idealNow')} items={radar.recommended} variant="success" icon={Check} />
        <Column title={t(locale, 'radar.acceptable')} items={radar.neutral} variant="warning" icon={Minus} />
        <Column title={t(locale, 'radar.avoid')} items={radar.avoid} variant="danger" icon={OctagonX} />
      </CardContent>
    </Card>
  );
}
