// Computes group standings and resolves knockout-bracket placeholders
// (Winner Group X, Runner-up Group X, 3rd Group A/B/C..., Winner/Loser Match N)
// from the scores the user has entered.

// A stored score entry: { home: number, away: number, homePen?: number, awayPen?: number }

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
export function isMatchComplete(m) {
  const sc = m.score;
  if (!sc) return false;
  if (m.stage === 'Group Stage') return true;
  if (sc.home !== sc.away) return true;
  return sc.homePen != null && sc.awayPen != null && sc.homePen !== sc.awayPen;
}

// Returns the first stage that still has undecided matches (the stage in play).
// If every stage is complete, returns 'Final'.
export function getActiveStage(resolved) {
  for (const stage of PROGRESSION) {
    const ms = resolved.filter((m) => m.stage === stage);
    if (ms.length === 0) continue;
    if (!ms.every(isMatchComplete)) return stage;
  }
  return 'Final';
}

function hasScore(entry) {
  return (
    entry &&
    entry.home !== '' &&
    entry.away !== '' &&
    entry.home != null &&
    entry.away != null &&
    !Number.isNaN(Number(entry.home)) &&
    !Number.isNaN(Number(entry.away))
  );
}

function getScore(scores, id) {
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
function buildFlagRegistry(matches) {
  const reg = {};
  for (const m of matches) {
    for (const side of [m.home, m.away]) {
      if (side.kind === 'team' && side.flag) reg[side.name] = side.flag;
    }
  }
  return reg;
}

// Computes a standings table for one group.
function computeGroupTable(groupMatches, scores) {
  const teams = {};
  const ensure = (name, flag) => {
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
    const home = ensure(m.home.name, m.home.flag);
    const away = ensure(m.away.name, m.away.flag);
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

function sortTeams(a, b) {
  if (b.points !== a.points) return b.points - a.points;
  if (b.gd !== a.gd) return b.gd - a.gd;
  if (b.gf !== a.gf) return b.gf - a.gf;
  return a.name.localeCompare(b.name);
}

// Greedy/backtracking assignment of qualified third-placed teams to the
// R32 slots that accept them (each slot lists the groups it may draw from).
function assignThirds(slots, thirds) {
  // slots: [{ matchId, side, groups: ['A','B',...] }]
  // thirds: [{ ...team, group }] already ranked, top 8.
  const result = {};
  const used = new Set();

  // Order slots by how constrained they are (fewest eligible options first).
  const eligible = (slot) =>
    thirds.filter((t) => slot.groups.includes(t.group) && !used.has(t.name));

  function backtrack(remaining) {
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

export function buildTournament(matches, scores) {
  const flagReg = buildFlagRegistry(matches);

  // --- Group tables ---
  const groupLetters = [...new Set(matches.filter((m) => m.group).map((m) => m.group))].sort();
  const groups = {};
  for (const g of groupLetters) {
    const gm = matches.filter((m) => m.group === g);
    groups[g] = computeGroupTable(gm, scores);
  }

  const allGroupsDecided = groupLetters.every((g) => groups[g].allPlayed);

  // --- Best third-placed teams (only meaningful once all groups decided) ---
  let qualifiedThirds = [];
  if (allGroupsDecided) {
    const thirds = groupLetters
      .map((g) => {
        const t = groups[g].table[2];
        return t ? { ...t, group: g } : null;
      })
      .filter(Boolean);
    thirds.sort(sortTeams);
    qualifiedThirds = thirds.slice(0, 8);
  }

  // --- Resolve every match's two sides ---
  // resolveSide returns { name, flag, label, decided }
  const memo = {};
  const visiting = new Set(); // guards against cyclic / self references in data

  function matchOutcome(matchId) {
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
    let winner, loser;
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
    return { winner, loser };
  }

  function resolveSide(match, side) {
    const cacheKey = `${match.id}:${side}`;
    if (memo[cacheKey]) return memo[cacheKey];

    const slot = match[side];
    let res;

    if (slot.kind === 'team') {
      res = { name: slot.name, flag: slot.flag, label: slot.name, decided: true };
    } else if (slot.kind === 'winnerGroup' || slot.kind === 'runnerGroup') {
      const g = groups[slot.group];
      const idx = slot.kind === 'winnerGroup' ? 0 : 1;
      if (g && g.allPlayed && g.table[idx]) {
        const t = g.table[idx];
        res = { name: t.name, flag: t.flag || flagReg[t.name] || '', label: t.name, decided: true };
      } else {
        res = { name: slot.label, flag: slot.flag, label: slot.label, decided: false };
      }
    } else if (slot.kind === 'thirdPlace') {
      res = { name: slot.label, flag: slot.flag, label: slot.label, decided: false };
      // Filled later via the global thirds assignment.
    } else if (slot.kind === 'winnerMatch' || slot.kind === 'loserMatch') {
      const outcome = matchOutcome(slot.match);
      if (outcome) {
        const t = slot.kind === 'winnerMatch' ? outcome.winner : outcome.loser;
        res = { name: t.name, flag: t.flag || flagReg[t.name] || '', label: t.name, decided: true };
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
    const slots = [];
    for (const m of matches) {
      for (const side of ['home', 'away']) {
        if (m[side].kind === 'thirdPlace')
          slots.push({ matchId: m.id, side, groups: m[side].groups });
      }
    }
    const assigned = assignThirds(slots, qualifiedThirds);
    for (const m of matches) {
      for (const side of ['home', 'away']) {
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
      for (const side of ['home', 'away']) {
        const slot = m[side];
        if (slot.kind === 'winnerMatch' || slot.kind === 'loserMatch') {
          const prev = memo[`${m.id}:${side}`];
          if (prev && prev.decided) continue;
          const outcome = matchOutcome(slot.match);
          if (outcome) {
            const t = slot.kind === 'winnerMatch' ? outcome.winner : outcome.loser;
            memo[`${m.id}:${side}`] = {
              name: t.name,
              flag: t.flag || flagReg[t.name] || '',
              label: t.name,
              decided: true,
            };
            changed = true;
          }
        }
      }
    }
    if (!changed) break;
  }

  const resolved = matches.map((m) => ({
    ...m,
    resolvedHome: memo[`${m.id}:home`],
    resolvedAway: memo[`${m.id}:away`],
    score: getScore(scores, m.id),
  }));

  return { groups, groupLetters, resolved, qualifiedThirds, allGroupsDecided };
}
