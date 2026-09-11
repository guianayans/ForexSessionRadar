import { memo, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { localizeSessionLabel, type SupportedLocale } from '@/lib/i18n';

interface SessionPanelProps {
  locale: SupportedLocale;
  open: boolean;
  anchorX: number;
  anchorY: number;
  sessionLabel: string;
  details: string;
}

function resolveOverlayRoot() {
  let root = document.getElementById('overlay-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'overlay-root';
    document.body.appendChild(root);
  }

  let layer = document.getElementById('overlay-layer-session-panel');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'overlay-layer-session-panel';
    root.appendChild(layer);
  }

  return layer;
}

function getFixedPanelStyle(anchorX: number, anchorY: number, width: number, height = 160) {
  const margin = 12;
  const left = Math.max(margin, Math.min(anchorX - width / 2, window.innerWidth - width - margin));
  const top = Math.max(margin, Math.min(anchorY + 12, window.innerHeight - height - margin));
  return { left: `${left}px`, top: `${top}px` };
}

export const SessionPanel = memo(function SessionPanel({
  locale,
  open,
  anchorX,
  anchorY,
  sessionLabel,
  details
}: SessionPanelProps) {
  const overlayRoot = useMemo(() => (typeof document !== 'undefined' ? resolveOverlayRoot() : null), []);

  if (!open || !overlayRoot) {
    return null;
  }

  return createPortal(
    <div
      data-timeline-panel="true"
      className="fixed z-[700] w-72 rounded-lg border border-border/80 bg-[#050d1d]/96 p-3 shadow-[0_14px_35px_rgba(2,10,25,.72)]"
      style={getFixedPanelStyle(anchorX, anchorY, 288, 160)}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <p className="text-sm font-semibold text-slate-100">{localizeSessionLabel(sessionLabel, locale)}</p>
      <p className="mt-2 text-xs text-slate-200">{details}</p>
    </div>,
    overlayRoot
  );
});

SessionPanel.displayName = 'SessionPanel';
