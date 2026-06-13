// Parses a FIFA World Cup style .ics calendar into a normalized match list.
//
// Each VEVENT looks like:
//   UID:match_2026_73_Winner_Group_C_vs_Runner-up_Group_F_client@...
//   DTSTART:20260629T170000Z
//   SUMMARY:🏳 Home vs 🏳 Away
//   LOCATION:Estadio Azteca, Mexico City
//   DESCRIPTION:FIFA World Cup 2026\nStage: Round of 32\nGroup: Group A\nVenue: ...
//
// Team names in the knockout stages are placeholders such as
// "Winner Group C", "Runner-up Group F", "3rd Group A/B/C/D/F",
// "Winner Match 73", "Loser Match 101".

// Strips a leading emoji cluster (regional-indicator flags, ⚽, tag-sequence
// flags like Scotland, waving flags, etc.) and returns { flag, name }.
const EMOJI_PREFIX =
  /^(?:[\u{1F1E6}-\u{1F1FF}]{2}|\u{1F3F4}[\u{E0061}-\u{E007F}]+|[\u{2600}-\u{27BF}\u{1F000}-\u{1FAFF}][\uFE0F\u200D]?|\uFE0F)+\s*/u;

function splitFlag(raw) {
  const s = (raw || '').trim();
  const match = s.match(EMOJI_PREFIX);
  if (!match) return { flag: '', name: s };
  return { flag: match[0].trim(), name: s.slice(match[0].length).trim() };
}

// Classifies a team string into a real team or a bracket placeholder.
export function classifyTeam(rawName) {
  const { flag, name } = splitFlag(rawName);

  let m;
  if ((m = name.match(/^Winner Group ([A-L])$/i)))
    return { kind: 'winnerGroup', group: m[1].toUpperCase(), flag, label: name };
  if ((m = name.match(/^Runner-?up Group ([A-L])$/i)))
    return { kind: 'runnerGroup', group: m[1].toUpperCase(), flag, label: name };
  if ((m = name.match(/^3rd Group ([A-L/]+)$/i)))
    return {
      kind: 'thirdPlace',
      groups: m[1].toUpperCase().split('/').filter(Boolean),
      flag,
      label: name,
    };
  // "Match N" in summaries is 1-based, while the UID index is 0-based,
  // so the referenced match id is N - 1.
  if ((m = name.match(/^Winner Match (\d+)$/i)))
    return { kind: 'winnerMatch', match: Number(m[1]) - 1, flag, label: name };
  if ((m = name.match(/^Loser Match (\d+)$/i)))
    return { kind: 'loserMatch', match: Number(m[1]) - 1, flag, label: name };

  return { kind: 'team', name, flag, label: name };
}

// Parses an ICS datetime in UTC (e.g. 20260629T170000Z) into a Date.
function parseIcsDate(value) {
  const m = (value || '').match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/
  );
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m.map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi, s));
}

// Unfolds ICS line folding: continuation lines start with a space or tab.
function unfoldLines(text) {
  const rawLines = text.replace(/\r\n/g, '\n').split('\n');
  const lines = [];
  for (const line of rawLines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function getDescField(description, key) {
  // DESCRIPTION uses literal "\n" separators between fields.
  const parts = (description || '').split(/\\n|\n/);
  for (const part of parts) {
    const idx = part.indexOf(`${key}:`);
    if (idx !== -1) return part.slice(idx + key.length + 1).trim();
  }
  return '';
}

export function parseIcs(text) {
  const lines = unfoldLines(text);

  let calendarName = 'FIFA World Cup';
  const events = [];
  let current = null;

  for (const line of lines) {
    const sep = line.indexOf(':');
    if (sep === -1) continue;
    const rawKey = line.slice(0, sep);
    const key = rawKey.split(';')[0].toUpperCase();
    const value = line.slice(sep + 1);

    if (key === 'X-WR-CALNAME') calendarName = value.trim();
    if (line === 'BEGIN:VEVENT') {
      current = {};
    } else if (line === 'END:VEVENT') {
      if (current) events.push(current);
      current = null;
    } else if (current) {
      current[key] = value;
    }
  }

  const matches = events.map((ev, index) => {
    const uid = ev.UID || '';
    const idMatch = uid.match(/match_\w+?_(\d+)_/);
    const id = idMatch ? Number(idMatch[1]) : index;

    const summary = ev.SUMMARY || '';
    const [homeRaw, awayRaw] = summary.split(/\s+vs\s+/i);

    const description = ev.DESCRIPTION || '';
    const stage = getDescField(description, 'Stage') || 'Group Stage';
    const group = getDescField(description, 'Group') || '';

    const location = ev.LOCATION || '';
    const [stadium, ...cityParts] = location.split(',');

    return {
      id,
      uid,
      stage,
      group: group.replace(/^Group\s+/i, ''),
      start: parseIcsDate(ev.DTSTART),
      end: parseIcsDate(ev.DTEND),
      stadium: (stadium || '').trim(),
      city: cityParts.join(',').trim(),
      location,
      home: classifyTeam(homeRaw),
      away: classifyTeam(awayRaw),
      summary,
    };
  });

  matches.sort((a, b) => {
    const ta = a.start ? a.start.getTime() : 0;
    const tb = b.start ? b.start.getTime() : 0;
    if (ta !== tb) return ta - tb;
    return a.id - b.id;
  });

  const year = detectYear(calendarName, events, matches);

  return { calendarName, matches, year };
}

// Derives the tournament year from the calendar name, the event UIDs, or the
// match dates (in that order) so the branding adapts to any imported calendar.
function detectYear(calendarName, events, matches) {
  const fromName = (calendarName || '').match(/\b(19|20)\d{2}\b/);
  if (fromName) return Number(fromName[0]);

  for (const ev of events) {
    const m = (ev.UID || '').match(/\b(19|20)\d{2}\b/);
    if (m) return Number(m[0]);
  }

  // Most common year across match start dates.
  const counts = {};
  for (const mt of matches) {
    if (mt.start) {
      const y = mt.start.getUTCFullYear();
      counts[y] = (counts[y] || 0) + 1;
    }
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted.length ? Number(sorted[0][0]) : null;
}

export const STAGE_ORDER = [
  'Group Stage',
  'Round of 32',
  'Round of 16',
  'Quarterfinal',
  'Semifinal',
  'Third Place',
  'Final',
];

export function stageRank(stage) {
  const i = STAGE_ORDER.indexOf(stage);
  return i === -1 ? 99 : i;
}
