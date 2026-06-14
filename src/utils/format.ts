// Date / time formatting helpers.

export interface FormattedDateTime {
  date: string;
  time: string;
  day: string;
}

export function formatDateTime(
  date: Date | null,
  timeZone?: string,
  locale = 'en-US'
): FormattedDateTime {
  if (!date) return { date: 'TBD', time: '', day: '' };
  const opts: Intl.DateTimeFormatOptions = timeZone ? { timeZone } : { timeZone: 'UTC' };
  const day = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    ...opts,
  }).format(date);
  const dateStr = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    ...opts,
  }).format(date);
  const time = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...opts,
  }).format(date);
  return { date: dateStr, time, day };
}

export function dateKey(date: Date | null, timeZone?: string): string {
  if (!date) return 'TBD';
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timeZone || 'UTC',
  }).format(date);
}

export function formatDayHeading(
  date: Date | null,
  timeZone?: string,
  locale = 'en-US'
): string {
  if (!date) return 'Date To Be Determined';
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timeZone || 'UTC',
  }).format(date);
}

export function getLocalTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

// The local "today" rendered in the same date-key form as a match, so we can
// compare a match against the current day in the chosen time zone.
export function todayKey(timeZone?: string): string {
  return dateKey(new Date(), timeZone);
}

export function isSameDay(date: Date | null, timeZone: string | undefined, key: string): boolean {
  if (!date) return false;
  return dateKey(date, timeZone) === key;
}
