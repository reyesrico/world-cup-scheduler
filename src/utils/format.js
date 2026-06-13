// Date / time formatting helpers.

export function formatDateTime(date, timeZone) {
  if (!date) return { date: 'TBD', time: '', day: '' };
  const opts = timeZone ? { timeZone } : { timeZone: 'UTC' };
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

export function dateKey(date, timeZone) {
  if (!date) return 'TBD';
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timeZone || 'UTC',
  }).format(date);
}

export function formatDayHeading(date, timeZone) {
  if (!date) return 'Date To Be Determined';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timeZone || 'UTC',
  }).format(date);
}

export function getLocalTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
