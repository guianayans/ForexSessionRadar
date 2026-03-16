import { memo, type MouseEvent as ReactMouseEvent } from 'react';
import { cn } from '@/lib/utils';

interface TimeOptionButtonProps {
  label: string;
  selected: boolean;
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}

export const TimeOptionButton = memo(function TimeOptionButton({ label, selected, onClick }: TimeOptionButtonProps) {
  return (
    <button
      type="button"
      aria-current={selected ? 'true' : undefined}
      aria-pressed={selected}
      onClick={onClick}
      className={cn('time-button', selected && 'selected')}
    >
      {label}
    </button>
  );
});

TimeOptionButton.displayName = 'TimeOptionButton';
