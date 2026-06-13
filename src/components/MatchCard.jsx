import { formatDateTime } from '../utils/format';

const STAGE_BADGE = {
  'Group Stage': 'group',
  'Round of 32': 'r32',
  'Round of 16': 'r16',
  Quarterfinal: 'qf',
  Semifinal: 'sf',
  'Third Place': 'tp',
  Final: 'final',
};

function TeamRow({ team, score, isWinner, onScoreChange, scoreName }) {
  const decided = team?.decided;
  return (
    <div className={`team-row ${isWinner ? 'winner' : ''}`}>
      <span className={`team-flag ${decided ? '' : 'placeholder'}`}>
        {team?.flag || '⚽'}
      </span>
      <span className={`team-name ${decided ? '' : 'placeholder'}`}>
        {team?.label || 'TBD'}
      </span>
      <input
        className="score-input"
        type="number"
        min="0"
        inputMode="numeric"
        aria-label={scoreName}
        value={score}
        onChange={(e) => onScoreChange(e.target.value)}
      />
    </div>
  );
}

export default function MatchCard({ match, scoreEntry, onChange, timeZone }) {
  const { time, day, date } = formatDateTime(match.start, timeZone);
  const badge = STAGE_BADGE[match.stage] || 'group';

  const home = match.resolvedHome;
  const away = match.resolvedAway;
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

  const isDraw = sc && sc.home === sc.away;
  const isKnockout = match.stage !== 'Group Stage';

  const update = (field, value) => {
    onChange(match.id, { ...scoreEntry, [field]: value });
  };

  return (
    <div className="match-card">
      <div className="match-meta">
        <span className={`stage-badge ${badge}`}>
          {match.group ? `Group ${match.group}` : match.stage}
        </span>
        <span className="match-num">#{match.id + 1}</span>
      </div>

      <div className="match-teams">
        <TeamRow
          team={home}
          score={scoreEntry?.home ?? ''}
          isWinner={homeWin}
          scoreName={`${home?.label || 'home'} score`}
          onScoreChange={(v) => update('home', v)}
        />
        <TeamRow
          team={away}
          score={scoreEntry?.away ?? ''}
          isWinner={awayWin}
          scoreName={`${away?.label || 'away'} score`}
          onScoreChange={(v) => update('away', v)}
        />
      </div>

      {isKnockout && isDraw && (
        <div className="pens">
          <span className="pens-label">Penalties</span>
          <input
            className="pen-input"
            type="number"
            min="0"
            inputMode="numeric"
            aria-label="home penalties"
            value={scoreEntry?.homePen ?? ''}
            onChange={(e) => update('homePen', e.target.value)}
          />
          <span className="pens-sep">–</span>
          <input
            className="pen-input"
            type="number"
            min="0"
            inputMode="numeric"
            aria-label="away penalties"
            value={scoreEntry?.awayPen ?? ''}
            onChange={(e) => update('awayPen', e.target.value)}
          />
        </div>
      )}

      <div className="match-footer">
        <span className="match-time">
          {day}, {date} · {time}
        </span>
        <span className="match-venue">
          {match.stadium}
          {match.city ? `, ${match.city}` : ''}
        </span>
      </div>
    </div>
  );
}
