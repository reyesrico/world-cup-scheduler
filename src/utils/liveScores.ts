// Fetches real, already-played match results from ESPN's free public
// scoreboard API and maps them onto our calendar matches.
//
//   https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=YYYYMMDD-YYYYMMDD
//
// The endpoint sends permissive CORS headers, needs no API key, and returns
// completed-game scores (including penalty shootouts). We match an ESPN event
// to one of our matches by the (unordered) pair of team names on the same day,
// using a small alias table to reconcile naming differences.

import type { ResolvedMatch } from '../types';

const ESPN_URL =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

export interface LiveScore {
  home: number;
  away: number;
  homePen: number | null;
  awayPen: number | null;
}

export type LiveScoreMap = Record<number, LiveScore>;

// Maps differing spellings to a shared canonical token so ICS and ESPN names
// line up. Only mismatched variants need an entry; identical names match via
// normalization alone.
const ALIASES: Record<string, string> = {
  czechrepublic: 'czechia',
  bosniaandherzegovina: 'bosniaherzegovina',
  turkey: 'turkiye',
  ivorycoast: 'cotedivoire',
  caboverde: 'capeverde',
  iriran: 'iran',
  korearepublic: 'southkorea',
  korearep: 'southkorea',
  usa: 'unitedstates',
  unitedstatesofamerica: 'unitedstates',
  drcongo: 'congodr',
  republicofireland: 'ireland',
};

function norm(name: string): string {
  const n = (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return ALIASES[n] ?? n;
}

function pairKey(a: string, b: string): string {
  return [norm(a), norm(b)].sort().join('|');
}

function ymd(date: Date): string {
  return (
    date.getUTCFullYear().toString().padStart(4, '0') +
    (date.getUTCMonth() + 1).toString().padStart(2, '0') +
    date.getUTCDate().toString().padStart(2, '0')
  );
}

interface EspnRecord {
  homeNorm: string;
  homeScore: number;
  awayScore: number;
  homePen: number | null;
  awayPen: number | null;
}

interface EspnCompetitor {
  homeAway?: string;
  score?: string | number;
  shootoutScore?: string | number;
  team?: { displayName?: string };
}

interface EspnEvent {
  date?: string;
  competitions?: {
    status?: { type?: { completed?: boolean } };
    competitors?: EspnCompetitor[];
  }[];
}

function toNum(v: string | number | undefined): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

// Splits the tournament span into windows so a single query never bumps into
// the API's ~100-event response cap.
function buildWindows(min: Date, max: Date): [string, string][] {
  const windows: [string, string][] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const stepMs = 18 * dayMs;
  let start = Date.UTC(min.getUTCFullYear(), min.getUTCMonth(), min.getUTCDate());
  const end = Date.UTC(max.getUTCFullYear(), max.getUTCMonth(), max.getUTCDate());
  while (start <= end) {
    const windowEnd = Math.min(start + stepMs - dayMs, end);
    windows.push([ymd(new Date(start)), ymd(new Date(windowEnd))]);
    start += stepMs;
  }
  return windows;
}

export async function fetchLiveScores(
  matches: ResolvedMatch[],
  signal?: AbortSignal
): Promise<LiveScoreMap> {
  const dated = matches.filter((m) => m.start);
  if (dated.length === 0) return {};

  const times = dated.map((m) => m.start!.getTime());
  const min = new Date(Math.min(...times));
  const max = new Date(Math.max(...times));

  const byKey = new Map<string, EspnRecord>();

  for (const [from, to] of buildWindows(min, max)) {
    const res = await fetch(`${ESPN_URL}?dates=${from}-${to}`, { signal });
    if (!res.ok) continue;
    const data: { events?: EspnEvent[] } = await res.json();
    for (const ev of data.events ?? []) {
      const comp = ev.competitions?.[0];
      if (!comp?.status?.type?.completed) continue;
      const home = comp.competitors?.find((c) => c.homeAway === 'home');
      const away = comp.competitors?.find((c) => c.homeAway === 'away');
      if (!home?.team?.displayName || !away?.team?.displayName) continue;
      const hs = toNum(home.score);
      const as = toNum(away.score);
      if (hs == null || as == null) continue;

      const rec: EspnRecord = {
        homeNorm: norm(home.team.displayName),
        homeScore: hs,
        awayScore: as,
        homePen: toNum(home.shootoutScore),
        awayPen: toNum(away.shootoutScore),
      };
      const day = (ev.date || '').slice(0, 10);
      const pk = pairKey(home.team.displayName, away.team.displayName);
      byKey.set(`${day}|${pk}`, rec);
      byKey.set(`*|${pk}`, rec); // date-agnostic fallback
    }
  }

  const out: LiveScoreMap = {};
  for (const m of dated) {
    const hn = m.resolvedHome?.name;
    const an = m.resolvedAway?.name;
    if (!hn || !an || !m.resolvedHome.decided || !m.resolvedAway.decided) continue;

    const day = m.start!.toISOString().slice(0, 10);
    const pk = pairKey(hn, an);
    const rec = byKey.get(`${day}|${pk}`) ?? byKey.get(`*|${pk}`);
    if (!rec) continue;

    const homeIsRecHome = norm(hn) === rec.homeNorm;
    out[m.id] = {
      home: homeIsRecHome ? rec.homeScore : rec.awayScore,
      away: homeIsRecHome ? rec.awayScore : rec.homeScore,
      homePen: homeIsRecHome ? rec.homePen : rec.awayPen,
      awayPen: homeIsRecHome ? rec.awayPen : rec.homePen,
    };
  }
  return out;
}
