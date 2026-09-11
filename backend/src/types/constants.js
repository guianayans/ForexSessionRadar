const BASE_TIMEZONE = 'America/Sao_Paulo';

const FOREX_UTC_CONFIG = {
  global: {
    open: { weekday: 7, time: '21:00' }, // Domingo 21:00 UTC
    close: { weekday: 5, time: '22:00' } // Sexta 22:00 UTC
  },
  sessions: {
    sydney: { open: '21:00', close: '06:00' },
    tokyo: { open: '00:00', close: '09:00' },
    hong_kong: { open: '01:30', close: '08:00' },
    shanghai: { open: '01:30', close: '07:00' },
    london: { open: '07:00', close: '16:00' },
    brazil: { open: '12:00', close: '21:00' },
    new_york: { open: '13:00', close: '22:00' }
  }
};

const CLOCKS = [
  { id: 'brasilia', label: 'Brasilia', timezone: 'America/Sao_Paulo' },
  { id: 'london', label: 'Londres', timezone: 'Europe/London' },
  { id: 'new_york', label: 'Nova York', timezone: 'America/New_York' },
  { id: 'sydney', label: 'Sydney', timezone: 'Australia/Sydney' },
  { id: 'tokyo', label: 'Toquio', timezone: 'Asia/Tokyo' },
  { id: 'hong_kong', label: 'Hong Kong', timezone: 'Asia/Hong_Kong' }
];

const SESSION_DEFINITIONS = [
  {
    id: 'sydney',
    label: 'Sessao de Sydney',
    shortLabel: 'Sydney',
    timezone: 'Australia/Sydney',
    openLocal: '08:00',
    closeLocal: '17:00',
    color: '#5f8cff',
    volatility: 'Moderada'
  },
  {
    id: 'tokyo',
    label: 'Sessao Asiatica',
    shortLabel: 'Toquio',
    timezone: 'Asia/Tokyo',
    openLocal: '09:00',
    closeLocal: '18:00',
    color: '#1d6bff',
    volatility: 'Moderada'
  },
  {
    id: 'hong_kong',
    label: 'Bolsa de Hong Kong',
    shortLabel: 'Hong Kong',
    timezone: 'Asia/Hong_Kong',
    openLocal: '09:30',
    closeLocal: '16:00',
    color: '#c41e3a',
    volatility: 'Moderada'
  },
  {
    id: 'shanghai',
    label: 'Bolsa de Xangai',
    shortLabel: 'Xangai',
    timezone: 'Asia/Shanghai',
    openLocal: '09:30',
    closeLocal: '15:00',
    color: '#d4a017',
    volatility: 'Moderada'
  },
  {
    id: 'london',
    label: 'Sessao Europeia',
    shortLabel: 'Londres',
    timezone: 'Europe/London',
    openLocal: '08:00',
    closeLocal: '17:00',
    color: '#00b8d9',
    volatility: 'Alta'
  },
  {
    id: 'brazil',
    label: 'Bolsa do Brasil',
    shortLabel: 'Brasil',
    timezone: 'America/Sao_Paulo',
    openLocal: '09:00',
    closeLocal: '18:00',
    color: '#009c3b',
    volatility: 'Moderada'
  },
  {
    id: 'new_york',
    label: 'Sessao Americana',
    shortLabel: 'Nova York',
    timezone: 'America/New_York',
    openLocal: '08:00',
    closeLocal: '17:00',
    color: '#ff5b4d',
    volatility: 'Alta'
  }
];

const RADAR_MAP = {
  tokyo: {
    recommended: ['JP225', 'AUD/USD', 'NZD/USD', 'USD/JPY'],
    neutral: ['EUR/JPY', 'GBP/JPY', 'AUD/JPY'],
    avoid: ['XAUUSD', 'US100', 'US500', 'HK50']
  },
  hong_kong: {
    recommended: ['HK50'],
    neutral: ['USD/JPY', 'JP225', 'AUD/USD', 'NZD/USD'],
    avoid: ['XAUUSD', 'US100', 'US500']
  },
  shanghai: {
    recommended: ['CHINA50'],
    neutral: ['USD/CNH', 'HK50', 'JP225'],
    avoid: ['XAUUSD', 'US100', 'US500']
  },
  brazil: {
    recommended: ['IBOVESPA'],
    neutral: ['USD/BRL', 'EUR/USD', 'XAUUSD'],
    avoid: ['US100', 'US500', 'HK50']
  },
  sydney: {
    recommended: ['AUD/USD', 'NZD/USD', 'USD/JPY', 'JP225'],
    neutral: ['EUR/JPY', 'AUD/JPY', 'GBP/JPY'],
    avoid: ['XAUUSD', 'US100', 'US500']
  },
  london: {
    recommended: ['EUR/USD', 'GBP/USD', 'GER40', 'XAUUSD'],
    neutral: ['USD/CHF', 'EUR/GBP', 'US30'],
    avoid: ['AUD/NZD', 'JP225', 'HK50']
  },
  new_york: {
    recommended: ['EUR/USD', 'GBP/USD', 'XAUUSD', 'US100', 'US500'],
    neutral: ['USD/CAD', 'US30', 'GBP/JPY'],
    avoid: ['AUD/NZD', 'NZD/CHF', 'HK50']
  },
  gold: {
    recommended: ['XAUUSD', 'US100', 'EUR/USD', 'GBP/USD'],
    neutral: ['US500', 'US30', 'USD/JPY'],
    avoid: ['AUD/NZD', 'NZD/CHF', 'HK50']
  },
  closed: {
    recommended: [],
    neutral: [],
    avoid: [],
    message: 'Mercado fechado. Use este periodo para revisao e planejamento.'
  }
};

const DEFAULT_STORE = {
  preferences: {
    baseTimezone: BASE_TIMEZONE,
    lockBaseTimezone: false
  },
  planner: {
    checklist: [
      { id: 'support', label: 'Revisar niveis de suporte e resistencia', done: false },
      { id: 'calendar', label: 'Conferir calendario economico', done: false },
      { id: 'risk', label: 'Confirmar risco maximo por trade', done: false }
    ],
    favorites: ['EUR/USD', 'XAUUSD'],
    notes: '',
    lockoutEnabled: false
  }
};

module.exports = {
  BASE_TIMEZONE,
  FOREX_UTC_CONFIG,
  CLOCKS,
  SESSION_DEFINITIONS,
  RADAR_MAP,
  DEFAULT_STORE
};
