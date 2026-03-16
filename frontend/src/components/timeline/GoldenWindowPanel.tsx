import { memo, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { DateTime } from 'luxon';
import { TimeOptionButton } from './TimeOptionButton';
import { localizeSessionLabel, t, type SupportedLocale } from '@/lib/i18n';

interface GoldenWindowPanelProps {
  locale: SupportedLocale;
  open: boolean;
  anchorX: number;
  anchorY: number;
  startIso: string;
  endIso: string;
  displayTimezone: string;
  alarmEnabled: boolean;
  onToggleAlarm: () => void;
}

function resolveOverlayLayer() {
  let root = document.getElementById('overlay-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'overlay-root';
    document.body.appendChild(root);
  }

  let layer = document.getElementById('overlay-layer-golden-window');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'overlay-layer-golden-window';
    root.appendChild(layer);
  }

  return layer;
}

function getFixedPanelStyle(anchorX: number, anchorY: number, width: number, height = 230) {
  const margin = 12;
  const left = Math.max(margin, Math.min(anchorX - width / 2, window.innerWidth - width - margin));
  const top = Math.max(margin, Math.min(anchorY + 12, window.innerHeight - height - margin));
  return { left: `${left}px`, top: `${top}px` };
}

export const GoldenWindowPanel = memo(function GoldenWindowPanel({
  locale,
  open,
  anchorX,
  anchorY,
  startIso,
  endIso,
  displayTimezone,
  alarmEnabled,
  onToggleAlarm
}: GoldenWindowPanelProps) {
  const portalTarget = useMemo(() => (typeof document !== 'undefined' ? resolveOverlayLayer() : null), []);

  if (!open || !portalTarget) {
    return null;
  }

  return createPortal(
    <div
      data-timeline-panel="true"
      className="fixed z-[700] w-72 rounded-lg border border-border/80 bg-[#050d1d]/96 p-3 shadow-[0_14px_35px_rgba(2,10,25,.72)]"
      style={getFixedPanelStyle(anchorX, anchorY, 288, 230)}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="mb-2">
        <p className="text-sm font-semibold text-gold">{localizeSessionLabel('Janela de Ouro', locale)}</p>
        <p className="font-mono text-xs text-mutedForeground">
          {DateTime.fromISO(startIso, { setZone: true }).setZone(displayTimezone).toFormat('HH:mm')} -{' '}
          {DateTime.fromISO(endIso, { setZone: true }).setZone(displayTimezone).toFormat('HH:mm')}
        </p>
      </div>

      <p className="text-xs text-slate-200">{t(locale, 'timeline.goldDescription')}</p>
      <p className="mt-2 text-xs text-slate-200">
        {t(locale, 'timeline.assetsRelevant')}: EUR/USD, XAUUSD, US100.
      </p>

      <div className="mt-3">
        <TimeOptionButton
          label={alarmEnabled ? t(locale, 'timeline.disableAlarm') : t(locale, 'timeline.enableAlarm')}
          selected={alarmEnabled}
          onClick={onToggleAlarm}
        />
      </div>
    </div>,
    portalTarget
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.open === nextProps.open &&
    prevProps.anchorX === nextProps.anchorX &&
    prevProps.anchorY === nextProps.anchorY &&
    prevProps.startIso === nextProps.startIso &&
    prevProps.endIso === nextProps.endIso &&
    prevProps.displayTimezone === nextProps.displayTimezone &&
    prevProps.alarmEnabled === nextProps.alarmEnabled
  );
});

GoldenWindowPanel.displayName = 'GoldenWindowPanel';
