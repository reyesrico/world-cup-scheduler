// Shared domain types for the tournament scheduler.

// A team slot on a match: either a real team or a bracket placeholder.
// Fields beyond `kind`/`flag`/`label` are only present for some kinds.
export interface TeamSlot {
  kind:
    | 'team'
    | 'winnerGroup'
    | 'runnerGroup'
    | 'thirdPlace'
    | 'winnerMatch'
    | 'loserMatch';
  flag: string;
  label: string;
  /** Present for `team`. */
  name?: string;
  /** Present for `winnerGroup` / `runnerGroup`. */
  group?: string;
  /** Present for `thirdPlace`. */
  groups?: string[];
  /** 0-based match id, present for `winnerMatch` / `loserMatch`. */
  match?: number;
}

export interface Match {
  id: number;
  uid: string;
  stage: string;
  group: string;
  start: Date | null;
  end: Date | null;
  stadium: string;
  city: string;
  location: string;
  home: TeamSlot;
  away: TeamSlot;
  summary: string;
}

export interface ParsedCalendar {
  calendarName: string;
  matches: Match[];
  year: number | null;
}

// A raw score entry as stored: values can be strings (from inputs),
// numbers, null, or undefined.
export type ScoreValue = string | number | null | undefined;

export interface ScoreEntry {
  home?: ScoreValue;
  away?: ScoreValue;
  homePen?: ScoreValue;
  awayPen?: ScoreValue;
}

export type ScoreMap = Record<string, ScoreEntry>;

// A fully-parsed numeric score.
export interface Score {
  home: number;
  away: number;
  homePen: number | null;
  awayPen: number | null;
}

export interface ThirdCandidate {
  group: string;
  name: string;
  flag: string;
}

export interface ResolvedSide {
  name: string;
  flag: string;
  label: string;
  decided: boolean;
  /** True when this side is a current-standings projection, not yet locked. */
  provisional?: boolean;
  /** The slot descriptor (e.g. "Winner Group A") for a provisional group slot. */
  slotLabel?: string;
  /** For third-place slots in projected mode: current 3rd-placed candidates. */
  candidates?: ThirdCandidate[];
}

export interface ResolvedMatch extends Match {
  resolvedHome: ResolvedSide;
  resolvedAway: ResolvedSide;
  score: Score | null;
}

export interface TeamStanding {
  name: string;
  flag: string;
  played: number;
  win: number;
  draw: number;
  loss: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

export interface QualifiedThird extends TeamStanding {
  group: string;
}

export interface GroupTable {
  table: TeamStanding[];
  allPlayed: boolean;
}

export interface Tournament {
  groups: Record<string, GroupTable>;
  groupLetters: string[];
  resolved: ResolvedMatch[];
  qualifiedThirds: QualifiedThird[];
  allGroupsDecided: boolean;
}

export type Side = 'home' | 'away';
