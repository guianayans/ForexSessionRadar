import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { PreviewStatusChip } from '@/lib/preview-clocks';

interface PreviewStatusChipsProps {
  chips: PreviewStatusChip[];
  className?: string;
  variant?: 'inline' | 'badge';
}

function chipToneClass(tone: PreviewStatusChip['tone'], variant: 'inline' | 'badge') {
  if (tone === 'gold') {
    return variant === 'badge'
      ? 'border-amber-400/50 bg-amber-500/15 text-amber-200'
      : 'border-amber-400/45 bg-amber-500/10 text-amber-200';
  }

  return variant === 'badge'
    ? 'border-cyan/40 bg-cyan/10 text-cyan'
    : 'border-cyan/40 bg-cyan/10 text-cyan';
}

export function PreviewStatusChips({ chips, className, variant = 'inline' }: PreviewStatusChipsProps) {
  const sizeClass =
    variant === 'badge'
      ? 'rounded-full border px-2.5 py-0.5 text-[11px] font-semibold'
      : 'rounded-full border px-2 py-0.5 text-xs font-medium';

  return (
    <div className={cn('flex min-h-[1.25rem] flex-wrap items-center gap-1.5', className)}>
      <AnimatePresence mode="popLayout">
        {chips.map((chip) => (
          <motion.span
            key={chip.id}
            layout
            initial={{ opacity: 0, y: 8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.92 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={cn('inline-flex items-center', sizeClass, chipToneClass(chip.tone, variant))}
          >
            {chip.label}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
