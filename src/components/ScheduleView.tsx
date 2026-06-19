import { useEffect, useMemo, useRef, useState } from 'react';
import MatchCard from './MatchCard';
import { STAGE_ORDER } from '../utils/parseIcs';
import { dateKey, formatDayHeading, todayKey, isSameDay } from '../utils/format';
import { useI18n } from '../i18n';
import type { ResolvedMatch, ScoreEntry, ScoreMap } from '../types';

interface ScheduleViewProps {
  matches: ResolvedMatch[];
  scores: ScoreMap;
  onChange: (id: number, entry: ScoreEntry) => void;
  timeZone: string;
  activeStage: string;
}

export default function ScheduleView({
  matches,
  scores,
  onChange,
  timeZone,
  activeStage,
}: ScheduleViewProps) {
  const { t, stage, locale } = useI18n();
  const [stageFilter, setStageFilter] = useState(activeStage || 'All');
  const [groupFilter, setGroupFilter] = useState('All');
  const [query, setQuery] = useState('');

  // Advance the default view as stages complete (Group Stage -> R32 -> R16 ...).
  // Snap the filter forward only when the active stage actually changes, so
  // manual browsing within a stage is preserved. Adjusting state during render
  // (the React-recommended pattern) avoids an extra effect + render pass.
  const [prevActiveStage, setPrevActiveStage] = useState(activeStage);
  if (activeStage && activeStage !== prevActiveStage) {
    setPrevActiveStage(activeStage);
    setStageFilter(activeStage);
  }

  const tKey = todayKey(timeZone);
  const hasToday = useMemo(
    () => matches.some((m) => isSameDay(m.start, timeZone, tKey)),
    [matches, timeZone, tKey]
  );

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [jumpNonce, setJumpNonce] = useState(0);
  const didAutoScroll = useRef(false);

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
    const map = new Map<string, ResolvedMatch[]>();
    for (const m of filtered) {
      const key = dateKey(m.start, timeZone);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return [...map.entries()];
  }, [filtered, timeZone]);

  // On first load, slide to today's matches if they're in view.
  useEffect(() => {
    if (didAutoScroll.current) return;
    if (!hasToday) {
      didAutoScroll.current = true;
      return;
    }
    const el = sectionRefs.current[tKey];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      didAutoScroll.current = true;
    }
  }, [byDay, hasToday, tKey]);

  // "Today" button: clear filters then scroll to today (re-triggered via nonce).
  useEffect(() => {
    if (jumpNonce === 0) return;
    const el = sectionRefs.current[tKey];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [jumpNonce, tKey]);

  const handleToday = () => {
    setStageFilter('All');
    setGroupFilter('All');
    setQuery('');
    setJumpNonce((n) => n + 1);
  };

  return (
    <div className="schedule">
      <div className="filters">
        <div className="filter-group">
          <label>{t('sched.stage')}</label>
          <div className="chips">
            <button
              className="chip today-chip"
              onClick={handleToday}
              disabled={!hasToday}
              title={hasToday ? t('sched.jumpToday') : t('sched.noToday')}
            >
              ★ {t('sched.today')}
            </button>
            {stages.map((s) => (
              <button
                key={s}
                className={`chip ${stageFilter === s ? 'active' : ''}`}
                onClick={() => setStageFilter(s)}
              >
                {s === 'All' ? t('common.all') : stage(s)}
              </button>
            ))}
          </div>
        </div>

        {stageFilter === 'Group Stage' || stageFilter === 'All' ? (
          <div className="filter-group">
            <label>{t('sched.group')}</label>
            <div className="chips">
              {groups.map((g) => (
                <button
                  key={g}
                  className={`chip ${groupFilter === g ? 'active' : ''}`}
                  onClick={() => setGroupFilter(g)}
                >
                  {g === 'All' ? t('common.all') : t('sched.groupName', { g })}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="filter-group grow">
          <label>{t('sched.search')}</label>
          <input
            className="search"
            placeholder={t('sched.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {byDay.length === 0 && <p className="empty">{t('sched.none')}</p>}

      {byDay.map(([key, dayMatches]) => {
        const isTodaySection = key === tKey;
        return (
          <section
            key={key}
            ref={(el) => {
              sectionRefs.current[key] = el;
            }}
            className={`day-section ${isTodaySection ? 'is-today' : ''}`}
          >
            <h3 className="day-heading">
              <span className="day-heading-main">
                {isTodaySection && (
                  <>
                    <span className="today-tag">{t('sched.today')}</span>
                    <button
                      type="button"
                      className="scroll-top-btn"
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      title={t('sched.scrollTop')}
                      aria-label={t('sched.scrollTop')}
                    >
                      ↑
                    </button>
                  </>
                )}
                <span className="day-date">
                  {formatDayHeading(dayMatches[0].start, timeZone, locale)}
                </span>
              </span>
              <span className="day-count">{t('sched.matches', { n: dayMatches.length })}</span>
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
        );
      })}
    </div>
  );
}
