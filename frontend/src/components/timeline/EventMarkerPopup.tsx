import { memo, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { DateTime } from 'luxon';
import type { SupportedLocale } from '@/lib/i18n';

interface EventMarkerPopupProps {
  locale: SupportedLocale;
  open: boolean;
  anchorX: number;
  anchorY: number;
  label: string;
  timeIso: string;
  displayTimezone: string;
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

function getFixedPanelStyle(anchorX: number, anchorY: number, width: number, height = 120) {
  const margin = 12;
  const left = Math.max(margin, Math.min(anchorX - width / 2, window.innerWidth - width - margin));
  const top = Math.max(margin, Math.min(anchorY + 12, window.innerHeight - height - margin));
  return { left: `${left}px`, top: `${top}px` };
}

export const EventMarkerPopup = memo(function EventMarkerPopup({
  open,
  anchorX,
  anchorY,
  label,
  timeIso,
  displayTimezone
}: EventMarkerPopupProps) {
  const portalTarget = useMemo(() => (typeof document !== 'undefined' ? resolveOverlayLayer() : null), []);

  if (!open || !portalTarget) {
    return null;
  }

  return createPortal(
    <div
      data-marker-popup="true"
      data-timeline-panel="true"
      className="fixed z-[700] w-64 rounded-lg border border-border/80 bg-[#050d1d]/96 p-3 shadow-[0_14px_35px_rgba(2,10,25,.72)]"
      style={getFixedPanelStyle(anchorX, anchorY, 256, 120)}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <p className="text-sm font-semibold text-slate-100">{label}</p>
      <p className="mt-1 font-mono text-xs text-mutedForeground">
        {DateTime.fromISO(timeIso, { setZone: true }).setZone(displayTimezone).toFormat('ccc dd/LL HH:mm')}
      </p>
    </div>,
    portalTarget
  );
});

EventMarkerPopup.displayName = 'EventMarkerPopup';
