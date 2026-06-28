// Computes group standings and resolves knockout-bracket placeholders
// (Winner Group X, Runner-up Group X, 3rd Group A/B/C..., Winner/Loser Match N)
// from the scores the user has entered.

import type {
  GroupTable,
  Match,
  QualifiedThird,
  ResolvedMatch,
  ResolvedSide,
  Score,
  ScoreEntry,
  ScoreMap,
  Side,
  TeamStanding,
  ThirdCandidate,
  Tournament,
} from '../types';
import {
  THIRD_PLACE_ALLOCATION,
  THIRD_PLACE_WINNER_ORDER,
} from '../data/thirdPlaceAllocation';

// Linear stage progression used to decide which stage is "current".
const PROGRESSION = [
  'Group Stage',
  'Round of 32',
  'Round of 16',
  'Quarterfinal',
  'Semifinal',
  'Final',
];

// True when a resolved match has a decided result.
export function isMatchComplete(m: ResolvedMatch): boolean {
  const sc = m.score;
  if (!sc) return false;
  if (m.stage === 'Group Stage') return true;
  if (sc.home !== sc.away) return true;
  return sc.homePen != null && sc.awayPen != null && sc.homePen !== sc.awayPen;
}

// Returns the first stage that still has undecided matches (the stage in play).
// If every stage is complete, returns 'Final'.
export function getActiveStage(resolved: ResolvedMatch[]): string {
  for (const stage of PROGRESSION) {
    const ms = resolved.filter((m) => m.stage === stage);
    if (ms.length === 0) continue;
    if (!ms.every(isMatchComplete)) return stage;
  }
  return 'Final';
}

function hasScore(entry: ScoreEntry | undefined): boolean {
  return (
    !!entry &&
    entry.home !== '' &&
    entry.away !== '' &&
    entry.home != null &&
    entry.away != null &&
    !Number.isNaN(Number(entry.home)) &&
    !Number.isNaN(Number(entry.away))
  );
}

function getScore(scores: ScoreMap, id: number): Score | null {
  const entry = scores[id];
  if (!hasScore(entry)) return null;
  return {
    home: Number(entry.home),
    away: Number(entry.away),
    homePen: entry.homePen === '' || entry.homePen == null ? null : Number(entry.homePen),
    awayPen: entry.awayPen === '' || entry.awayPen == null ? null : Number(entry.awayPen),
  };
}

// Builds name -> flag registry from group-stage matches (real teams only).
function buildFlagRegistry(matches: Match[]): Record<string, string> {
  const reg: Record<string, string> = {};
  for (const m of matches) {
    for (const side of [m.home, m.away]) {
      if (side.kind === 'team' && side.flag && side.name) reg[side.name] = side.flag;
    }
  }
  return reg;
}

// Computes a standings table for one group.
function computeGroupTable(groupMatches: Match[], scores: ScoreMap): GroupTable {
  const teams: Record<string, TeamStanding> = {};
  const ensure = (name: string, flag?: string): TeamStanding => {
    if (!teams[name])
      teams[name] = {
        name,
        flag: flag || '',
        played: 0,
        win: 0,
        draw: 0,
        loss: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        points: 0,
      };
    return teams[name];
  };

  let allPlayed = groupMatches.length > 0;

  for (const m of groupMatches) {
    if (m.home.kind !== 'team' || m.away.kind !== 'team') continue;
    const home = ensure(m.home.name ?? '', m.home.flag);
    const away = ensure(m.away.name ?? '', m.away.flag);
    const sc = getScore(scores, m.id);
    if (!sc) {
      allPlayed = false;
      continue;
    }
    home.played++;
    away.played++;
    home.gf += sc.home;
    home.ga += sc.away;
    away.gf += sc.away;
    away.ga += sc.home;
    if (sc.home > sc.away) {
      home.win++;
      away.loss++;
      home.points += 3;
    } else if (sc.home < sc.away) {
      away.win++;
      home.loss++;
      away.points += 3;
    } else {
      home.draw++;
      away.draw++;
      home.points += 1;
      away.points += 1;
    }
  }

  const table = Object.values(teams).map((t) => ({ ...t, gd: t.gf - t.ga }));
  table.sort(sortTeams);
  return { table, allPlayed };
}

function sortTeams(a: TeamStanding, b: TeamStanding): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.gd !== a.gd) return b.gd - a.gd;
  if (b.gf !== a.gf) return b.gf - a.gf;
  return a.name.localeCompare(b.name);
}

interface ThirdSlot {
  matchId: number;
  side: Side;
  groups: string[];
  /** Group letter of the winner facing this third-place team (opposite side). */
  winnerGroup?: string;
}

