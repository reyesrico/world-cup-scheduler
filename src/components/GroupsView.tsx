import { useI18n } from '../i18n';
import type { Tournament } from '../types';

interface GroupsViewProps {
  tournament: Tournament;
}

export default function GroupsView({ tournament }: GroupsViewProps) {
  const { t } = useI18n();
  const { groups, groupLetters, qualifiedThirds } = tournament;
  const qualifiedNames = new Set(qualifiedThirds.map((q) => q.name));

  return (
    <div className="groups">
      <div className="groups-grid">
        {groupLetters.map((g) => {
          const { table, allPlayed } = groups[g];
          return (
            <div key={g} className="group-card">
              <div className="group-head">
                <h3>{t('sched.groupName', { g })}</h3>
                {allPlayed ? (
                  <span className="group-status done">{t('groups.decided')}</span>
                ) : (
                  <span className="group-status">{t('groups.inProgress')}</span>
                )}
              </div>
              <table className="standings">
                <thead>
                  <tr>
                    <th className="pos">#</th>
                    <th className="team">Team</th>
                    <th>P</th>
                    <th>W</th>
                    <th>D</th>
                    <th>L</th>
                    <th>GF</th>
                    <th>GA</th>
                    <th>GD</th>
                    <th className="pts">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((t, i) => {
                    const qualifies = i < 2;
                    const isThird = i === 2 && qualifiedNames.has(t.name);
                    return (
                      <tr
                        key={t.name}
                        className={
                          qualifies ? 'qualify' : isThird ? 'third-qualify' : ''
                        }
                      >
                        <td className="pos">{i + 1}</td>
                        <td className="team">
                          <span className="team-flag">{t.flag || '⚽'}</span>
                          <span className="team-label" title={t.name}>{t.name}</span>
                        </td>
                        <td>{t.played}</td>
                        <td>{t.win}</td>
                        <td>{t.draw}</td>
                        <td>{t.loss}</td>
                        <td>{t.gf}</td>
                        <td>{t.ga}</td>
                        <td>{t.gd > 0 ? `+${t.gd}` : t.gd}</td>
                        <td className="pts">{t.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      <div className="legend">
        <span><i className="dot qualify" /> {t('groups.advance')}</span>
        <span><i className="dot third" /> {t('groups.bestThird')}</span>
      </div>
    </div>
  );
}
