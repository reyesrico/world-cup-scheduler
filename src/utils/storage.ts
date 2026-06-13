// Lightweight localStorage persistence for scores and a custom imported ICS.

import type { ScoreMap } from '../types';

const SCORES_KEY = 'wc_scores_v1';
const ICS_KEY = 'wc_ics_v1';
const ICS_NAME_KEY = 'wc_ics_name_v1';

export interface CustomIcs {
  text: string;
  name: string;
}

function safeParse<T>(json: string | null, fallback: T): T {
  try {
    return json ? (JSON.parse(json) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadScores(): ScoreMap {
  return safeParse<ScoreMap>(localStorage.getItem(SCORES_KEY), {});
}

export function saveScores(scores: ScoreMap): void {
  localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
}

export function loadCustomIcs(): CustomIcs | null {
  const text = localStorage.getItem(ICS_KEY);
  if (!text) return null;
  return { text, name: localStorage.getItem(ICS_NAME_KEY) || 'Imported calendar' };
}

export function saveCustomIcs(text: string, name?: string): void {
  localStorage.setItem(ICS_KEY, text);
  if (name) localStorage.setItem(ICS_NAME_KEY, name);
}

export function clearCustomIcs(): void {
  localStorage.removeItem(ICS_KEY);
  localStorage.removeItem(ICS_NAME_KEY);
}

export function clearScores(): void {
  localStorage.removeItem(SCORES_KEY);
}
