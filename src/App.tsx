import { useEffect, useMemo, useRef, useState } from 'react';
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
import { fetchLiveScores, type LiveScoreMap } from './utils/liveScores';
import { useI18n, LANGS } from './i18n';
import ScheduleView from './components/ScheduleView';
import GroupsView from './components/GroupsView';
import BracketView from './components/BracketView';
import ImportView from './components/ImportView';
import RefreshModal from './components/RefreshModal';
import WelcomeModal from './components/WelcomeModal';
import type { ParsedCalendar, ScoreEntry, ScoreMap, Tournament } from './types';
import './App.css';

const DEFAULT_ICS_URL = `${import.meta.env.BASE_URL}worldcup_2026_all_matches.ics`;

type Tab = 'Schedule' | 'Groups' | 'Bracket' | 'Import';
const TABS: Tab[] = ['Schedule', 'Groups', 'Bracket', 'Import'];

// First-run welcome + the user's choice about pulling real scores from the API.
const WELCOME_KEY = 'wc_welcome_v1';
const LIVE_KEY = 'wc_live_enabled_v1';

function loadWelcomeSeen(): boolean {
  try {
    return localStorage.getItem(WELCOME_KEY) === '1';
  } catch {
    return false;
  }
}

function loadLiveEnabled(): boolean {
  try {
    const v = localStorage.getItem(LIVE_KEY);
    if (v === 'true') return true;
    if (v === 'false') return false;
  } catch {
    /* ignore */
  }
  // Default on for anyone who used the app before the welcome existed.
  return true;
}

// Turns a real (numeric) live score into the string-based ScoreEntry the rest
// of the app uses, so a refreshed game looks exactly like a hand-typed one.
function liveToEntry(v: LiveScoreMap[number]): ScoreEntry {
  return {
    home: String(v.home),
    away: String(v.away),
    homePen: v.homePen == null ? '' : String(v.homePen),
    awayPen: v.awayPen == null ? '' : String(v.awayPen),
  };
}

// Numeric-equality check so "2" and 2 (or ""/undefined) compare correctly.
function sameNum(a: ScoreEntry['home'], b: ScoreEntry['home']): boolean {
  const na = a === '' || a == null ? null : Number(a);
  const nb = b === '' || b == null ? null : Number(b);
  return na === nb;
}

function entriesEqual(a: ScoreEntry | undefined, b: ScoreEntry): boolean {
  return (
    !!a &&
    sameNum(a.home, b.home) &&
    sameNum(a.away, b.away) &&
    sameNum(a.homePen, b.homePen) &&
    sameNum(a.awayPen, b.awayPen)
  );
}

