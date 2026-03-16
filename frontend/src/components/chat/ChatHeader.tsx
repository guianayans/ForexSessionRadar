import { Circle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t, type SupportedLocale } from '@/lib/i18n';

interface ChatHeaderProps {
  locale: SupportedLocale;
  onClose: () => void;
}

export function ChatHeader({ locale, onClose }: ChatHeaderProps) {
  return (
    <header className="flex items-start justify-between border-b border-border/70 px-4 py-3">
      <div>
        <h3 className="text-sm font-semibold tracking-wide text-slate-100">{t(locale, 'chat.title')}</h3>
        <div className="mt-1 flex items-center gap-2 text-xs text-mutedForeground">
          <Circle className="h-2.5 w-2.5 fill-emerald-400 text-emerald-300" />
          <span>{t(locale, 'chat.context')}</span>
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={onClose} aria-label={t(locale, 'chat.close')}>
        <X className="h-4 w-4" />
      </Button>
    </header>
  );
}
