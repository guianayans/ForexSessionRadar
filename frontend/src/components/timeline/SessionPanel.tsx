import { memo, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { SessionActionMenu } from './SessionActionMenu';
import type { SupportedLocale } from '@/lib/i18n';

interface SessionPanelProps {
  locale: SupportedLocale;
  open: boolean;
  anchorX: number;
  anchorY: number;
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

function resolveOverlayRoot() {
  let root = document.getElementById('overlay-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'overlay-root';
    document.body.appendChild(root);
  }

  // Camada dedicada do SessionPanel: garante portal independente do chat.
  let layer = document.getElementById('overlay-layer-session-panel');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'overlay-layer-session-panel';
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

export const SessionPanel = memo(function SessionPanel({
  locale,
  open,
  anchorX,
  anchorY,
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
}: SessionPanelProps) {
  const overlayRoot = useMemo(() => (typeof document !== 'undefined' ? resolveOverlayRoot() : null), []);

  if (!open || !overlayRoot) {
    return null;
  }

  // Portal: renderiza fora da timeline para evitar conflito com drag/scroll do rail.
  return createPortal(
    <div
      data-timeline-panel="true"
      className="fixed z-[700] pointer-events-auto"
      style={getFixedPanelStyle(anchorX, anchorY, 288, 280)}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <SessionActionMenu
        locale={locale}
        sessionLabel={sessionLabel}
        details={details}
        openEnabled={openEnabled}
        closeEnabled={closeEnabled}
        favoriteEnabled={favoriteEnabled}
        beforeMinutes={beforeMinutes}
        onToggleOpen={onToggleOpen}
        onToggleClose={onToggleClose}
        onToggleFavorite={onToggleFavorite}
        onToggleLead={onToggleLead}
      />
    </div>,
    overlayRoot
  );
});

SessionPanel.displayName = 'SessionPanel';
