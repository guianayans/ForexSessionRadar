import type { AssistantHistoryMessage, AssistantReply, DashboardPayload, Planner, Preferences } from '@/types/dashboard';
import { detectBrowserTimezone, readStoredTimezoneSelection } from '@/lib/timezone-city-options';
import { resolveEffectiveLocale } from '@/lib/locale-selection';

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_IPC__' in window;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (isTauriRuntime() ? 'http://127.0.0.1:4783' : '');
const MOCK_NOW_STORAGE_KEY = 'forex_mock_now';

function getBrowserTimezone() {
  return detectBrowserTimezone() || 'America/Sao_Paulo';
}

function getRuntimeTimezone() {
  const stored = readStoredTimezoneSelection();
  if (stored.lock && stored.timezone) {
    return stored.timezone;
  }

  return getBrowserTimezone();
}

function getRuntimeLocale() {
  return resolveEffectiveLocale(getRuntimeTimezone());
}

function getMockNowIso() {
  if (typeof window === 'undefined') {
    return null;
  }

  const value = window.localStorage.getItem(MOCK_NOW_STORAGE_KEY);
  return value && value.trim() ? value.trim() : null;
}

function withRuntimeParams(path: string) {
  const mockNow = getMockNowIso();
  const timezone = getRuntimeTimezone();
  const locale = getRuntimeLocale();
  const params = new URLSearchParams();

  if (mockNow) {
    params.set('mockNow', mockNow);
  }

  if (timezone) {
    params.set('timezone', timezone);
  }

  if (locale) {
    params.set('locale', locale);
  }

  const query = params.toString();
  if (!query) {
    return path;
  }

  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}${query}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const mockNow = getMockNowIso();
  const timezone = getRuntimeTimezone();
  const locale = getRuntimeLocale();
  const { headers: initHeaders, ...restInit } = init || {};
  const response = await fetch(`${API_BASE_URL}${withRuntimeParams(path)}`, {
    ...restInit,
    headers: {
      'Content-Type': 'application/json',
      ...(mockNow ? { 'x-forex-mock-now': mockNow } : {}),
      ...(timezone ? { 'x-forex-timezone': timezone } : {}),
      ...(locale ? { 'x-forex-locale': locale } : {}),
      ...(initHeaders || {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erro na API (${response.status}): ${text || response.statusText}`);
  }

  return response.json() as Promise<T>;
}

function normalizeDashboardPayload(payload: Partial<DashboardPayload>): DashboardPayload {
  const storedTimezone = readStoredTimezoneSelection();
  const payloadPreferences: Partial<Preferences> = payload.preferences || {};
  const fallbackBaseTimezone =
    storedTimezone.lock && storedTimezone.timezone
      ? storedTimezone.timezone
      : payload.baseTimezone || payloadPreferences.baseTimezone || getRuntimeTimezone();
  const fallbackLock = storedTimezone.lock || Boolean(payloadPreferences.lockBaseTimezone);
  const inferredOpen = payload.currentSession?.id ? payload.currentSession.id !== 'closed' : true;

  const marketState = payload.marketState || {
    isOpen: inferredOpen,
    mode: inferredOpen ? 'open' : 'weekend_closed',
    statusLabel: inferredOpen ? 'Mercado Aberto' : 'Mercado Fechado',
    contextLabel: inferredOpen ? 'Mercado em funcionamento normal' : 'Intervalo de fim de semana',
    nextGlobalOpenIso: null,
    nextGlobalCloseIso: null,
    lastGlobalCloseIso: payload.nowIso || new Date().toISOString(),
    countdownToOpenSeconds: 0,
    countdownToCloseSeconds: 0,
    nextSessionLabel: payload.nextSession?.label || 'Sem proxima sessao',
    nextSessionIso: payload.nextSession?.startIso || null
  };

  const overlap = payload.timeline?.overlap || null;

  return {
    nowIso: payload.nowIso || new Date().toISOString(),
    baseTimezone: fallbackBaseTimezone,
    marketState,
    clocks: Array.isArray(payload.clocks) ? payload.clocks : [],
    timeline: {
      sessions: Array.isArray(payload.timeline?.sessions) ? payload.timeline.sessions : [],
      overlap,
      overlaps: Array.isArray(payload.timeline?.overlaps) ? payload.timeline.overlaps : overlap ? [overlap] : [],
      isPaused: typeof payload.timeline?.isPaused === 'boolean' ? payload.timeline.isPaused : !marketState.isOpen
    },
    currentSession: payload.currentSession || {
      id: 'closed',
      label: 'Mercado Fechado',
      volatility: 'Baixa',
      startIso: null,
      endIso: null,
      recommendedAssets: []
    },
    lastSession: payload.lastSession || null,
    nextSession: payload.nextSession || null,
    radar: {
      recommended: payload.radar?.recommended || [],
      neutral: payload.radar?.neutral || [],
      avoid: payload.radar?.avoid || [],
      context: payload.radar?.context || (marketState.isOpen ? 'open' : 'closed'),
      message: payload.radar?.message
    },
    upcomingEvents: Array.isArray(payload.upcomingEvents) ? payload.upcomingEvents : [],
    nextAlert: payload.nextAlert || null,
    email: payload.email
      ? {
          enabled: Boolean(payload.email.enabled),
          configured: Boolean(payload.email.configured),
          reason: payload.email.reason || null,
          from: payload.email.from || null,
          defaultRecipient: payload.email.defaultRecipient || null
        }
      : null,
    preferences: {
      baseTimezone: fallbackBaseTimezone,
      lockBaseTimezone: fallbackLock,
      alertLeadMinutes: 15,
      alertOnSessionOpen: true,
      alertOnOverlapStart: true,
      alertOnIdealWindowEnd: true,
      emailNotificationsEnabled: false,
      emailAddress: '',
      sessionAlarms: {},
      eventAlarms: {},
      ...payloadPreferences,
      ...(storedTimezone.lock && storedTimezone.timezone
        ? {
            baseTimezone: storedTimezone.timezone,
            lockBaseTimezone: true
          }
        : {})
    },
    planner: payload.planner || {
      checklist: [],
      favorites: [],
      notes: '',
      lockoutEnabled: false
    }
  };
}

export async function fetchDashboard() {
  const payload = await request<Partial<DashboardPayload>>('/api/dashboard');
  return normalizeDashboardPayload(payload);
}

export async function updatePreferences(payload: Partial<Preferences>) {
  return request<Preferences>('/api/preferences', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function updatePlanner(payload: Partial<Planner>) {
  return request<Planner>('/api/planner', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function askAssistant(question: string, apiKey?: string, history?: AssistantHistoryMessage[]) {
  return request<AssistantReply>('/api/assistant/query', {
    method: 'POST',
    body: JSON.stringify({ question, apiKey, history })
  });
}

export interface EmailConfigPayload {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  whitelabelFrom: string;
  defaultTo: string;
  envPath?: string;
}

export interface EmailConfigTestResult {
  ok: boolean;
  message: string;
  messageId?: string | null;
}

export interface TimelineSnapshotPayload {
  imageDataUrl: string;
  capturedAtIso?: string;
  timezone?: string;
  locale?: string;
}

export interface TimelineSnapshotResult {
  ok: boolean;
  capturedAtIso: string;
  sizeBytes: number;
  mimeType: string;
}

export async function fetchEmailConfig() {
  return request<EmailConfigPayload>('/api/email-config');
}

export async function updateEmailConfig(payload: Partial<EmailConfigPayload>) {
  return request<EmailConfigPayload>('/api/email-config', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function testEmailConfig(payload: Partial<EmailConfigPayload> & { testTo?: string }) {
  return request<EmailConfigTestResult>('/api/email-config/test', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function uploadTimelineSnapshot(payload: TimelineSnapshotPayload) {
  return request<TimelineSnapshotResult>('/api/timeline-snapshot', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