export default function App() {
  const { t, lang, setLang } = useI18n();
  const [icsText, setIcsText] = useState<string | null>(() => loadCustomIcs()?.text ?? null);
  const [customIcsName, setCustomIcsName] = useState<string | null>(
    () => loadCustomIcs()?.name ?? null
  );
  // savedScores = what's persisted in localStorage.
  // draftScores = the live working copy used for emulation; only committed on Save.
  const [savedScores, setSavedScores] = useState<ScoreMap>(() => loadScores());
  const [draftScores, setDraftScores] = useState<ScoreMap>(() => loadScores());
  const [tab, setTab] = useState<Tab>('Schedule');
  const [tz, setTz] = useState(() => getLocalTimeZone());
  const [loadError, setLoadError] = useState('');

  // Live (real) results pulled from the public scoreboard API.
  const [liveLoading, setLiveLoading] = useState(false);
  const [pendingLive, setPendingLive] = useState<LiveScoreMap | null>(null);
  const [toast, setToast] = useState('');
  // First-run welcome and whether the user opted in to real-score fetching.
  // Anyone who already has saved scores is treated as a returning user, so the
  // welcome only appears for genuinely first-time visitors.
  const [welcomeSeen, setWelcomeSeen] = useState<boolean>(
    () => loadWelcomeSeen() || Object.keys(loadScores()).length > 0
  );
  const [liveEnabled, setLiveEnabled] = useState<boolean>(() => loadLiveEnabled());
  // Remembers the signature of a live snapshot the user already declined, so
  // we don't keep re-prompting with the same data on every focus.
  const dismissedSig = useRef('');
  const autoChecked = useRef(false);
  const liveAbort = useRef<AbortController | null>(null);

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
      .catch(() => setLoadError('error.load'));
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
      .catch(() => setLoadError('error.reload'));
    setTab('Schedule');
  };

  const handleResetScores = () => {
    if (window.confirm(t('import.confirmClear'))) {
      clearScores();
      setSavedScores({});
      setDraftScores({});
    }
  };

  // Pulls real results and, if any differ from the current draft, opens the
  // confirmation modal. `auto` calls stay quiet (no toast, no re-prompt for an
  // already-declined snapshot); a manual click always gives feedback.
  const checkLive = async (auto: boolean) => {
    if (!tournament || liveLoading || !liveEnabled) return;
    liveAbort.current?.abort();
    const ctrl = new AbortController();
    liveAbort.current = ctrl;
    setLiveLoading(true);
    try {
      const live = await fetchLiveScores(tournament.resolved, ctrl.signal);
      const diff: LiveScoreMap = {};
      for (const [id, value] of Object.entries(live)) {
        const entry = liveToEntry(value);
        if (!entriesEqual(draftScores[Number(id)], entry)) diff[Number(id)] = value;
      }
      const count = Object.keys(diff).length;
      if (count === 0) {
        if (!auto) setToast(t('refresh.none'));
        return;
      }
      const sig = JSON.stringify(diff);
      if (auto && sig === dismissedSig.current) return;
      setPendingLive(diff);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      if (!auto) setToast(t('refresh.error'));
    } finally {
      if (liveAbort.current === ctrl) liveAbort.current = null;
      setLiveLoading(false);
    }
  };

  const applyLive = () => {
    const live = pendingLive;
    if (!live) return;
    setDraftScores((prev) => {
      const next = { ...prev };
      for (const [id, value] of Object.entries(live)) next[id] = liveToEntry(value);
      return next;
    });
    dismissedSig.current = JSON.stringify(live);
    setToast(t('refresh.applied', { n: Object.keys(live).length }));
    setPendingLive(null);
  };

  const keepMine = () => {
    if (pendingLive) dismissedSig.current = JSON.stringify(pendingLive);
    setPendingLive(null);
  };

  // First-run welcome: store the language (already saved live) plus the
  // real-score opt-in. When opted out we never call the live API.
  const finishWelcome = (useLiveData: boolean) => {
    // Persist the (possibly pre-selected) language so it sticks for next time.
    setLang(lang);
    setLiveEnabled(useLiveData);
    try {
      localStorage.setItem(LIVE_KEY, String(useLiveData));
      localStorage.setItem(WELCOME_KEY, '1');
    } catch {
      /* ignore */
    }
    setWelcomeSeen(true);
  };

  // Auto-check once the schedule is ready, then again whenever the tab regains
  // focus (people leave it open during matches). Manual refresh button too.
  // Only runs after the welcome is dismissed and the user opted in.
  const tournamentReady = !!tournament;
  useEffect(() => {
    if (!tournamentReady || autoChecked.current || !liveEnabled || !welcomeSeen) return;
    autoChecked.current = true;
    void checkLive(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentReady, liveEnabled, welcomeSeen]);

  useEffect(() => {
    if (!liveEnabled || !welcomeSeen) return undefined;
    const onFocus = () => void checkLive(true);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentReady, draftScores, liveEnabled, welcomeSeen]);

  // Auto-dismiss the little status toast.
  useEffect(() => {
    if (!toast) return undefined;
    const id = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const draftCount = Object.keys(draftScores).length;
  const brandMark = parsed?.year ? String(parsed.year).slice(-2) : '⚽';

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">{brandMark}</span>
          <div className="brand-text">
            <h1>{parsed?.calendarName || t('brand.fallback')}</h1>
            <p>{t('subtitle')}</p>
          </div>
        </div>

        <div className="topbar-right">
          <div className="lang-toggle" role="group" aria-label={t('lang.label')}>
            {LANGS.map((l) => (
              <button
                key={l.code}
                className={lang === l.code ? 'active' : ''}
                onClick={() => setLang(l.code)}
                title={l.name}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="tz-toggle">
            <button
              className={tz === 'UTC' ? 'active' : ''}
              onClick={() => setTz('UTC')}
            >
              {t('tz.utc')}
            </button>
            <button
              className={tz === localTz ? 'active' : ''}
              onClick={() => setTz(localTz)}
              title={localTz}
            >
              {t('tz.local')}
            </button>
          </div>
          <button
            className="btn-refresh"
            onClick={() => void checkLive(false)}
            disabled={liveLoading || !tournament}
            title={t('refresh.button')}
            hidden={!liveEnabled}
          >
            <span className={`refresh-icon ${liveLoading ? 'spin' : ''}`}>↻</span>
            {liveLoading ? t('refresh.checking') : t('refresh.button')}
          </button>
          <div className="save-controls">
            {hasUnsavedChanges ? (
              <>
                <button className="btn-revert" onClick={handleRevert} title={t('save.revertTitle')}>
                  {t('save.revert')}
                </button>
                <button className="btn-save" onClick={handleSave}>
                  <span className="save-dot" />
                  {t('save.save')}
                </button>
              </>
            ) : (
              <div className="saved-pill" title={t('save.savedTitle')}>
                {t('save.saved', { n: draftCount })}
              </div>
            )}
          </div>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((tabKey) => (
          <button
            key={tabKey}
            className={`tab ${tab === tabKey ? 'active' : ''}`}
            onClick={() => setTab(tabKey)}
          >
            {t(`tab.${tabKey}`)}
          </button>
        ))}
      </nav>

      <main className="content">
        {loadError && <p className="error-msg banner">{t(loadError)}</p>}
        {!tournament && !loadError && <p className="empty">{t('common.loading')}</p>}

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
            calendarName={parsed?.calendarName || t('brand.fallback')}
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
          {tz === 'UTC' ? t('footer.times.utc') : t('footer.times.local', { tz: localTz })}
          {hasUnsavedChanges ? t('footer.unsaved') : t('footer.saved')}
        </span>
      </footer>

      {hasUnsavedChanges && (
        <div className="save-fab" role="region" aria-label={t('save.unsavedBadge')}>
          <span className="save-fab-label">{t('save.unsavedBadge')}</span>
          <button className="btn-revert" onClick={handleRevert} title={t('save.revertTitle')}>
            {t('save.revert')}
          </button>
          <button className="btn-save" onClick={handleSave}>
            <span className="save-dot" />
            {t('save.save')}
          </button>
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}

      {pendingLive && (
        <RefreshModal
          count={Object.keys(pendingLive).length}
          onUse={applyLive}
          onKeep={keepMine}
        />
      )}

      {!welcomeSeen && (
        <WelcomeModal lang={lang} setLang={setLang} onFinish={finishWelcome} />
      )}
    </div>
  );
}
