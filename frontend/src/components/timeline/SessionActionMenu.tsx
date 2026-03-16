import { memo, useEffect, useMemo, useState } from 'react';
import { Bell, BellRing, Info, Star, StarOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TimeButtonGroup } from '@/components/shared/TimeButtonGroup';
import { t, type SupportedLocale } from '@/lib/i18n';

interface SessionActionMenuProps {
  locale: SupportedLocale;
  sessionLabel: string;
  details: string;
  openEnabled: boolean;
  closeEnabled: boolean;
  favoriteEnabled: boolean;
  beforeMinutes: Array<5 | 10 | 15 | 30>;
  onToggleOpen: (checked: boolean) => void;
  onToggleClose: (checked: boolean) => void;
  onToggleFavorite: (checked: boolean) => void;
  onToggleLead: (minutes: 5 | 10 | 15 | 30) => void;
}

export const SessionActionMenu = memo(function SessionActionMenu({
  locale,
  sessionLabel,
  details,
  openEnabled,
  closeEnabled,
  favoriteEnabled,
  beforeMinutes,
  onToggleOpen,
  onToggleClose,
  onToggleFavorite,
  onToggleLead
}: SessionActionMenuProps) {
  const [showDetails, setShowDetails] = useState(false);
  // Estado local otimista: garante feedback visual imediato nos controles do painel.
  const [localOpenEnabled, setLocalOpenEnabled] = useState(openEnabled);
  const [localCloseEnabled, setLocalCloseEnabled] = useState(closeEnabled);
  const [localFavoriteEnabled, setLocalFavoriteEnabled] = useState(favoriteEnabled);
  const [localBeforeMinutes, setLocalBeforeMinutes] = useState<Array<5 | 10 | 15 | 30>>(beforeMinutes);

  useEffect(() => {
    setLocalOpenEnabled(openEnabled);
  }, [openEnabled]);

  useEffect(() => {
    setLocalCloseEnabled(closeEnabled);
  }, [closeEnabled]);

  useEffect(() => {
    setLocalFavoriteEnabled(favoriteEnabled);
  }, [favoriteEnabled]);

  const beforeMinutesKey = useMemo(
    () => [...beforeMinutes].sort((a, b) => a - b).join(','),
    [beforeMinutes]
  );

  useEffect(() => {
    // Evita reset visual por re-render de 1s quando a referencia do array muda sem mudar o conteudo.
    setLocalBeforeMinutes(beforeMinutes);
  }, [beforeMinutesKey]);

  return (
    <div
      data-timeline-panel="true"
      className="w-72 rounded-lg border border-border/80 bg-[#050d1d]/96 p-3 shadow-[0_14px_35px_rgba(2,10,25,.72)]"
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-100">{sessionLabel}</p>
      </div>

      <div className="space-y-2 text-sm text-slate-200">
        <label className="flex items-center gap-2">
          <Checkbox
            checked={localOpenEnabled}
            onChange={(event) => {
              const checked = event.target.checked;
              setLocalOpenEnabled(checked);
              onToggleOpen(checked);
            }}
          />
          <span className="inline-flex items-center gap-1">
            <Bell className="h-3.5 w-3.5 text-cyan" />
            {t(locale, 'timeline.alarmOpen')}
          </span>
        </label>

        <label className="flex items-center gap-2">
          <Checkbox
            checked={localCloseEnabled}
            onChange={(event) => {
              const checked = event.target.checked;
              setLocalCloseEnabled(checked);
              onToggleClose(checked);
            }}
          />
          <span className="inline-flex items-center gap-1">
            <BellRing className="h-3.5 w-3.5 text-gold" />
            {t(locale, 'timeline.alarmClose')}
          </span>
        </label>

        <label className="flex items-center gap-2">
          <Checkbox
            checked={localFavoriteEnabled}
            onChange={(event) => {
              const checked = event.target.checked;
              setLocalFavoriteEnabled(checked);
              onToggleFavorite(checked);
            }}
          />
          <span className="inline-flex items-center gap-1">
            {localFavoriteEnabled ? (
              <Star className="h-3.5 w-3.5 text-gold" />
            ) : (
              <StarOff className="h-3.5 w-3.5 text-mutedForeground" />
            )}
            {t(locale, 'timeline.favoriteSession')}
          </span>
        </label>
      </div>

      <div className="mt-3 border-t border-border/60 pt-3">
        <TimeButtonGroup
          label={t(locale, 'alert.leadMinutes')}
          selectedMinutes={localBeforeMinutes}
          onToggle={(minutes) => {
            setLocalBeforeMinutes((current) =>
              current.includes(minutes) ? current.filter((value) => value !== minutes) : [...current, minutes].sort((a, b) => a - b)
            );
            onToggleLead(minutes);
          }}
          renderLabel={(minutes) => `${minutes} min`}
        />
      </div>

      <div className="mt-3 border-t border-border/60 pt-3">
        <Button type="button" variant="outline" size="sm" onClick={() => setShowDetails((current) => !current)}>
          <Info className="mr-1 h-3.5 w-3.5" />
          {t(locale, 'timeline.viewDetails')}
        </Button>
        {showDetails ? <p className="mt-2 text-xs text-slate-200">{details}</p> : null}
      </div>
    </div>
  );
});

SessionActionMenu.displayName = 'SessionActionMenu';
