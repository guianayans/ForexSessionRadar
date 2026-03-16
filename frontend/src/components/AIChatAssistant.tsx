import { useMemo, useState } from 'react';
import { BadgeCheck, Bot, KeyRound, SendHorizontal, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface AIChatAssistantProps {
  onAsk: (question: string, apiKey?: string) => Promise<{ answer: string; provider?: 'local' | 'openai' }>;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  provider?: 'local' | 'openai';
}

const STORAGE_KEY = 'forex-openai-key';

export function AIChatAssistant({ onAsk }: AIChatAssistantProps) {
  const initialKey = useMemo(() => localStorage.getItem(STORAGE_KEY) || '', []);
  const [apiKey, setApiKey] = useState(initialKey);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      provider: initialKey ? 'openai' : 'local',
      text: initialKey
        ? 'ChatGPT conectado. Posso responder usando o contexto da sessao atual.'
        : 'Modo local ativo. Adicione uma chave OpenAI para respostas com ChatGPT.'
    }
  ]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  function persistApiKey(nextValue: string) {
    setApiKey(nextValue);
    if (nextValue.trim()) {
      localStorage.setItem(STORAGE_KEY, nextValue.trim());
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
  }

  async function submit() {
    const text = question.trim();
    if (!text || loading) {
      return;
    }

    const userMessage: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      text
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion('');
    setLoading(true);

    try {
      const key = apiKey.trim() || undefined;
      const reply = await onAsk(text, key);
      const botMessage: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        provider: reply.provider || 'local',
        text: reply.answer
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-error-${Date.now()}`,
          role: 'assistant',
          provider: 'local',
          text: 'Nao consegui responder agora. Verifique backend local e credencial OpenAI.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="h-full min-h-[360px] border-border/70">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Assistente Inteligente</CardTitle>
          <Badge variant={apiKey.trim() ? 'success' : 'neutral'}>{apiKey.trim() ? 'ChatGPT ON' : 'Modo local'}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex h-full min-h-[280px] flex-col gap-3">
        <div className="flex items-center gap-2 rounded-md border border-border/70 bg-background/25 p-2">
          <KeyRound className="h-4 w-4 text-gold" />
          <Input
            type="password"
            value={apiKey}
            onChange={(event) => persistApiKey(event.target.value)}
            placeholder="OpenAI API Key (opcional para usar ChatGPT)"
            autoComplete="off"
          />
          <Button variant="outline" size="sm" onClick={() => persistApiKey('')}>
            Limpar
          </Button>
        </div>

        <div className="flex-1 space-y-2 overflow-auto rounded-lg border border-border/70 bg-background/25 p-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && <Bot className="mt-1 h-4 w-4 text-gold" />}
              <div
                className={`max-w-[85%] rounded-lg border px-3 py-2 text-sm ${
                  message.role === 'assistant'
                    ? 'border-border/70 bg-slate-900/80 text-slate-100'
                    : 'border-cyan/40 bg-cyan/15 text-cyan-100'
                }`}
              >
                {message.text}
                {message.role === 'assistant' ? (
                  <div className="mt-2 flex items-center gap-1 text-[10px] uppercase tracking-wider text-mutedForeground">
                    <BadgeCheck className="h-3 w-3" />
                    {message.provider === 'openai' ? 'ChatGPT' : 'Local Rules'}
                  </div>
                ) : null}
              </div>
              {message.role === 'user' && <User className="mt-1 h-4 w-4 text-cyan" />}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void submit();
              }
            }}
            placeholder="Ex: Estamos em janela boa para ouro?"
          />
          <Button onClick={() => void submit()} disabled={loading} size="icon">
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
