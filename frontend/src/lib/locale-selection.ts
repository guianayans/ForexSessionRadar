import { resolveLocaleFromTimezone, type SupportedLocale } from '@/lib/i18n';

export type LocaleSelectionMode = 'auto' | 'manual';

export interface StoredLocaleSelection {
  mode: LocaleSelectionMode;
  locale: SupportedLocale | null;
}

export const LOCALE_MODE_STORAGE_KEY = 'forex_locale_mode';
export const LOCALE_VALUE_STORAGE_KEY = 'forex_locale_value';

export const SUPPORTED_LOCALES: SupportedLocale[] = ['pt-BR', 'en-US', 'es-ES'];

function normalizeLocale(value: string | null | undefined): SupportedLocale | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return (SUPPORTED_LOCALES.includes(normalized as SupportedLocale) ? normalized : null) as SupportedLocale | null;
}

export function readStoredLocaleSelection(): StoredLocaleSelection {
  if (typeof window === 'undefined') {
    return { mode: 'auto', locale: null };
  }

  const modeRaw = window.localStorage.getItem(LOCALE_MODE_STORAGE_KEY);
  const localeRaw = window.localStorage.getItem(LOCALE_VALUE_STORAGE_KEY);
  const mode: LocaleSelectionMode = modeRaw === 'manual' ? 'manual' : 'auto';
  const locale = normalizeLocale(localeRaw);

  return {
    mode,
    locale
  };
}

export function persistStoredLocaleSelection(selection: StoredLocaleSelection) {
  if (typeof window === 'undefined') {
    return;
  }

  if (selection.mode !== 'manual' || !selection.locale) {
    window.localStorage.setItem(LOCALE_MODE_STORAGE_KEY, 'auto');
    window.localStorage.removeItem(LOCALE_VALUE_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(LOCALE_MODE_STORAGE_KEY, 'manual');
  window.localStorage.setItem(LOCALE_VALUE_STORAGE_KEY, selection.locale);
}

export function resolveEffectiveLocale(timezone?: string | null, selection?: StoredLocaleSelection): SupportedLocale {
  const effectiveSelection = selection || readStoredLocaleSelection();
  if (effectiveSelection.mode === 'manual' && effectiveSelection.locale) {
    return effectiveSelection.locale;
  }

  return resolveLocaleFromTimezone(timezone);
}
