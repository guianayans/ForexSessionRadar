import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface NowIndicatorProps {
  leftPercent: number;
  hidden?: boolean;
  onClick: () => void;
  popup?: ReactNode;
  showPopup?: boolean;
}

export function NowIndicator({ leftPercent, hidden = false, onClick, popup, showPopup = false }: NowIndicatorProps) {
  if (hidden) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        data-timeline-interactive="true"
        onClick={onClick}
        className="absolute top-0 bottom-0 z-30 w-[2px] -translate-x-1/2 bg-cyan shadow-[0_0_12px_rgba(29,209,255,0.75)]"
        style={{ left: `${leftPercent}%` }}
        aria-label="Centralizar no horario atual"
        title="Ir para agora"
      />
      <button
        type="button"
        data-timeline-interactive="true"
        onClick={onClick}
        className={cn(
          'absolute -bottom-5 z-30 -translate-x-1/2 rounded border border-cyan/70 bg-black/85 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-cyan',
          'transition-colors hover:bg-cyan/20'
        )}
        style={{ left: `${leftPercent}%` }}
      >
        AGORA
      </button>

      {showPopup && popup ? (
        <div
          className="absolute bottom-10 z-40 -translate-x-1/2 rounded-lg border border-border/80 bg-[#050d1d]/95 p-2 shadow-[0_12px_28px_rgba(2,8,22,.7)]"
          style={{ left: `${leftPercent}%` }}
        >
          {popup}
        </div>
      ) : null}
    </>
  );
}
