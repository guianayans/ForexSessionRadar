import type { MouseEvent as ReactMouseEvent } from 'react';
import { Bell, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SessionBlockProps {
  label: string;
  startLabel: string;
  endLabel: string;
  color: string;
  leftPercent: number;
  widthPercent: number;
  trackTop: number;
  trackHeight: number;
  opacity?: number;
  fadeMaskImage?: string;
  active: boolean;
  alarmEnabled: boolean;
  favorite: boolean;
  onMouseEnter: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onMouseLeave: () => void;
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}

export function SessionBlock({
  label,
  startLabel,
  endLabel,
  color,
  leftPercent,
  widthPercent,
  trackTop,
  trackHeight,
  opacity = 1,
  fadeMaskImage,
  active,
  alarmEnabled,
  favorite,
  onMouseEnter,
  onMouseLeave,
  onClick
}: SessionBlockProps) {
  return (
    <button
      type="button"
      data-timeline-interactive="true"
      className={cn(
        'absolute rounded-md border px-2 py-1 text-left text-xs text-white/90 transition-all',
        active ? 'border-cyan/65 shadow-[0_0_14px_rgba(29,209,255,.28)]' : 'border-white/10 hover:border-cyan/50'
      )}
      style={{
        left: `${leftPercent}%`,
        width: `${Math.max(4, widthPercent)}%`,
        top: `${trackTop}px`,
        height: `${trackHeight}px`,
        opacity,
        background: `linear-gradient(120deg, ${color}2d, ${color}68)`,
        ...(fadeMaskImage
          ? {
              maskImage: fadeMaskImage,
              WebkitMaskImage: fadeMaskImage
            }
          : {})
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="truncate font-semibold">{label}</div>
          <div className="font-mono text-[11px] opacity-85">
            {startLabel} - {endLabel}
          </div>
        </div>

        <div className="flex items-center gap-1 pt-0.5">
          {favorite ? <Star className="h-3 w-3 text-gold" /> : null}
          {alarmEnabled ? <Bell className="h-3 w-3 text-cyan" /> : null}
        </div>
      </div>
    </button>
  );
}
