import { useEffect, useMemo, useState } from 'react';
import { parseIcs } from './utils/parseIcs';
import { buildTournament, getActiveStage } from './utils/standings';
import {
  loadScores,
  saveScores,
  loadCustomIcs,
  saveCustomIcs,
  clearCustomIcs,
  clearScores,
} from './utils/storage';
import { getLocalTimeZone } from './utils/format';
import ScheduleView from './components/ScheduleView';
import GroupsView from './components/GroupsView';
import BracketView from './components/BracketView';
import ImportView from './components/ImportView';
import type { ParsedCalendar, ScoreEntry, ScoreMap, Tournament } from './types';
import './App.css';

const DEFAULT_ICS_URL = `${import.meta.env.BASE_URL}worldcup_2026_all_matches.ics`;

type Tab = 'Schedule' | 'Groups' | 'Bracket' | 'Import';
const TABS: Tab[] = ['Schedule', 'Groups', 'Bracket', 'Import'];

export default function App() {
  const [icsText, setIcsText] = useState<string | null>(() => loadCustomIcs()?.text ?? null);
  const [customIcsName, setCustomIcsName] = useState<string | null>(
    () => loadCustomIcs()?.name ?? null
  );
  // savedScores = what's persisted in localStorage.
  // draftScores = the live working copy used for emulation; only committed on Save.
  const [savedScores, setSavedScores] = useState<ScoreMap>(() => loadScores());
  const [draftScores, setDraftScores] = useState<ScoreMap>(() => loadScores());
  const [tab, setTab] = useState<Tab>('Schedule');
  const [tz, setTz] = useState('UTC');
  const [loadError, setLoadError] = useState('');

  const localTz = useMemo(() => getLocalTimeZone(), []);

  // Fetch the bundled calendar when there's no custom one in localStorage.
  // (A custom calendar is already loaded via the lazy state initializers.)
  useEffect(() => {
    if (loadCustomIcs()) return;
    fetch(DEFAULT_ICS_URL)
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed');
        return r.text();
      })
      .then(setIcsText)
      .catch(() => setLoadError('Could not load the bundled World Cup calendar.'));
  }, []);

  const parsed = useMemo<ParsedCalendar | null>(() => {
    if (!icsText) return null;
    try {
      return parseIcs(icsText);
    } catch {
      return null;
    }
  }, [icsText]);

  // Keep the browser tab title in sync with the loaded calendar.
  useEffect(() => {
    if (parsed?.calendarName) {
      document.title = `${parsed.calendarName} · Schedule & Bracket`;
    }
  }, [parsed]);

  const tournament = useMemo<Tournament | null>(() => {
    if (!parsed) return null;
    return buildTournament(parsed.matches, draftScores);
  }, [parsed, draftScores]);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(draftScores) !== JSON.stringify(savedScores),
    [draftScores, savedScores]
  );

  // Warn before leaving with unsaved emulation changes.
  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  // The stage currently being played: the first stage that isn't fully decided.
  const activeStage = useMemo(
    () => (tournament ? getActiveStage(tournament.resolved) : 'Group Stage'),
    [tournament]
  );

  const handleScoreChange = (id: number, entry: ScoreEntry) => {
    setDraftScores((prev) => {
      const next = { ...prev };
      const cleaned: ScoreEntry = { ...entry };
      const empty =
        (cleaned.home === '' || cleaned.home == null) &&
        (cleaned.away === '' || cleaned.away == null) &&
        (cleaned.homePen === '' || cleaned.homePen == null) &&
        (cleaned.awayPen === '' || cleaned.awayPen == null);
      if (empty) delete next[id];
      else next[id] = cleaned;
      return next;
    });
  };

  const handleSave = () => {
    saveScores(draftScores);
    setSavedScores(draftScores);
  };

  const handleRevert = () => {
    setDraftScores(savedScores);
  };

  const handleImport = (text: string, name: string) => {
    saveCustomIcs(text, name);
    setIcsText(text);
    setCustomIcsName(name);
    setTab('Schedule');
  };

  const handleResetCalendar = () => {
    clearCustomIcs();
    setCustomIcsName(null);
    fetch(DEFAULT_ICS_URL)
      .then((r) => r.text())
      .then(setIcsText)
      .catch(() => setLoadError('Could not reload the bundled calendar.'));
    setTab('Schedule');
  };

  const handleResetScores = () => {
    if (window.confirm('Clear all entered scores? This cannot be undone.')) {
      clearScores();
      setSavedScores({});
      setDraftScores({});
    }
  };

  const draftCount = Object.keys(draftScores).length;
  const brandMark = parsed?.year ? String(parsed.year).slice(-2) : '⚽';

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">{brandMark}</span>
          <div className="brand-text">
            <h1>{parsed?.calendarName || 'FIFA World Cup'}</h1>
            <p>Predict the bracket · fill in scores · watch it unfold</p>
          </div>
        </div>

        <div className="topbar-right">
          <div className="tz-toggle">
            <button
              className={tz === 'UTC' ? 'active' : ''}
              onClick={() => setTz('UTC')}
            >
              UTC
            </button>
            <button
              className={tz === localTz ? 'active' : ''}
              onClick={() => setTz(localTz)}
              title={localTz}
            >
              Local
            </button>
          </div>
          <div className="save-controls">
            {hasUnsavedChanges ? (
              <>
                <button className="btn-revert" onClick={handleRevert} title="Discard unsaved changes">
                  Revert
                </button>
                <button className="btn-save" onClick={handleSave}>
                  <span className="save-dot" />
                  Save scores
                </button>
              </>
            ) : (
              <div
                className="saved-pill"
                title="Your saved predictions are stored in this browser"
              >
                {draftCount} saved
              </div>
            )}
          </div>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={`tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>

      <main className="content">
        {loadError && <p className="error-msg banner">{loadError}</p>}
        {!tournament && !loadError && <p className="empty">Loading schedule…</p>}

        {tournament && tab === 'Schedule' && (
          <ScheduleView
            matches={tournament.resolved}
            scores={draftScores}
            onChange={handleScoreChange}
            timeZone={tz}
            activeStage={activeStage}
          />
        )}

        {tournament && tab === 'Groups' && <GroupsView tournament={tournament} />}

        {tournament && tab === 'Bracket' && (
          <BracketView
            matches={tournament.resolved}
            timeZone={tz}
            activeStage={activeStage}
          />
        )}

        {tab === 'Import' && (
          <ImportView
            calendarName={parsed?.calendarName || 'FIFA World Cup'}
            customIcsName={customIcsName}
            matchCount={parsed?.matches.length || 0}
            onImport={handleImport}
            onResetCalendar={handleResetCalendar}
            onResetScores={handleResetScores}
          />
        )}
      </main>

      <footer className="footer">
        <span>
          Times shown in {tz === 'UTC' ? 'UTC' : `local time (${localTz})`}.
          {hasUnsavedChanges
            ? ' You have unsaved changes — click Save scores to keep them.'
            : ' Scores are stored locally in your browser.'}
        </span>
      </footer>
    </div>
  );
}
