export interface TimezoneCityOption {
  city: string;
  timezone: string;
  gmt: string;
  value: string;
  label: string;
}

export const TIMEZONE_LOCK_STORAGE_KEY = 'forex_timezone_lock';
export const TIMEZONE_VALUE_STORAGE_KEY = 'forex_timezone_value';
export const TIMEZONE_CITY_VALUE_STORAGE_KEY = 'forex_timezone_city_value';

const RAW_TIMEZONE_CITIES: Array<{ city: string; timezone: string; gmt: string }> = [
  { city: 'Honolulu', timezone: 'Pacific/Honolulu', gmt: 'GMT-10' },
  { city: 'Anchorage', timezone: 'America/Anchorage', gmt: 'GMT-9' },
  { city: 'Los Angeles', timezone: 'America/Los_Angeles', gmt: 'GMT-8' },
  { city: 'San Francisco', timezone: 'America/Los_Angeles', gmt: 'GMT-8' },
  { city: 'Vancouver', timezone: 'America/Vancouver', gmt: 'GMT-8' },
  { city: 'Denver', timezone: 'America/Denver', gmt: 'GMT-7' },
  { city: 'Phoenix', timezone: 'America/Phoenix', gmt: 'GMT-7' },
  { city: 'Chicago', timezone: 'America/Chicago', gmt: 'GMT-6' },
  { city: 'Mexico City', timezone: 'America/Mexico_City', gmt: 'GMT-6' },
  { city: 'New York', timezone: 'America/New_York', gmt: 'GMT-5' },
  { city: 'Toronto', timezone: 'America/Toronto', gmt: 'GMT-5' },
  { city: 'Bogota', timezone: 'America/Bogota', gmt: 'GMT-5' },
  { city: 'Lima', timezone: 'America/Lima', gmt: 'GMT-5' },
  { city: 'Caracas', timezone: 'America/Caracas', gmt: 'GMT-4' },
  { city: 'La Paz', timezone: 'America/La_Paz', gmt: 'GMT-4' },
  { city: 'Santiago', timezone: 'America/Santiago', gmt: 'GMT-4' },
  { city: 'Sao Paulo', timezone: 'America/Sao_Paulo', gmt: 'GMT-3' },
  { city: 'Rio de Janeiro', timezone: 'America/Sao_Paulo', gmt: 'GMT-3' },
  { city: 'Buenos Aires', timezone: 'America/Argentina/Buenos_Aires', gmt: 'GMT-3' },
  { city: 'Montevideo', timezone: 'America/Montevideo', gmt: 'GMT-3' },
  { city: 'Praia', timezone: 'Atlantic/Cape_Verde', gmt: 'GMT-1' },
  { city: 'London', timezone: 'Europe/London', gmt: 'GMT+0' },
  { city: 'Dublin', timezone: 'Europe/Dublin', gmt: 'GMT+0' },
  { city: 'Lisbon', timezone: 'Europe/Lisbon', gmt: 'GMT+0' },
  { city: 'Reykjavik', timezone: 'Atlantic/Reykjavik', gmt: 'GMT+0' },
  { city: 'Paris', timezone: 'Europe/Paris', gmt: 'GMT+1' },
  { city: 'Madrid', timezone: 'Europe/Madrid', gmt: 'GMT+1' },
  { city: 'Rome', timezone: 'Europe/Rome', gmt: 'GMT+1' },
  { city: 'Berlin', timezone: 'Europe/Berlin', gmt: 'GMT+1' },
  { city: 'Lagos', timezone: 'Africa/Lagos', gmt: 'GMT+1' },
  { city: 'Athens', timezone: 'Europe/Athens', gmt: 'GMT+2' },
  { city: 'Cairo', timezone: 'Africa/Cairo', gmt: 'GMT+2' },
  { city: 'Johannesburg', timezone: 'Africa/Johannesburg', gmt: 'GMT+2' },
  { city: 'Jerusalem', timezone: 'Asia/Jerusalem', gmt: 'GMT+2' },
  { city: 'Moscow', timezone: 'Europe/Moscow', gmt: 'GMT+3' },
  { city: 'Riyadh', timezone: 'Asia/Riyadh', gmt: 'GMT+3' },
  { city: 'Nairobi', timezone: 'Africa/Nairobi', gmt: 'GMT+3' },
  { city: 'Dubai', timezone: 'Asia/Dubai', gmt: 'GMT+4' },
  { city: 'Baku', timezone: 'Asia/Baku', gmt: 'GMT+4' },
  { city: 'Karachi', timezone: 'Asia/Karachi', gmt: 'GMT+5' },
  { city: 'Tashkent', timezone: 'Asia/Tashkent', gmt: 'GMT+5' },
  { city: 'New Delhi', timezone: 'Asia/Kolkata', gmt: 'GMT+5:30' },
  { city: 'Mumbai', timezone: 'Asia/Kolkata', gmt: 'GMT+5:30' },
  { city: 'Kathmandu', timezone: 'Asia/Kathmandu', gmt: 'GMT+5:45' },
  { city: 'Dhaka', timezone: 'Asia/Dhaka', gmt: 'GMT+6' },
  { city: 'Yangon', timezone: 'Asia/Yangon', gmt: 'GMT+6:30' },
  { city: 'Bangkok', timezone: 'Asia/Bangkok', gmt: 'GMT+7' },
  { city: 'Jakarta', timezone: 'Asia/Jakarta', gmt: 'GMT+7' },
  { city: 'Ho Chi Minh City', timezone: 'Asia/Ho_Chi_Minh', gmt: 'GMT+7' },
  { city: 'Beijing', timezone: 'Asia/Shanghai', gmt: 'GMT+8' },
  { city: 'Hong Kong', timezone: 'Asia/Hong_Kong', gmt: 'GMT+8' },
  { city: 'Singapore', timezone: 'Asia/Singapore', gmt: 'GMT+8' },
  { city: 'Perth', timezone: 'Australia/Perth', gmt: 'GMT+8' },
  { city: 'Tokyo', timezone: 'Asia/Tokyo', gmt: 'GMT+9' },
  { city: 'Seoul', timezone: 'Asia/Seoul', gmt: 'GMT+9' },
  { city: 'Adelaide', timezone: 'Australia/Adelaide', gmt: 'GMT+9:30' },
  { city: 'Darwin', timezone: 'Australia/Darwin', gmt: 'GMT+9:30' },
  { city: 'Sydney', timezone: 'Australia/Sydney', gmt: 'GMT+10' },
  { city: 'Melbourne', timezone: 'Australia/Melbourne', gmt: 'GMT+10' },
  { city: 'Brisbane', timezone: 'Australia/Brisbane', gmt: 'GMT+10' },
  { city: 'Noumea', timezone: 'Pacific/Noumea', gmt: 'GMT+11' },
  { city: 'Auckland', timezone: 'Pacific/Auckland', gmt: 'GMT+12' },
  { city: 'Wellington', timezone: 'Pacific/Auckland', gmt: 'GMT+12' },
  { city: "Nuku'alofa", timezone: 'Pacific/Tongatapu', gmt: 'GMT+13' },
  { city: 'Kiritimati', timezone: 'Pacific/Kiritimati', gmt: 'GMT+14' }
];

