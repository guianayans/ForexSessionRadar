import * as React from 'react';
import { cn } from '@/lib/utils';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    className={cn(
      'h-4 w-4 rounded border border-border bg-background/70 accent-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/70',
      className
    )}
    {...props}
  />
));

Checkbox.displayName = 'Checkbox';
