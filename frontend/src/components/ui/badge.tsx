import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', {
  variants: {
    variant: {
      default: 'bg-primary/20 text-cyan border border-cyan/40',
      success: 'bg-success/15 text-success border border-success/45',
      warning: 'bg-warning/15 text-warning border border-warning/45',
      danger: 'bg-danger/15 text-danger border border-danger/45',
      gold: 'bg-gold/20 text-gold border border-gold/50',
      neutral: 'bg-muted/60 text-mutedForeground border border-border'
    }
  },
  defaultVariants: {
    variant: 'default'
  }
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
