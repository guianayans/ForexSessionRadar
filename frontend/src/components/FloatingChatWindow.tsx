import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatMessage, type FloatingChatMessage } from '@/components/chat/ChatMessage';
import { t, type SupportedLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface FloatingChatWindowProps {
  locale: SupportedLocale;
  baseTimezone: string;
  open: boolean;
  apiKeyConfigured: boolean;
  apiKeyDraft: string;
  isEditingApiKey: boolean;
  loading: boolean;
  messages: FloatingChatMessage[];
  onClose: () => void;
  onSend: (text: string) => Promise<void>;
  onApiKeyDraftChange: (nextKey: string) => void;
  onStartApiKeyEdit: () => void;
  onCancelApiKeyEdit: () => void;
  onSaveApiKey: () => void;
  onTestApiKey: () => Promise<boolean>;
}

export const FloatingChatWindow = memo(function FloatingChatWindow({
  locale,
  baseTimezone,
  open,
  apiKeyConfigured,
  apiKeyDraft,
  isEditingApiKey,
  loading,
  messages,
  onClose,
  onSend,
  onApiKeyDraftChange,
  onStartApiKeyEdit,
  onCancelApiKeyEdit,
  onSaveApiKey,
  onTestApiKey
}: FloatingChatWindowProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const apiKeyRef = useRef<HTMLInputElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const chatPortalTarget = useMemo(() => {
    if (typeof document === 'undefined') {
      return null;
    }

    // Camadas dedicadas em #overlay-root: evita que outros portais
    // (ex.: SessionPanel) virem filhos do wrapper do chat.
    let root = document.getElementById('overlay-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'overlay-root';
      document.body.appendChild(root);
    }

    let layer = document.getElementById('overlay-layer-chat');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'overlay-layer-chat';
      root.appendChild(layer);
    }

    return layer;
  }, []);

  useEffect(() => {
    if (!open || !messagesRef.current) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      if (!messagesRef.current) {
        return;
      }
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [messages, loading, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (isEditingApiKey) {
      apiKeyRef.current?.focus();
    } else {
      inputRef.current?.focus();
    }

    // Focus trap manual: ativo apenas quando o painel esta visivel/aberto.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !containerRef.current) {
        return;
      }

      const focusables = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(
          [
            'button:not([disabled])',
            'a[href]',
            'input:not([disabled])',
            'textarea:not([disabled])',
            'select:not([disabled])',
            '[tabindex]:not([tabindex="-1"])'
          ].join(', ')
        )
      ).filter((element) => element.offsetParent !== null);

      if (!focusables.length) {
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const activeInsidePanel = Boolean(active && containerRef.current?.contains(active));

      if (!activeInsidePanel) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isEditingApiKey, open, onClose]);

  if (!chatPortalTarget) {
    return null;
  }

  return createPortal(
    <>
      {/* Overlay clicavel para fechar fora, sem usar comportamento nativo de <dialog>. */}
      {open ? (
        <button
          type="button"
          aria-label={t(locale, 'chat.close')}
          className="fixed inset-0 z-[640] bg-transparent"
          onMouseDown={(event) => {
            // Se o clique veio de um painel da timeline, nao fecha o chat.
            const target = event.target as HTMLElement | null;
            if (target?.closest('[data-timeline-panel="true"]')) {
              return;
            }
            onClose();
          }}
          onClick={(event) => event.preventDefault()}
        />
      ) : null}
      <div
        className={cn(
          'fixed bottom-24 right-6 z-[700] w-[min(92vw,380px)] transition-all duration-300',
          open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        )}
        role="dialog"
      >
        <div
          ref={containerRef}
          className="flex h-[min(78vh,520px)] flex-col overflow-hidden rounded-2xl border border-border/80 bg-[linear-gradient(180deg,_rgba(10,18,34,.98),_rgba(4,10,20,.98))] shadow-[0_30px_80px_rgba(2,10,24,.68)]"
        >
          <ChatHeader locale={locale} onClose={onClose} />

          <div className="border-b border-border/60 p-3">
            {!apiKeyConfigured || isEditingApiKey ? (
              <div className="space-y-2">
                <Input
                  ref={apiKeyRef}
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKeyDraft}
                  onChange={(event) => onApiKeyDraftChange(event.target.value)}
                  placeholder={apiKeyConfigured ? t(locale, 'chat.apiKey.edit') : t(locale, 'chat.apiKey.first')}
                  autoComplete="off"
                />
                <div className="flex items-center justify-between gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowApiKey((current) => !current)}>
                    {showApiKey ? <EyeOff className="mr-1 h-3.5 w-3.5" /> : <Eye className="mr-1 h-3.5 w-3.5" />}
                    {showApiKey ? t(locale, 'chat.apiKey.hide') : t(locale, 'chat.apiKey.show')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!apiKeyDraft.trim() || testingKey}
                    onClick={() => {
                      setTestingKey(true);
                      setTestStatus('idle');
                      void onTestApiKey()
                        .then((ok) => setTestStatus(ok ? 'ok' : 'error'))
                        .catch(() => setTestStatus('error'))
                        .finally(() => setTestingKey(false));
                    }}
                  >
                    {testingKey ? t(locale, 'chat.apiKey.testing') : t(locale, 'chat.apiKey.test')}
                  </Button>
                </div>
                {testStatus === 'ok' ? <p className="text-xs text-success">{t(locale, 'chat.apiKey.ok')}</p> : null}
                {testStatus === 'error' ? (
                  <p className="text-xs text-danger">{t(locale, 'chat.apiKey.error')}</p>
                ) : null}
                <div className="flex items-center justify-end gap-2">
                  {apiKeyConfigured ? (
                    <Button type="button" variant="ghost" size="sm" onClick={onCancelApiKeyEdit}>
                      {t(locale, 'chat.apiKey.cancel')}
                    </Button>
                  ) : null}
                  <Button type="button" size="sm" disabled={!apiKeyDraft.trim()} onClick={onSaveApiKey}>
                    {t(locale, 'chat.apiKey.save')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-background/40 px-3 py-2">
                <p className="text-xs text-mutedForeground">{t(locale, 'chat.apiKey.configured')}</p>
                <Button type="button" variant="outline" size="sm" onClick={onStartApiKeyEdit}>
                  {t(locale, 'chat.apiKey.change')}
                </Button>
              </div>
            )}
          </div>

          <div ref={messagesRef} className="flex-1 space-y-2 overflow-auto px-3 py-3">
            {messages.map((message) => (
              <ChatMessage key={message.id} locale={locale} baseTimezone={baseTimezone} message={message} />
            ))}
          </div>

          <ChatInput locale={locale} loading={loading} disabled={isEditingApiKey} inputRef={inputRef} onSend={onSend} />
        </div>
      </div>
    </>,
    chatPortalTarget
  );
});
