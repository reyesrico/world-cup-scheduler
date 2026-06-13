import { useState } from 'react';
import { formatDateTime } from '../utils/format';
import type { ResolvedMatch, ResolvedSide } from '../types';

const ROUNDS = [
  { key: 'Round of 32', label: 'Round of 32', short: 'R32' },
  { key: 'Round of 16', label: 'Round of 16', short: 'R16' },
  { key: 'Quarterfinal', label: 'Quarterfinals', short: 'QF' },
  { key: 'Semifinal', label: 'Semifinals', short: 'SF' },
  { key: 'Final', label: 'Final', short: 'Final' },
];

const THIRD_PLACE = { key: 'Third Place', label: 'Third Place', short: '3rd' };

interface BracketTeamProps {
  team: ResolvedSide | undefined;
  score: number | null | undefined;
  isWinner: boolean;
}

function BracketTeam({ team, score, isWinner }: BracketTeamProps) {
  return (
    <div className={`bracket-team ${isWinner ? 'winner' : ''}`}>
      <span className={`bteam-flag ${team?.decided ? '' : 'placeholder'}`}>
        {team?.flag || '⚽'}
      </span>
      <span className={`bteam-name ${team?.decided ? '' : 'placeholder'}`}>
        {team?.label || 'TBD'}
      </span>
      <span className="bteam-score">{score == null ? '' : score}</span>
    </div>
  );
}

interface BracketMatchProps {
  match: ResolvedMatch;
  timeZone: string;
}

function BracketMatch({ match, timeZone }: BracketMatchProps) {
  const sc = match.score;
  let homeWin = false;
  let awayWin = false;
  if (sc) {
    if (sc.home > sc.away) homeWin = true;
    else if (sc.away > sc.home) awayWin = true;
    else if (sc.homePen != null && sc.awayPen != null) {
      homeWin = sc.homePen > sc.awayPen;
      awayWin = sc.awayPen > sc.homePen;
    }
  }
  const { date, time } = formatDateTime(match.start, timeZone);
  const pens =
    sc && sc.home === sc.away && sc.homePen != null && sc.awayPen != null
      ? ` (${sc.homePen}-${sc.awayPen} pens)`
      : '';

  return (
    <div className="bracket-match">
      <div className="bracket-match-date">
        {date} · {time}
        {pens}
      </div>
      <BracketTeam team={match.resolvedHome} score={sc?.home} isWinner={homeWin} />
      <BracketTeam team={match.resolvedAway} score={sc?.away} isWinner={awayWin} />
    </div>
  );
}

interface BracketViewProps {
  matches: ResolvedMatch[];
  timeZone: string;
  activeStage: string;
}

export default function BracketView({ matches, timeZone, activeStage }: BracketViewProps) {
  const thirdPlace = matches.find((m) => m.stage === 'Third Place');

  // Rounds that actually exist in this calendar, plus the third-place play-off.
  const navRounds = [
    ...ROUNDS.filter((r) => matches.some((m) => m.stage === r.key)),
    ...(thirdPlace ? [THIRD_PLACE] : []),
  ];

  // On phones the bracket shows one round at a time via a selector. Default to
  // the round currently in play; snap forward as stages complete (adjusting
  // state during render is the React-recommended pattern).
  const initialRound =
    navRounds.find((r) => r.key === activeStage)?.key ?? navRounds[0]?.key ?? 'Round of 32';
  const [selectedRound, setSelectedRound] = useState(initialRound);
  const [prevActiveStage, setPrevActiveStage] = useState(activeStage);
  if (activeStage !== prevActiveStage) {
    setPrevActiveStage(activeStage);
    if (navRounds.some((r) => r.key === activeStage)) setSelectedRound(activeStage);
  }

  return (
    <div className="bracket-wrap">
      {/* Mobile-only round selector */}
      <div className="bracket-rounds-nav" role="tablist" aria-label="Bracket round">
        {navRounds.map((r) => {
          const isNow = r.key === activeStage;
          return (
            <button
              key={r.key}
              role="tab"
              aria-selected={selectedRound === r.key}
              className={`bracket-round-chip ${selectedRound === r.key ? 'active' : ''} ${
                isNow ? 'now' : ''
              }`}
              onClick={() => setSelectedRound(r.key)}
            >
              {r.short}
              {isNow && <span className="now-dot" aria-label="now playing" />}
            </button>
          );
        })}
      </div>

      <div className="bracket">
        {ROUNDS.map((round) => {
          const rms = matches
            .filter((m) => m.stage === round.key)
            .sort((a, b) => a.id - b.id);
          if (rms.length === 0) return null;
          const isActive = round.key === activeStage;
          const isSelected = round.key === selectedRound;
          return (
            <div
              key={round.key}
              className={`bracket-col col-${round.key.replace(/\s+/g, '')} ${
                isActive ? 'active' : ''
              } ${isSelected ? 'is-selected' : ''}`}
            >
              <h4 className="bracket-col-title">
                {round.label}
                {isActive && <span className="now-badge">Now</span>}
              </h4>
              <div className="bracket-col-matches">
                {rms.map((m) => (
                  <BracketMatch key={m.id} match={m} timeZone={timeZone} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {thirdPlace && (
        <div
          className={`third-place-box ${
            selectedRound === THIRD_PLACE.key ? 'is-selected' : ''
          }`}
        >
          <h4 className="bracket-col-title">Third Place Play-off</h4>
          <BracketMatch match={thirdPlace} timeZone={timeZone} />
        </div>
      )}
    </div>
  );
}
