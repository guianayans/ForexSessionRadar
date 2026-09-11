import type { ChecklistItem, Planner } from '@/types/dashboard';

const STORAGE_KEY = 'forexRadar.planner.v1';

export const DEFAULT_PLANNER: Planner = {
  checklist: [
    { id: 'support', label: 'Revisar niveis de suporte e resistencia', done: false },
    { id: 'calendar', label: 'Conferir calendario economico', done: false },
    { id: 'risk', label: 'Confirmar risco maximo por trade', done: false }
  ],
  favorites: ['EUR/USD', 'XAUUSD'],
  notes: '',
  lockoutEnabled: false
};

function isChecklistItem(value: unknown): value is ChecklistItem {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const item = value as ChecklistItem;
  return typeof item.id === 'string' && typeof item.label === 'string' && typeof item.done === 'boolean';
}

function parsePlanner(raw: string): Planner | null {
  try {
    const parsed = JSON.parse(raw) as Partial<Planner>;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const checklist = Array.isArray(parsed.checklist)
      ? parsed.checklist.filter(isChecklistItem)
      : DEFAULT_PLANNER.checklist;
    const favorites = Array.isArray(parsed.favorites)
      ? parsed.favorites.filter((item): item is string => typeof item === 'string')
      : DEFAULT_PLANNER.favorites;

    return {
      checklist: checklist.length ? checklist : DEFAULT_PLANNER.checklist,
      favorites,
      notes: typeof parsed.notes === 'string' ? parsed.notes : '',
      lockoutEnabled: Boolean(parsed.lockoutEnabled)
    };
  } catch {
    return null;
  }
}

export function readPlannerFromBrowser(): Planner | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  return parsePlanner(raw);
}

export function writePlannerToBrowser(planner: Planner) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(planner));
}

export function mergePlanner(base: Planner, patch: Partial<Planner>): Planner {
  return {
    checklist: patch.checklist ?? base.checklist,
    favorites: patch.favorites ?? base.favorites,
    notes: patch.notes ?? base.notes,
    lockoutEnabled: patch.lockoutEnabled ?? base.lockoutEnabled
  };
}

/** Planner deste navegador; usa defaults do servidor só na primeira visita. */
export function resolvePlannerForBrowser(serverSeed?: Planner | null): Planner {
  const stored = readPlannerFromBrowser();
  if (stored) {
    return stored;
  }

  const seed = serverSeed && serverSeed.checklist.length ? serverSeed : DEFAULT_PLANNER;
  writePlannerToBrowser(seed);
  return seed;
}

export function savePlannerPatch(current: Planner, patch: Partial<Planner>): Planner {
  const next = mergePlanner(current, patch);
  writePlannerToBrowser(next);
  return next;
}
