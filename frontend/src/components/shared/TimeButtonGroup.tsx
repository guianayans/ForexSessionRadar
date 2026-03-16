import { memo } from 'react';
import { LEAD_OPTIONS } from '@/components/timeline/timeline-utils';
import { TimeOptionButton } from '@/components/timeline/TimeOptionButton';

type LeadMinute = 5 | 10 | 15 | 30;

interface TimeButtonGroupProps {
  selectedMinutes: LeadMinute[];
  onToggle: (minutes: LeadMinute) => void;
  options?: LeadMinute[];
  label?: string;
  renderLabel?: (minutes: LeadMinute) => string;
}

export const TimeButtonGroup = memo(function TimeButtonGroup({
  selectedMinutes,
  onToggle,
  options = LEAD_OPTIONS,
  label,
  renderLabel
}: TimeButtonGroupProps) {
  return (
    <div className="space-y-2">
      {label ? <p className="text-xs uppercase tracking-wide text-mutedForeground">{label}</p> : null}
      <div className="flex flex-wrap gap-2">
        {options.map((minutes) => {
          const selected = selectedMinutes.includes(minutes);
          const buttonLabel = renderLabel ? renderLabel(minutes) : `${minutes} min`;
          return (
            <TimeOptionButton
              key={minutes}
              label={buttonLabel}
              selected={selected}
              onClick={() => onToggle(minutes)}
            />
          );
        })}
      </div>
    </div>
  );
});

TimeButtonGroup.displayName = 'TimeButtonGroup';