// Official FIFA allocation: looks up the predetermined Annex C table (495
// combinations) keyed by the set of eight qualifying third-place groups, and
// assigns each third to the winner-group slot the table dictates. Returns null
// if the combination is missing (caller falls back to a valid matching).
function assignThirdsOfficial(
  slots: ThirdSlot[],
  thirds: QualifiedThird[]
): Record<string, QualifiedThird> | null {
  const key = thirds
    .map((t) => t.group)
    .sort()
    .join('');
  const value = THIRD_PLACE_ALLOCATION[key];
  if (!value || value.length !== THIRD_PLACE_WINNER_ORDER.length) return null;

  // winnerGroup -> the third-place group that plays that winner.
  const winnerToThirdGroup: Record<string, string> = {};
  THIRD_PLACE_WINNER_ORDER.forEach((winnerGroup, i) => {
    winnerToThirdGroup[winnerGroup] = value[i];
  });

  const thirdByGroup: Record<string, QualifiedThird> = {};
  for (const t of thirds) thirdByGroup[t.group] = t;

  const result: Record<string, QualifiedThird> = {};
  for (const slot of slots) {
    if (!slot.winnerGroup) return null;
    const thirdGroup = winnerToThirdGroup[slot.winnerGroup];
    const team = thirdGroup ? thirdByGroup[thirdGroup] : undefined;
    if (!team) return null;
    result[`${slot.matchId}:${slot.side}`] = team;
  }
  return result;
}

// Greedy/backtracking assignment of qualified third-placed teams to the
// R32 slots that accept them (each slot lists the groups it may draw from).
// Used only as a fallback when the official combination is unavailable.
function assignThirds(
  slots: ThirdSlot[],
  thirds: QualifiedThird[]
): Record<string, QualifiedThird> {
  const result: Record<string, QualifiedThird> = {};
  const used = new Set<string>();

  // Order slots by how constrained they are (fewest eligible options first).
  const eligible = (slot: ThirdSlot) =>
    thirds.filter((t) => slot.groups.includes(t.group) && !used.has(t.name));

  function backtrack(remaining: ThirdSlot[]): boolean {
    if (remaining.length === 0) return true;
    // Pick the most constrained slot.
    remaining.sort((s1, s2) => eligible(s1).length - eligible(s2).length);
    const [slot, ...rest] = remaining;
    const options = eligible(slot);
    for (const t of options) {
      used.add(t.name);
      result[`${slot.matchId}:${slot.side}`] = t;
      if (backtrack(rest)) return true;
      used.delete(t.name);
      delete result[`${slot.matchId}:${slot.side}`];
    }
    return false;
  }

  backtrack([...slots]);
  return result;
}

