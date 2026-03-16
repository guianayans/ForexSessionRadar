import type { MouseEvent as ReactMouseEvent } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SessionEventMarkerProps {
  label: string;
  timeLabel: string;
  leftPercent: number;
  active?: boolean;
  alarmEnabled?: boolean;
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}

export function SessionEventMarker({
  label,
  timeLabel,
  leftPercent,
  active = false,
  alarmEnabled = false,
  onClick
}: SessionEventMarkerProps) {
  return (
    <button
      type="button"
      data-timeline-interactive="true"
      onClick={(event) => {
        event.stopPropagation();
        onClick(event);
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      className={cn(
        'group absolute top-0 z-10 h-8 w-8 -translate-x-1/2 rounded-full transition-transform hover:scale-110',
        active ? 'z-20' : 'z-10'
      )}
      style={{ left: `${leftPercent}%` }}
      title={`${label} - ${timeLabel}`}
      aria-label={`${label} ${timeLabel}`}
    >
      <div className="pointer-events-none absolute left-1/2 top-0 h-2.5 w-[1px] -translate-x-1/2">
        <div className={cn('h-2.5 w-[1px]', active ? 'bg-cyan/90' : 'bg-cyan/55')} />
      </div>
      <div
        className="pointer-events-none absolute left-1/2 top-[10px] h-2.5 w-2.5 -translate-x-1/2"
      >
        <div
        className={cn(
            'h-2.5 w-2.5 rounded-full border',
          active ? 'border-cyan/70 bg-cyan/45' : 'border-border/75 bg-slate-700/70'
        )}
        />
      </div>
      {alarmEnabled ? (
        <span className="absolute -right-2 -top-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-gold/70 bg-[#151108]">
          <Bell className="h-2.5 w-2.5 text-gold" />
        </span>
      ) : null}

      <div className="pointer-events-none absolute left-1/2 top-full z-40 mt-1 hidden -translate-x-1/2 rounded border border-border/80 bg-[#050d1d]/95 px-2 py-1 text-[10px] text-slate-200 shadow-lg group-hover:block">
        {label} | {timeLabel}
      </div>
    </button>
  );
}
