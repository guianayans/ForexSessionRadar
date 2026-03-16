import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TimelineMode } from './timeline-utils';

interface TimelineControlsProps {
  mode: TimelineMode;
  onModeChange: (nextMode: TimelineMode) => void;
  onGoToNow: () => void;
}

const MODES: Array<{ id: TimelineMode; label: string }> = [
  { id: 'hoje', label: 'Hoje' },
  { id: '24h', label: '24h' },
  { id: 'semana', label: 'Semana' }
];

export function TimelineControls({ mode, onModeChange, onGoToNow }: TimelineControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-md border border-border/70 bg-background/35 p-1">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onModeChange(item.id)}
            className={cn(
              'rounded px-2.5 py-1 text-xs font-medium transition-colors',
              mode === item.id ? 'bg-cyan/20 text-cyan' : 'text-mutedForeground hover:text-slate-100'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Button type="button" size="sm" variant="outline" onClick={onGoToNow}>
        Voltar ao agora
      </Button>
    </div>
  );
}
