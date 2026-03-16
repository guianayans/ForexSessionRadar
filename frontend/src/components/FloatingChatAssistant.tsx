import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DateTime } from 'luxon';
import { FloatingChatButton } from '@/components/FloatingChatButton';
import { FloatingChatWindow } from '@/components/FloatingChatWindow';
import { useLiveNow } from '@/hooks/useLiveNow';
import { formatIsoInTimezone, t, type SupportedLocale } from '@/lib/i18n';
import { sendSystemNotification } from '@/services/notifications';
import type { AssistantHistoryMessage, DashboardPayload } from '@/types/dashboard';
import type { FloatingChatMessage } from '@/components/chat/ChatMessage';

interface FloatingChatAssistantProps {
  dashboard: DashboardPayload;
  locale: SupportedLocale;
  onAsk: (
    question: string,
    apiKey?: string,
    history?: AssistantHistoryMessage[]
  ) => Promise<{ answer: string; provider?: 'local' | 'openai' }>;
}

const STORAGE_KEY = 'forex-openai-key';

function buildInsightMessage(eventKey: string, locale: SupportedLocale) {
  if (locale === 'es-ES') {
    const templates = {
      london: 'Sesion Europea iniciando. La liquidez tiende a aumentar. Atencion a EUR/USD y Oro.',
      new_york: 'Sesion Americana iniciando. US100, S&P500, EUR/USD y Oro suelen ganar relevancia.',
      tokyo: 'Sesion Asiatica iniciando. JPY, AUD, NZD y Nikkei suelen tener mejor comportamiento ahora.',
      overlap: 'Inicio del overlap Londres + Nueva York. Suele ser uno de los periodos con mayor liquidez del dia.'
    };
    return templates[eventKey as keyof typeof templates] || null;
  }

  if (locale === 'en-US') {
    const templates = {
      london: 'European session starting. Liquidity tends to increase. Watch EUR/USD and Gold.',
      new_york: 'American session starting. US100, S&P500, EUR/USD and Gold tend to gain relevance.',
      tokyo: 'Asian session starting. JPY, AUD, NZD and Nikkei usually make more sense now.',
      overlap: 'London + New York overlap started. This is usually one of the most liquid periods of the day.'
    };
    return templates[eventKey as keyof typeof templates] || null;
  }

  const templates = {
    london: 'Sessao Europeia iniciando. Liquidez tende a aumentar. Fique atento a EUR/USD e Ouro.',
    new_york: 'Sessao Americana iniciando. Ativos como US100, S&P500, EUR/USD e Ouro tendem a ganhar relevancia.',
    tokyo: 'Sessao Asiatica iniciando. JPY, AUD, NZD e Nikkei tendem a fazer mais sentido neste horario.',
    overlap: 'Inicio da sobreposicao Londres + Nova York. Este costuma ser um dos periodos mais liquidos do dia.'
  };

  return templates[eventKey as keyof typeof templates] || null;
}