export const TIMEZONE_CITY_OPTIONS: TimezoneCityOption[] = [...RAW_TIMEZONE_CITIES]
  .sort((a, b) => a.city.localeCompare(b.city, 'en', { sensitivity: 'base' }))
  .map((item) => ({
    ...item,
    value: `${item.city}__${item.timezone}`,
    label: `${item.city} (${item.gmt})`
  }));

export function findTimezoneOptionByTimezone(timezone: string | undefined | null) {
  if (!timezone) {
    return null;
  }

  const normalized = timezone.trim();
  const zoneTail = normalized.split('/').pop()?.replace(/_/g, ' ');
  return (
    TIMEZONE_CITY_OPTIONS.find((item) => item.timezone === normalized && item.city.toLowerCase() === zoneTail?.toLowerCase()) ||
    TIMEZONE_CITY_OPTIONS.find((item) => item.timezone === normalized) ||
    null
  );
}

export function detectBrowserTimezone() {
  if (typeof window === 'undefined') {
    return null;
  }

  const candidate = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!candidate || !candidate.trim()) {
    return null;
  }

  return candidate;
}

export function readStoredTimezoneSelection() {
  if (typeof window === 'undefined') {
    return {
      lock: false,
      timezone: null as string | null,
      cityValue: null as string | null
    };
  }

  const lockRaw = window.localStorage.getItem(TIMEZONE_LOCK_STORAGE_KEY);
  const timezoneRaw = window.localStorage.getItem(TIMEZONE_VALUE_STORAGE_KEY);
  const cityValueRaw = window.localStorage.getItem(TIMEZONE_CITY_VALUE_STORAGE_KEY);

  return {
    lock: lockRaw === '1',
    timezone: timezoneRaw && timezoneRaw.trim() ? timezoneRaw.trim() : null,
    cityValue: cityValueRaw && cityValueRaw.trim() ? cityValueRaw.trim() : null
  };
}

export function persistStoredTimezoneSelection(payload: {
  lock: boolean;
  timezone: string | null;
  cityValue?: string | null;
}) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!payload.lock || !payload.timezone) {
    window.localStorage.setItem(TIMEZONE_LOCK_STORAGE_KEY, '0');
    window.localStorage.removeItem(TIMEZONE_VALUE_STORAGE_KEY);
    window.localStorage.removeItem(TIMEZONE_CITY_VALUE_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(TIMEZONE_LOCK_STORAGE_KEY, '1');
  window.localStorage.setItem(TIMEZONE_VALUE_STORAGE_KEY, payload.timezone);
  if (payload.cityValue) {
    window.localStorage.setItem(TIMEZONE_CITY_VALUE_STORAGE_KEY, payload.cityValue);
  } else {
    window.localStorage.removeItem(TIMEZONE_CITY_VALUE_STORAGE_KEY);
  }
}

export function resolveTimezoneFromCityValue(cityValue: string | null | undefined) {
  if (!cityValue) {
    return null;
  }

  const direct = TIMEZONE_CITY_OPTIONS.find((item) => item.value === cityValue);
  if (direct) {
    return { timezone: direct.timezone, value: direct.value };
  }

  const [, maybeTimezone] = cityValue.split('__');
  if (!maybeTimezone) {
    return null;
  }

  const byTimezone = findTimezoneOptionByTimezone(maybeTimezone);
  if (!byTimezone) {
    return null;
  }

  return { timezone: byTimezone.timezone, value: byTimezone.value };
}

export function formatTimezoneCityLabel(timezone: string) {
  const mapped = findTimezoneOptionByTimezone(timezone);
  if (mapped) {
    return mapped.city;
  }

  const segments = timezone.split('/');
  const tail = segments[segments.length - 1] || timezone;
  return tail.replace(/_/g, ' ');
}
