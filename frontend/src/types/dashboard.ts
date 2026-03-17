export interface ClockItem {
  id: string;
  label: string;
  timezone: string;
  time: string;
}

export interface SessionWindow {
  id: 'sydney' | 'tokyo' | 'london' | 'new_york';
  label: string;
  shortLabel: string;
  color: string;
  volatility: string;
  timezone: string;
  openLocal: string;
  closeLocal: string;
  startIso: string;
  endIso: string;
  startLabel: string;
  endLabel: string;
  openInSaoPaulo: string;
  closeInSaoPaulo: string;
  timeToOpenSeconds: number | null;
  timeToCloseSeconds: number | null;
  isDstNow: boolean;
  currentOffset: string;
  offsetMinutes: number;
  isActive: boolean;
  windows?: Array<{
    id: string;
    startIso: string;
    endIso: string;
    startLabel: string;
    endLabel: string;
  }>;
}

export interface OverlapWindow {
  id: string;
  label: string;
  sessions: string[];
  startIso: string;
  endIso: string;
  startLabel: string;
  endLabel: string;
  countdownSeconds: number;
  isActive: boolean;
}

export interface Radar {
  recommended: string[];
  neutral: string[];
  avoid: string[];
  context: string;
  message?: string;
}

export interface CurrentSession {
  id: string;
  label: string;
  volatility: string;
  startIso: string | null;
  endIso: string | null;
  recommendedAssets: string[];
}

export interface LastSession {
  id: string;
  label: string;
  endIso: string;
  endLabel: string;
  elapsedSinceEndSeconds: number;
}

export interface NextSession {
  id: string;
  label: string;
  startIso: string;
  countdownSeconds: number;
}

export interface UpcomingEvent {
  id: string;
  type: 'session_open' | 'session_close' | 'overlap_start' | 'ideal_window_end' | 'weekly_open' | 'weekly_close';
  title: string;
  timeIso: string;
  countdownSeconds: number;
  sessionId?: SessionWindow['id'];
}

export interface NextAlert {
  id: string;
  title: string;
  type: UpcomingEvent['type'];
  leadMinutes: number;
  eventTimeIso: string;
  triggerTimeIso: string;
  countdownSeconds: number;
}

export interface SessionAlarmConfig {
  open?: boolean;
  close?: boolean;
  favorite?: boolean;
  beforeMinutes?: Array<5 | 10 | 15 | 30>;
}

export interface EventAlarmConfig {
  enabled?: boolean;
  leadMinutes?: 5 | 10 | 15 | 30;
  beforeMinutes?: Array<5 | 10 | 15 | 30>;
}

export interface Preferences {
  baseTimezone: string;
  lockBaseTimezone?: boolean;
  alertLeadMinutes: 5 | 10 | 15 | 30;
  alertOnSessionOpen: boolean;
  alertOnOverlapStart: boolean;
  alertOnIdealWindowEnd: boolean;
  emailNotificationsEnabled?: boolean;
  emailAddress?: string;
  sessionAlarms?: Partial<Record<SessionWindow['id'], SessionAlarmConfig>>;
  eventAlarms?: Record<string, EventAlarmConfig>;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface Planner {
  checklist: ChecklistItem[];
  favorites: string[];
  notes: string;
  lockoutEnabled: boolean;
}

export interface DashboardPayload {
  nowIso: string;
  baseTimezone: string;
  marketState: MarketState;
  clocks: ClockItem[];
  timeline: {
    sessions: SessionWindow[];
    overlap: OverlapWindow | null;
    overlaps: OverlapWindow[];
    isPaused: boolean;
  };
  currentSession: CurrentSession;
  lastSession: LastSession | null;
  nextSession: NextSession | null;
  radar: Radar;
  upcomingEvents: UpcomingEvent[];
  nextAlert: NextAlert | null;
  email?: {
    enabled: boolean;
    configured: boolean;
    reason?: string | null;
    from?: string | null;
    defaultRecipient?: string | null;
  } | null;
  preferences: Preferences;
  planner: Planner;
}

export interface AssistantReply {
  answer: string;
  confidence: 'low' | 'medium' | 'high';
  provider: 'local' | 'openai';
  context: {
    session: string;
    nowIso: string;
  };
}

export interface MarketState {
  isOpen: boolean;
  mode: 'open' | 'week_closing' | 'weekend_closed' | 'pre_open';
  statusLabel: string;
  contextLabel: string;
  nextGlobalOpenIso: string | null;
  nextGlobalCloseIso: string | null;
  lastGlobalCloseIso: string;
  countdownToOpenSeconds: number;
  countdownToCloseSeconds: number;
  nextSessionLabel: string;
  nextSessionIso: string | null;
}

export interface AssistantHistoryMessage {
  role: 'user' | 'assistant';
  text: string;
}
