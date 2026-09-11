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
  interactive?: boolean;
  onMouseEnter?: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onMouseLeave?: () => void;
  onClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void;
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
  interactive = true,
  onMouseEnter,
  onMouseLeave,
  onClick
}: SessionBlockProps) {
  const className = cn(
    'absolute rounded-md border px-2 py-1 text-left text-white/90 transition-all',
    interactive ? 'text-xs hover:border-cyan/50' : 'pointer-events-none select-none text-[10px] sm:text-xs',
    active ? 'border-cyan/65 shadow-[0_0_14px_rgba(29,209,255,.28)]' : 'border-white/10'
  );
  const style = {
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
  };
  const content = (
    <div className="flex items-start justify-between gap-1 sm:gap-2">
      <div className="min-w-0">
        <div className="truncate font-semibold leading-tight">{label}</div>
        <div className="font-mono text-[10px] opacity-85 sm:text-[11px]">
          {startLabel} - {endLabel}
        </div>
      </div>

      {interactive ? (
        <div className="flex items-center gap-1 pt-0.5">
          {favorite ? <Star className="h-3 w-3 text-gold" /> : null}
          {alarmEnabled ? <Bell className="h-3 w-3 text-cyan" /> : null}
        </div>
      ) : null}
    </div>
  );

  if (!interactive) {
    return (
      <div data-timeline-scrollable="true" className={className} style={style}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      data-timeline-interactive="true"
      data-timeline-scrollable="true"
      className={className}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {content}
    </button>
  );
}
