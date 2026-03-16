import { memo, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { DateTime } from 'luxon';
import { Checkbox } from '@/components/ui/checkbox';
import { TimeButtonGroup } from '@/components/shared/TimeButtonGroup';
import { t, type SupportedLocale } from '@/lib/i18n';

interface EventMarkerPopupProps {
  locale: SupportedLocale;
  open: boolean;
  anchorX: number;
  anchorY: number;
  label: string;
  timeIso: string;
  displayTimezone: string;
  alarmEnabled: boolean;
  beforeMinutes: Array<5 | 10 | 15 | 30>;
  onToggleAlarm: (checked: boolean) => void;
  onToggleLead: (minutes: 5 | 10 | 15 | 30) => void;
}

function resolveOverlayLayer() {
  let root = document.getElementById('overlay-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'overlay-root';
    document.body.appendChild(root);
  }

  let layer = document.getElementById('overlay-layer-marker-popup');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'overlay-layer-marker-popup';
    root.appendChild(layer);
  }

  return layer;
}

function getFixedPanelStyle(anchorX: number, anchorY: number, width: number, height = 250) {
  const margin = 12;
  const left = Math.max(margin, Math.min(anchorX - width / 2, window.innerWidth - width - margin));
  const top = Math.max(margin, Math.min(anchorY + 12, window.innerHeight - height - margin));
  return { left: `${left}px`, top: `${top}px` };
}

export const EventMarkerPopup = memo(function EventMarkerPopup({
  locale,
  open,
  anchorX,
  anchorY,
  label,
  timeIso,
  displayTimezone,
  alarmEnabled,
  beforeMinutes,
  onToggleAlarm,
  onToggleLead
}: EventMarkerPopupProps) {
  const portalTarget = useMemo(() => (typeof document !== 'undefined' ? resolveOverlayLayer() : null), []);
  // Estado local otimista: evita atraso visual enquanto preferencias sobem/descem do backend.
  const [localAlarmEnabled, setLocalAlarmEnabled] = useState(alarmEnabled);
  const [localBeforeMinutes, setLocalBeforeMinutes] = useState<Array<5 | 10 | 15 | 30>>(beforeMinutes);

  useEffect(() => {
    setLocalAlarmEnabled(alarmEnabled);
  }, [alarmEnabled]);

  const beforeMinutesKey = useMemo(
    () => [...beforeMinutes].sort((a, b) => a - b).join(','),
    [beforeMinutes]
  );

  useEffect(() => {
    setLocalBeforeMinutes(beforeMinutes);
  }, [beforeMinutesKey]);

  if (!open || !portalTarget) {
    return null;
  }

  // Portal dedicado: evita que o drag da timeline capture interacoes do popup.
  return createPortal(
    <div
      data-marker-popup="true"
      data-timeline-panel="true"
      className="fixed z-[700] w-64 rounded-lg border border-border/80 bg-[#050d1d]/96 p-3 shadow-[0_14px_35px_rgba(2,10,25,.72)]"
      style={getFixedPanelStyle(anchorX, anchorY, 256, 250)}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="mb-2">
        <p className="text-sm font-semibold text-slate-100">{label}</p>
        <p className="font-mono text-xs text-mutedForeground">
          {DateTime.fromISO(timeIso, { setZone: true }).setZone(displayTimezone).toFormat('ccc dd/LL HH:mm')}
        </p>
      </div>

      <label className="mb-3 flex items-center gap-2 text-sm text-slate-200">
        <Checkbox
          checked={localAlarmEnabled}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            event.stopPropagation();
            const checked = event.target.checked;
            setLocalAlarmEnabled(checked);
            onToggleAlarm(checked);
          }}
        />
        {t(locale, 'timeline.enableAlarm')}
      </label>

      <TimeButtonGroup
        label={t(locale, 'alert.leadMinutes')}
        selectedMinutes={localBeforeMinutes}
        onToggle={(minutes) => {
          setLocalBeforeMinutes((current) =>
            current.includes(minutes) ? current.filter((value) => value !== minutes) : [...current, minutes].sort((a, b) => a - b)
          );
          onToggleLead(minutes);
        }}
      />
    </div>,
    portalTarget
  );
});

EventMarkerPopup.displayName = 'EventMarkerPopup';