function createMessage(
  payload: Omit<FloatingChatMessage, 'id' | 'timestampIso'>,
  timestampIso?: string
): FloatingChatMessage {
  const normalizedTimestamp = timestampIso
    ? DateTime.fromISO(timestampIso, { setZone: true }).toISO()
    : DateTime.now().toISO();

  return {
    ...payload,
    id: `${payload.role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestampIso: normalizedTimestamp || new Date().toISOString()
  };
}

function isActive(nowIso: string, startIso: string, endIso: string) {
  const now = DateTime.fromISO(nowIso, { setZone: true }).toMillis();
  const start = DateTime.fromISO(startIso, { setZone: true }).toMillis();
  const end = DateTime.fromISO(endIso, { setZone: true }).toMillis();
  return now >= start && now < end;
}

function buildClosedMarketMessage(dashboard: DashboardPayload, locale: SupportedLocale) {
  const nextOpen = dashboard.marketState?.nextGlobalOpenIso
    ? formatIsoInTimezone(dashboard.marketState.nextGlobalOpenIso, dashboard.baseTimezone, locale, "ccc dd/LL 'as' HH:mm")
    : '--';
  return t(locale, 'chat.rule.closed', { nextOpen });
}

function buildInitialAssistantText(dashboard: DashboardPayload, locale: SupportedLocale) {
  if (!dashboard.marketState?.isOpen) {
    return buildClosedMarketMessage(dashboard, locale);
  }

  return t(locale, 'chat.rule.ready');
}

export const FloatingChatAssistant = memo(function FloatingChatAssistant({ dashboard, locale, onAsk }: FloatingChatAssistantProps) {
  const initialApiKey = () => (localStorage.getItem(STORAGE_KEY) || '').trim();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pulseActive, setPulseActive] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [apiKeyDraft, setApiKeyDraft] = useState(initialApiKey);
  const [isEditingApiKey, setIsEditingApiKey] = useState(() => !initialApiKey());
  const [messages, setMessages] = useState<FloatingChatMessage[]>([
    createMessage({
      role: 'assistant',
      provider: 'local',
      text: buildInitialAssistantText(dashboard, locale)
    }, dashboard.nowIso)
  ]);
  const nowIso = useLiveNow(dashboard.nowIso, 1000);

  const marketOpen = dashboard.marketState?.isOpen ?? dashboard.currentSession?.id !== 'closed';
  const previousFlagsRef = useRef<{ london: boolean; new_york: boolean; tokyo: boolean; overlap: boolean } | null>(null);
  const previousMarketOpenRef = useRef<boolean | null>(null);

  const flags = useMemo(() => {
    const london = dashboard.timeline.sessions.find((session) => session.id === 'london');
    const newYork = dashboard.timeline.sessions.find((session) => session.id === 'new_york');
    const tokyo = dashboard.timeline.sessions.find((session) => session.id === 'tokyo');

    return {
      london: marketOpen && !!london && isActive(nowIso, london.startIso, london.endIso),
      new_york: marketOpen && !!newYork && isActive(nowIso, newYork.startIso, newYork.endIso),
      tokyo: marketOpen && !!tokyo && isActive(nowIso, tokyo.startIso, tokyo.endIso),
      overlap:
        marketOpen &&
        !!dashboard.timeline.overlap &&
        isActive(nowIso, dashboard.timeline.overlap.startIso, dashboard.timeline.overlap.endIso)
    };
  }, [dashboard.currentSession?.id, dashboard.marketState?.isOpen, dashboard.timeline.overlap, dashboard.timeline.sessions, nowIso]);

  useEffect(() => {
    // Quando o idioma/fuso muda, reinicia o contexto do chat para evitar mistura de historico em outro idioma.
    previousFlagsRef.current = null;
    previousMarketOpenRef.current = null;
    setMessages([
      createMessage(
        {
          role: 'assistant',
          provider: 'local',
          text: buildInitialAssistantText(dashboard, locale)
        },
        dashboard.nowIso
      )
    ]);
    setUnreadCount(0);
  }, [dashboard.baseTimezone, locale]);

  useEffect(() => {
    if (previousMarketOpenRef.current === null) {
      previousMarketOpenRef.current = marketOpen;
      return;
    }

    if (previousMarketOpenRef.current === marketOpen) {
      return;
    }

    previousMarketOpenRef.current = marketOpen;

    const text = marketOpen ? t(locale, 'chat.rule.reopened') : buildClosedMarketMessage(dashboard, locale);

    setMessages((prev) => [
      ...prev,
      createMessage({
        role: 'assistant',
        provider: 'local',
        text
      }, nowIso)
    ]);

    if (!isOpen) {
      setUnreadCount((current) => current + 1);
      setPulseActive(true);
      window.setTimeout(() => setPulseActive(false), 4500);
    }
  }, [dashboard, isOpen, marketOpen, nowIso, locale]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!previousFlagsRef.current) {
      previousFlagsRef.current = flags;
      return;
    }

    const activatedEvents = Object.entries(flags)
      .filter(([key, value]) => value && !previousFlagsRef.current?.[key as keyof typeof flags])
      .map(([key]) => key);

    previousFlagsRef.current = flags;

    if (!activatedEvents.length) {
      return;
    }

    activatedEvents.forEach((eventKey) => {
      const insight = buildInsightMessage(eventKey, locale);
      if (!insight) {
        return;
      }

      setMessages((prev) => [
        ...prev,
        createMessage({
          role: 'assistant',
          provider: 'local',
          text: insight
        }, nowIso)
      ]);

      if (!isOpen) {
        setUnreadCount((current) => current + 1);
      }

      setPulseActive(true);
      window.setTimeout(() => setPulseActive(false), 6000);
      const notificationTitle = locale === 'en-US' ? 'Session Insight' : locale === 'es-ES' ? 'Insight de Sesion' : 'Insight de Sessao';
      void sendSystemNotification(notificationTitle, insight);
    });
  }, [flags, isOpen, nowIso, locale]);

  const handleSaveApiKey = useCallback(() => {
    const trimmed = apiKeyDraft.trim();
    if (!trimmed) {
      return;
    }

    localStorage.setItem(STORAGE_KEY, trimmed);
    setApiKey(trimmed);
    setApiKeyDraft(trimmed);
    setIsEditingApiKey(false);
  }, [apiKeyDraft]);

  const handleStartApiKeyEdit = useCallback(() => {
    setApiKeyDraft(apiKey);
    setIsEditingApiKey(true);
  }, [apiKey]);

  const handleCancelApiKeyEdit = useCallback(() => {
    setApiKeyDraft(apiKey);
    setIsEditingApiKey(!apiKey);
  }, [apiKey]);

  const handleCloseChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleToggleChat = useCallback(() => {
    setIsOpen((current) => !current);
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      const userMessage = createMessage({ role: 'user', text }, nowIso);
      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);

      try {
        const history = [...messages.slice(-7), userMessage].map((message) => ({
          role: message.role,
          text: message.text
        }));
        const response = await onAsk(text, apiKey || undefined, history);
        setMessages((prev) => [
          ...prev,
          createMessage({
            role: 'assistant',
            provider: response.provider || 'local',
            text: response.answer
          }, nowIso)
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          createMessage({
            role: 'assistant',
            provider: 'local',
            text: t(locale, 'chat.rule.fallback')
          }, nowIso)
        ]);
      } finally {
        setLoading(false);
      }
    },
    [apiKey, messages, nowIso, onAsk, locale]
  );

  return (
    <>
      <FloatingChatWindow
        locale={locale}
        baseTimezone={dashboard.baseTimezone}
        open={isOpen}
        apiKeyConfigured={Boolean(apiKey)}
        apiKeyDraft={apiKeyDraft}
        isEditingApiKey={isEditingApiKey}
        loading={loading}
        messages={messages}
        onClose={handleCloseChat}
        onApiKeyDraftChange={setApiKeyDraft}
        onStartApiKeyEdit={handleStartApiKeyEdit}
        onCancelApiKeyEdit={handleCancelApiKeyEdit}
        onSaveApiKey={handleSaveApiKey}
        onTestApiKey={async () => {
          const response = await onAsk('Responda apenas com OK', apiKeyDraft.trim(), []);
          return response.provider === 'openai';
        }}
        onSend={handleSend}
      />
      <FloatingChatButton
        locale={locale}
        isOpen={isOpen}
        unreadCount={unreadCount}
        pulseActive={pulseActive}
        onClick={handleToggleChat}
      />
    </>
  );
});