export function buildTournament(
  matches: Match[],
  scores: ScoreMap,
  opts: { projected?: boolean } = {}
): Tournament {
  const projected = opts.projected ?? false;
  const flagReg = buildFlagRegistry(matches);

  // --- Group tables ---
  const groupLetters = [
    ...new Set(matches.filter((m) => m.group).map((m) => m.group)),
  ].sort();
  const groups: Record<string, GroupTable> = {};
  for (const g of groupLetters) {
    const gm = matches.filter((m) => m.group === g);
    groups[g] = computeGroupTable(gm, scores);
  }

  const allGroupsDecided = groupLetters.every((g) => groups[g].allPlayed);

  // --- Best third-placed teams (only meaningful once all groups decided) ---
  let qualifiedThirds: QualifiedThird[] = [];
  if (allGroupsDecided) {
    const thirds: QualifiedThird[] = [];
    for (const g of groupLetters) {
      const t = groups[g].table[2];
      if (t) thirds.push({ ...t, group: g });
    }
    thirds.sort(sortTeams);
    qualifiedThirds = thirds.slice(0, 8);
  }

  // --- Resolve every match's two sides ---
  // resolveSide returns { name, flag, label, decided }
  const memo: Record<string, ResolvedSide> = {};
  const visiting = new Set<number>(); // guards against cyclic / self references in data

  function matchOutcome(
    matchId: number
  ): { winner: ResolvedSide; loser: ResolvedSide } | null {
    if (visiting.has(matchId)) return null;
    const m = matches.find((x) => x.id === matchId);
    if (!m) return null;
    visiting.add(matchId);
    const home = resolveSide(m, 'home');
    const away = resolveSide(m, 'away');
    visiting.delete(matchId);
    if (!home.decided || !away.decided) return null;
    const sc = getScore(scores, matchId);
    if (!sc) return null;
    let winner: ResolvedSide;
    let loser: ResolvedSide;
    if (sc.home > sc.away) {
      winner = home;
      loser = away;
    } else if (sc.home < sc.away) {
      winner = away;
      loser = home;
    } else {
      // Draw -> need penalties to decide.
      if (sc.homePen == null || sc.awayPen == null || sc.homePen === sc.awayPen)
        return null;
      if (sc.homePen > sc.awayPen) {
        winner = home;
        loser = away;
      } else {
        winner = away;
        loser = home;
      }
    }
    // If either side is a current-standings projection, the outcome is too.
    if (home.provisional || away.provisional) {
      winner = { ...winner, provisional: true };
      loser = { ...loser, provisional: true };
    }
    return { winner, loser };
  }

  function resolveSide(match: Match, side: Side): ResolvedSide {
    const cacheKey = `${match.id}:${side}`;
    if (memo[cacheKey]) return memo[cacheKey];

    const slot = match[side];
    let res: ResolvedSide;

    if (slot.kind === 'team') {
      const name = slot.name ?? slot.label;
      res = { name, flag: slot.flag, label: name, decided: true };
    } else if (slot.kind === 'winnerGroup' || slot.kind === 'runnerGroup') {
      const g = slot.group ? groups[slot.group] : undefined;
      const idx = slot.kind === 'winnerGroup' ? 0 : 1;
      if (g && g.allPlayed && g.table[idx]) {
        const t = g.table[idx];
        res = { name: t.name, flag: t.flag || flagReg[t.name] || '', label: t.name, decided: true };
      } else if (projected && g && g.table[idx]) {
        // Provisional: the team currently in this position, even mid-group.
        const t = g.table[idx];
        res = {
          name: t.name,
          flag: t.flag || flagReg[t.name] || '',
          label: t.name,
          decided: true,
          provisional: true,
          slotLabel: slot.label,
        };
      } else {
        res = { name: slot.label, flag: slot.flag, label: slot.label, decided: false };
      }
    } else if (slot.kind === 'thirdPlace') {
      if (projected) {
        // Show the current 3rd-placed team of each candidate group.
        const cands: ThirdCandidate[] = (slot.groups ?? [])
          .map((gl) => {
            const t = groups[gl]?.table[2];
            return t ? { group: gl, name: t.name, flag: t.flag || flagReg[t.name] || '' } : null;
          })
          .filter((x): x is ThirdCandidate => x !== null);
        res = {
          name: slot.label,
          flag: slot.flag,
          label: slot.label,
          decided: false,
          provisional: true,
          candidates: cands,
        };
      } else {
        res = { name: slot.label, flag: slot.flag, label: slot.label, decided: false };
      }
      // Filled later (single team) via the global thirds assignment when decided.
    } else if (slot.kind === 'winnerMatch' || slot.kind === 'loserMatch') {
      const outcome = slot.match != null ? matchOutcome(slot.match) : null;
      if (outcome) {
        const t = slot.kind === 'winnerMatch' ? outcome.winner : outcome.loser;
        res = {
          name: t.name,
          flag: t.flag || flagReg[t.name] || '',
          label: t.name,
          decided: true,
          provisional: t.provisional,
        };
      } else {
        res = { name: slot.label, flag: slot.flag, label: slot.label, decided: false };
      }
    } else {
      res = { name: slot.label || '', flag: slot.flag || '', label: slot.label || '', decided: false };
    }

    memo[cacheKey] = res;
    return res;
  }

  // Resolve all non-third sides first.
  for (const m of matches) {
    resolveSide(m, 'home');
    resolveSide(m, 'away');
  }

  // Assign thirds to their R32 slots.
  if (allGroupsDecided && qualifiedThirds.length === 8) {
    const slots: ThirdSlot[] = [];
    for (const m of matches) {
      for (const side of ['home', 'away'] as const) {
        if (m[side].kind === 'thirdPlace') {
          const otherSide: Side = side === 'home' ? 'away' : 'home';
          const opp = m[otherSide];
          slots.push({
            matchId: m.id,
            side,
            groups: m[side].groups ?? [],
            winnerGroup: opp.kind === 'winnerGroup' ? opp.group : undefined,
          });
        }
      }
    }
    // Prefer the official FIFA Annex C allocation; fall back to a valid
    // matching only if this combination isn't in the table.
    const assigned =
      assignThirdsOfficial(slots, qualifiedThirds) ??
      assignThirds(slots, qualifiedThirds);
    for (const m of matches) {
      for (const side of ['home', 'away'] as const) {
        if (m[side].kind === 'thirdPlace') {
          const t = assigned[`${m.id}:${side}`];
          if (t) {
            memo[`${m.id}:${side}`] = {
              name: t.name,
              flag: t.flag || flagReg[t.name] || '',
              label: t.name,
              decided: true,
            };
          }
        }
      }
    }
  }

  // Re-resolve match sides that depend on now-decided matches (cascade).
  // Run a few passes so winners propagate through the bracket.
  for (let pass = 0; pass < 6; pass++) {
    let changed = false;
    for (const m of matches) {
      for (const side of ['home', 'away'] as const) {
        const slot = m[side];
        if (slot.kind === 'winnerMatch' || slot.kind === 'loserMatch') {
          const prev = memo[`${m.id}:${side}`];
          if (prev && prev.decided) continue;
          const outcome = slot.match != null ? matchOutcome(slot.match) : null;
          if (outcome) {
            const t = slot.kind === 'winnerMatch' ? outcome.winner : outcome.loser;
            memo[`${m.id}:${side}`] = {
              name: t.name,
              flag: t.flag || flagReg[t.name] || '',
              label: t.name,
              decided: true,
              provisional: t.provisional,
            };
            changed = true;
          }
        }
      }
    }
    if (!changed) break;
  }

  const resolved: ResolvedMatch[] = matches.map((m) => ({
    ...m,
    resolvedHome: memo[`${m.id}:home`],
    resolvedAway: memo[`${m.id}:away`],
    score: getScore(scores, m.id),
  }));

  return { groups, groupLetters, resolved, qualifiedThirds, allGroupsDecided };
}
