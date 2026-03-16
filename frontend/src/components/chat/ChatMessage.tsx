import { DateTime } from 'luxon';
import { Bot, User } from 'lucide-react';
import { t, type SupportedLocale } from '@/lib/i18n';

export interface FloatingChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  provider?: 'local' | 'openai';
  timestampIso: string;
}

interface ChatMessageProps {
  locale: SupportedLocale;
  baseTimezone: string;
  message: FloatingChatMessage;
}

export function ChatMessage({ locale, baseTimezone, message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser ? <Bot className="mt-1 h-4 w-4 text-gold" /> : null}

      <div
        className={`max-w-[85%] rounded-xl border px-3 py-2 text-sm ${
          isUser ? 'border-cyan/40 bg-cyan/15 text-cyan-100' : 'border-border/70 bg-slate-900/80 text-slate-100'
        }`}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>

        <div className="mt-2 flex items-center justify-between gap-3 text-[10px] uppercase tracking-wider text-mutedForeground">
          <span>{DateTime.fromISO(message.timestampIso, { setZone: true }).setZone(baseTimezone).toFormat('HH:mm')}</span>
          {!isUser ? <span>{message.provider === 'openai' ? t(locale, 'chat.provider.openai') : t(locale, 'chat.provider.local')}</span> : null}
        </div>
      </div>

      {isUser ? <User className="mt-1 h-4 w-4 text-cyan" /> : null}
    </div>
  );
}
