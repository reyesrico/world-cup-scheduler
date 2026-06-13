// Lightweight localStorage persistence for scores and a custom imported ICS.

const SCORES_KEY = 'wc_scores_v1';
const ICS_KEY = 'wc_ics_v1';
const ICS_NAME_KEY = 'wc_ics_name_v1';

function safeParse(json, fallback) {
  try {
    return json ? JSON.parse(json) : fallback;
  } catch {
    return fallback;
  }
}

export function loadScores() {
  return safeParse(localStorage.getItem(SCORES_KEY), {});
}

export function saveScores(scores) {
  localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
}

export function loadCustomIcs() {
  const text = localStorage.getItem(ICS_KEY);
  if (!text) return null;
  return { text, name: localStorage.getItem(ICS_NAME_KEY) || 'Imported calendar' };
}

export function saveCustomIcs(text, name) {
  localStorage.setItem(ICS_KEY, text);
  if (name) localStorage.setItem(ICS_NAME_KEY, name);
}

export function clearCustomIcs() {
  localStorage.removeItem(ICS_KEY);
  localStorage.removeItem(ICS_NAME_KEY);
}

export function clearScores() {
  localStorage.removeItem(SCORES_KEY);
}
