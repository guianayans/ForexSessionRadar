import { useState, type RefObject } from 'react';
import { SendHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { t, type SupportedLocale } from '@/lib/i18n';

interface ChatInputProps {
  locale: SupportedLocale;
  loading: boolean;
  disabled?: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onSend: (message: string) => Promise<void>;
}

export function ChatInput({ locale, loading, disabled = false, inputRef, onSend }: ChatInputProps) {
  const [value, setValue] = useState('');

  async function submit() {
    const text = value.trim();
    if (!text || loading || disabled) {
      return;
    }

    setValue('');
    await onSend(text);
  }

  return (
    <div className="border-t border-border/70 p-3">
      <div className="flex items-end gap-2">
        <Textarea
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          rows={2}
          className="min-h-[72px] resize-none"
          placeholder={t(locale, 'chat.inputPlaceholder')}
          disabled={disabled}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
        />
        <Button onClick={() => void submit()} disabled={loading || disabled} size="icon" className="h-11 w-11 shrink-0">
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
