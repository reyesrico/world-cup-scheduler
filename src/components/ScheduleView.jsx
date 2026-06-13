import { useEffect, useMemo, useState } from 'react';
import MatchCard from './MatchCard';
import { STAGE_ORDER } from '../utils/parseIcs';
import { dateKey, formatDayHeading } from '../utils/format';

export default function ScheduleView({
  matches,
  scores,
  onChange,
  timeZone,
  activeStage,
}) {
  const [stageFilter, setStageFilter] = useState(activeStage || 'All');
  const [groupFilter, setGroupFilter] = useState('All');
  const [query, setQuery] = useState('');

  // Advance the default view as stages complete (Group Stage -> R32 -> R16 ...).
  // Snaps only when the active stage actually changes, so manual browsing within
  // a stage is preserved.
  useEffect(() => {
    if (activeStage) setStageFilter(activeStage);
  }, [activeStage]);

  const stages = useMemo(
    () => ['All', ...STAGE_ORDER.filter((s) => matches.some((m) => m.stage === s))],
    [matches]
  );

  const groups = useMemo(
    () => ['All', ...[...new Set(matches.filter((m) => m.group).map((m) => m.group))].sort()],
    [matches]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return matches.filter((m) => {
      if (stageFilter !== 'All' && m.stage !== stageFilter) return false;
      if (groupFilter !== 'All' && m.group !== groupFilter) return false;
      if (q) {
        const hay = `${m.resolvedHome?.label} ${m.resolvedAway?.label} ${m.stadium} ${m.city}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [matches, stageFilter, groupFilter, query]);

  const byDay = useMemo(() => {
    const map = new Map();
    for (const m of filtered) {
      const key = dateKey(m.start, timeZone);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(m);
    }
    return [...map.entries()];
  }, [filtered, timeZone]);

  return (
    <div className="schedule">
      <div className="filters">
        <div className="filter-group">
          <label>Stage</label>
          <div className="chips">
            {stages.map((s) => (
              <button
                key={s}
                className={`chip ${stageFilter === s ? 'active' : ''}`}
                onClick={() => setStageFilter(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {stageFilter === 'Group Stage' || stageFilter === 'All' ? (
          <div className="filter-group">
            <label>Group</label>
            <div className="chips">
              {groups.map((g) => (
                <button
                  key={g}
                  className={`chip ${groupFilter === g ? 'active' : ''}`}
                  onClick={() => setGroupFilter(g)}
                >
                  {g === 'All' ? 'All' : `Group ${g}`}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="filter-group grow">
          <label>Search</label>
          <input
            className="search"
            placeholder="Team, stadium or city…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {byDay.length === 0 && <p className="empty">No matches match these filters.</p>}

      {byDay.map(([key, dayMatches]) => (
        <section key={key} className="day-section">
          <h3 className="day-heading">
            {formatDayHeading(dayMatches[0].start, timeZone)}
            <span className="day-count">{dayMatches.length} matches</span>
          </h3>
          <div className="match-grid">
            {dayMatches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                scoreEntry={scores[m.id]}
                onChange={onChange}
                timeZone={timeZone}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
