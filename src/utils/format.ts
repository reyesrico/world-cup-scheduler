// Date / time formatting helpers.

export interface FormattedDateTime {
  date: string;
  time: string;
  day: string;
}

export function formatDateTime(
  date: Date | null,
  timeZone?: string
): FormattedDateTime {
  if (!date) return { date: 'TBD', time: '', day: '' };
  const opts: Intl.DateTimeFormatOptions = timeZone ? { timeZone } : { timeZone: 'UTC' };
  const day = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    ...opts,
  }).format(date);
  const dateStr = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    ...opts,
  }).format(date);
  const time = new Intl.DateTimeFormat('en-US', {
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

export function formatDayHeading(date: Date | null, timeZone?: string): string {
  if (!date) return 'Date To Be Determined';
  return new Intl.DateTimeFormat('en-US', {
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
