// Lightweight i18n: English / Spanish / Portuguese with a persisted choice.
/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Lang = 'en' | 'es' | 'pt';

export const LANGS: { code: Lang; label: string; name: string }[] = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'es', label: 'ES', name: 'Español' },
  { code: 'pt', label: 'PT', name: 'Português' },
];

const LANG_KEY = 'wc_lang_v1';

// Spanish-speaking Latin American regions (plus Spain via the generic `es`).
const LATAM_ES = new Set([
  'AR', 'BO', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'SV', 'GT', 'GQ',
  'HN', 'MX', 'NI', 'PA', 'PY', 'PE', 'PR', 'UY', 'VE',
]);

// Guess the best starting language from the browser's region / locale list:
// Brazil or Portugal → Portuguese, Latin America (or Spain) → Spanish, else English.
export function detectLang(): Lang {
  try {
    const list =
      navigator.languages && navigator.languages.length
        ? navigator.languages
        : [navigator.language || 'en'];
    for (const raw of list) {
      const loc = raw.toLowerCase();
      const lang = loc.slice(0, 2);
      const region = loc.split('-')[1]?.toUpperCase();
      if (lang === 'pt' || region === 'BR' || region === 'PT') return 'pt';
      if (lang === 'es' || (region && LATAM_ES.has(region))) return 'es';
    }
  } catch {
    /* ignore */
  }
  return 'en';
}

function loadLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === 'en' || v === 'es' || v === 'pt') return v;
  } catch {
    /* ignore */
  }
  // Nothing saved yet — fall back to a region-aware guess.
  return detectLang();
}

type Dict = Record<string, string>;

const en: Dict = {
  'subtitle': 'Predict the bracket · fill in scores · watch it unfold',
  'brand.fallback': 'FIFA World Cup',

  'tab.Schedule': 'Schedule',
  'tab.Groups': 'Groups',
  'tab.Bracket': 'Bracket',
  'tab.Import': 'Import',

  'tz.utc': 'UTC',
  'tz.local': 'Local',

  'save.revert': 'Revert',
  'save.revertTitle': 'Discard unsaved changes',
  'save.save': 'Save scores',
  'save.saved': '{n} saved',
  'save.savedTitle': 'Your saved predictions are stored in this browser',
  'save.unsavedBadge': 'Unsaved changes',

  'footer.times.utc': 'Times shown in UTC.',
  'footer.times.local': 'Times shown in local time ({tz}).',
  'footer.unsaved': ' You have unsaved changes — click Save scores to keep them.',
  'footer.saved': ' Scores are stored locally in your browser.',

  'common.loading': 'Loading schedule…',
  'common.tbd': 'TBD',
  'common.all': 'All',
  'error.load': 'Could not load the bundled World Cup calendar.',
  'error.reload': 'Could not reload the bundled calendar.',

  'sched.stage': 'Stage',
  'sched.group': 'Group',
  'sched.search': 'Search',
  'sched.searchPlaceholder': 'Team, stadium or city…',
  'sched.groupName': 'Group {g}',
  'sched.matches': '{n} matches',
  'sched.none': 'No matches match these filters.',
  'sched.today': 'Today',
  'sched.jumpToday': 'Jump to today',
  'sched.noToday': 'No matches today',

  'match.penalties': 'Penalties',

  'groups.decided': 'Decided',
  'groups.inProgress': 'In progress',
  'groups.advance': 'Advance (1st & 2nd)',
  'groups.bestThird': 'Best third place',

  'bracket.now': 'Now',
  'bracket.thirdPlayoff': 'Third Place Play-off',

  'import.title': 'Import a calendar',
  'import.desc':
    'Load any FIFA-style .ics file to build the schedule. Use this to set up a future tournament — just export the matches as an ICS and drop it here. Your entered scores are kept separately and stay in this browser.',
  'import.dropStrong': 'Drag & drop',
  'import.dropRest': 'an .ics file here',
  'import.browse': 'or click to browse',
  'import.badFile': 'Please choose a .ics calendar file.',
  'import.readErr': 'Could not read that file.',
  'import.current': 'Current calendar',
  'import.loaded': '{n} matches loaded',
  'import.custom': 'Custom: {name}',
  'import.restore': 'Restore World Cup 2026 calendar',
  'import.clearScores': 'Clear all scores',
  'import.confirmClear': 'Clear all entered scores? This cannot be undone.',

  'refresh.button': 'Real scores',
  'refresh.checking': 'Checking…',
  'refresh.title': 'Update with real results?',
  'refresh.body':
    'We found {n} real match result(s) that differ from what you have. Update those games with the official scores? Your other predictions stay untouched, and you can still edit and save anything you like.',
  'refresh.use': 'Use real data',
  'refresh.keep': 'Keep mine',
  'refresh.none': 'No new real results right now.',
  'refresh.error': 'Could not reach the live scores service.',
  'refresh.applied': 'Updated {n} game(s) with real scores.',

  'welcome.title': 'Welcome to the World Cup tracker',
  'welcome.intro':
    'Predict every match, follow the group tables and the knockout bracket, and — if you like — pull in the real results as they happen. Everything stays in this browser.',
  'welcome.langQ': 'Choose your language',
  'welcome.dataQ': 'Use real match results?',
  'welcome.dataDesc':
    'We can fetch official scores from a public feed and offer to fill in games that have already been played. You can always edit and save your own predictions instead.',
  'welcome.dataYes': 'Yes, fetch real scores',
  'welcome.dataNo': 'No, just my predictions',
  'welcome.how.title': 'How it works',
  'welcome.how.schedule': 'Schedule — tap any match to enter a score and emulate results.',
  'welcome.how.groups': 'Groups — the standings update live as you fill in scores.',
  'welcome.how.bracket': 'Bracket — the knockout rounds build from your group results.',
  'welcome.how.save': 'Save scores — your predictions live in this browser; click Save to keep them.',
  'welcome.start': 'Get started',

  'lang.label': 'Language',
};

const es: Dict = {
  'subtitle': 'Predice el cuadro · pon los marcadores · míralo desarrollarse',
  'brand.fallback': 'Copa Mundial de la FIFA',

  'tab.Schedule': 'Calendario',
  'tab.Groups': 'Grupos',
  'tab.Bracket': 'Eliminatorias',
  'tab.Import': 'Importar',

  'tz.utc': 'UTC',
  'tz.local': 'Local',

  'save.revert': 'Descartar',
  'save.revertTitle': 'Descartar cambios sin guardar',
  'save.save': 'Guardar marcadores',
  'save.saved': '{n} guardados',
  'save.savedTitle': 'Tus predicciones guardadas se almacenan en este navegador',
  'save.unsavedBadge': 'Cambios sin guardar',

  'footer.times.utc': 'Horas mostradas en UTC.',
  'footer.times.local': 'Horas en hora local ({tz}).',
  'footer.unsaved': ' Tienes cambios sin guardar — pulsa Guardar marcadores para conservarlos.',
  'footer.saved': ' Los marcadores se guardan localmente en tu navegador.',

  'common.loading': 'Cargando calendario…',
  'common.tbd': 'Por definir',
  'common.all': 'Todos',
  'error.load': 'No se pudo cargar el calendario del Mundial incluido.',
  'error.reload': 'No se pudo recargar el calendario incluido.',

  'sched.stage': 'Fase',
  'sched.group': 'Grupo',
  'sched.search': 'Buscar',
  'sched.searchPlaceholder': 'Equipo, estadio o ciudad…',
  'sched.groupName': 'Grupo {g}',
  'sched.matches': '{n} partidos',
  'sched.none': 'Ningún partido coincide con estos filtros.',
  'sched.today': 'Hoy',
  'sched.jumpToday': 'Ir a hoy',
  'sched.noToday': 'No hay partidos hoy',

  'match.penalties': 'Penales',

  'groups.decided': 'Definido',
  'groups.inProgress': 'En curso',
  'groups.advance': 'Avanzan (1º y 2º)',
  'groups.bestThird': 'Mejor tercero',

  'bracket.now': 'Ahora',
  'bracket.thirdPlayoff': 'Partido por el tercer lugar',

  'import.title': 'Importar un calendario',
  'import.desc':
    'Carga cualquier archivo .ics estilo FIFA para construir el calendario. Úsalo para preparar un torneo futuro: exporta los partidos como ICS y suéltalo aquí. Tus marcadores se guardan por separado y permanecen en este navegador.',
  'import.dropStrong': 'Arrastra y suelta',
  'import.dropRest': 'un archivo .ics aquí',
  'import.browse': 'o haz clic para explorar',
  'import.badFile': 'Elige un archivo de calendario .ics.',
  'import.readErr': 'No se pudo leer ese archivo.',
  'import.current': 'Calendario actual',
  'import.loaded': '{n} partidos cargados',
  'import.custom': 'Personalizado: {name}',
  'import.restore': 'Restaurar el calendario del Mundial 2026',
  'import.clearScores': 'Borrar todos los marcadores',
  'import.confirmClear': '¿Borrar todos los marcadores? Esto no se puede deshacer.',

  'refresh.button': 'Marcadores reales',
  'refresh.checking': 'Comprobando…',
  'refresh.title': '¿Actualizar con resultados reales?',
  'refresh.body':
    'Encontramos {n} resultado(s) real(es) que difieren de los tuyos. ¿Actualizar esos partidos con los marcadores oficiales? Tus demás predicciones no se tocan, y aún puedes editar y guardar lo que quieras.',
  'refresh.use': 'Usar datos reales',
  'refresh.keep': 'Mantener los míos',
  'refresh.none': 'No hay nuevos resultados reales por ahora.',
  'refresh.error': 'No se pudo conectar con el servicio de marcadores en vivo.',
  'refresh.applied': 'Se actualizaron {n} partido(s) con marcadores reales.',

  'welcome.title': 'Bienvenido al seguidor del Mundial',
  'welcome.intro':
    'Predice cada partido, sigue las tablas de los grupos y las eliminatorias y, si quieres, trae los resultados reales en tiempo real. Todo se queda en este navegador.',
  'welcome.langQ': 'Elige tu idioma',
  'welcome.dataQ': '¿Usar resultados reales?',
  'welcome.dataDesc':
    'Podemos obtener los marcadores oficiales de una fuente pública y ofrecerte rellenar los partidos ya jugados. Siempre puedes editar y guardar tus propias predicciones.',
  'welcome.dataYes': 'Sí, traer marcadores reales',
  'welcome.dataNo': 'No, solo mis predicciones',
  'welcome.how.title': 'Cómo funciona',
  'welcome.how.schedule': 'Calendario: toca cualquier partido para poner un marcador y emular resultados.',
  'welcome.how.groups': 'Grupos: las tablas se actualizan al instante cuando pones los marcadores.',
  'welcome.how.bracket': 'Eliminatorias: las rondas se arman con tus resultados de grupo.',
  'welcome.how.save': 'Guardar marcadores: tus predicciones viven en este navegador; pulsa Guardar para conservarlas.',
  'welcome.start': 'Empezar',

  'lang.label': 'Idioma',
};

const pt: Dict = {
  'subtitle': 'Preveja o chaveamento · preencha os placares · acompanhe tudo',
  'brand.fallback': 'Copa do Mundo da FIFA',

  'tab.Schedule': 'Calendário',
  'tab.Groups': 'Grupos',
  'tab.Bracket': 'Mata-mata',
  'tab.Import': 'Importar',

  'tz.utc': 'UTC',
  'tz.local': 'Local',

  'save.revert': 'Reverter',
  'save.revertTitle': 'Descartar alterações não salvas',
  'save.save': 'Salvar placares',
  'save.saved': '{n} salvos',
  'save.savedTitle': 'Suas previsões salvas ficam neste navegador',
  'save.unsavedBadge': 'Alterações não salvas',

  'footer.times.utc': 'Horários exibidos em UTC.',
  'footer.times.local': 'Horários no fuso local ({tz}).',
  'footer.unsaved': ' Você tem alterações não salvas — clique em Salvar placares para mantê-las.',
  'footer.saved': ' Os placares são salvos localmente no seu navegador.',

  'common.loading': 'Carregando calendário…',
  'common.tbd': 'A definir',
  'common.all': 'Todos',
  'error.load': 'Não foi possível carregar o calendário da Copa incluído.',
  'error.reload': 'Não foi possível recarregar o calendário incluído.',

  'sched.stage': 'Fase',
  'sched.group': 'Grupo',
  'sched.search': 'Buscar',
  'sched.searchPlaceholder': 'Time, estádio ou cidade…',
  'sched.groupName': 'Grupo {g}',
  'sched.matches': '{n} jogos',
  'sched.none': 'Nenhum jogo corresponde a esses filtros.',
  'sched.today': 'Hoje',
  'sched.jumpToday': 'Ir para hoje',
  'sched.noToday': 'Nenhum jogo hoje',

  'match.penalties': 'Pênaltis',

  'groups.decided': 'Definido',
  'groups.inProgress': 'Em andamento',
  'groups.advance': 'Avançam (1º e 2º)',
  'groups.bestThird': 'Melhor terceiro',

  'bracket.now': 'Agora',
  'bracket.thirdPlayoff': 'Disputa de terceiro lugar',

  'import.title': 'Importar um calendário',
  'import.desc':
    'Carregue qualquer arquivo .ics no estilo FIFA para montar o calendário. Use para preparar um torneio futuro: exporte os jogos como ICS e solte aqui. Seus placares ficam separados e permanecem neste navegador.',
  'import.dropStrong': 'Arraste e solte',
  'import.dropRest': 'um arquivo .ics aqui',
  'import.browse': 'ou clique para procurar',
  'import.badFile': 'Escolha um arquivo de calendário .ics.',
  'import.readErr': 'Não foi possível ler esse arquivo.',
  'import.current': 'Calendário atual',
  'import.loaded': '{n} jogos carregados',
  'import.custom': 'Personalizado: {name}',
  'import.restore': 'Restaurar o calendário da Copa 2026',
  'import.clearScores': 'Limpar todos os placares',
  'import.confirmClear': 'Limpar todos os placares? Isso não pode ser desfeito.',

  'refresh.button': 'Placares reais',
  'refresh.checking': 'Verificando…',
  'refresh.title': 'Atualizar com resultados reais?',
  'refresh.body':
    'Encontramos {n} resultado(s) real(is) diferentes dos seus. Atualizar esses jogos com os placares oficiais? Suas outras previsões permanecem intactas, e você ainda pode editar e salvar o que quiser.',
  'refresh.use': 'Usar dados reais',
  'refresh.keep': 'Manter os meus',
  'refresh.none': 'Nenhum resultado real novo no momento.',
  'refresh.error': 'Não foi possível acessar o serviço de placares ao vivo.',
  'refresh.applied': '{n} jogo(s) atualizado(s) com placares reais.',

  'welcome.title': 'Bem-vindo ao acompanhador da Copa',
  'welcome.intro':
    'Preveja cada jogo, acompanhe as tabelas dos grupos e o mata-mata e, se quiser, traga os resultados reais em tempo real. Tudo fica neste navegador.',
  'welcome.langQ': 'Escolha seu idioma',
  'welcome.dataQ': 'Usar resultados reais?',
  'welcome.dataDesc':
    'Podemos buscar os placares oficiais de uma fonte pública e oferecer preencher os jogos já disputados. Você sempre pode editar e salvar suas próprias previsões.',
  'welcome.dataYes': 'Sim, buscar placares reais',
  'welcome.dataNo': 'Não, só minhas previsões',
  'welcome.how.title': 'Como funciona',
  'welcome.how.schedule': 'Calendário — toque em qualquer jogo para inserir um placar e emular resultados.',
  'welcome.how.groups': 'Grupos — as tabelas se atualizam na hora conforme você preenche os placares.',
  'welcome.how.bracket': 'Mata-mata — as fases se formam a partir dos seus resultados de grupo.',
  'welcome.how.save': 'Salvar placares — suas previsões ficam neste navegador; clique em Salvar para mantê-las.',
  'welcome.start': 'Começar',

  'lang.label': 'Idioma',
};

// Stage / round names shared by Schedule, Groups and Bracket.
const STAGE_NAMES: Record<Lang, Dict> = {
  en: {
    'Group Stage': 'Group Stage',
    'Round of 32': 'Round of 32',
    'Round of 16': 'Round of 16',
    Quarterfinal: 'Quarterfinals',
    Semifinal: 'Semifinals',
    'Third Place': 'Third Place',
    Final: 'Final',
  },
  es: {
    'Group Stage': 'Fase de grupos',
    'Round of 32': 'Dieciseisavos',
    'Round of 16': 'Octavos',
    Quarterfinal: 'Cuartos de final',
    Semifinal: 'Semifinales',
    'Third Place': 'Tercer lugar',
    Final: 'Final',
  },
  pt: {
    'Group Stage': 'Fase de grupos',
    'Round of 32': 'Rodada de 32',
    'Round of 16': 'Oitavas de final',
    Quarterfinal: 'Quartas de final',
    Semifinal: 'Semifinais',
    'Third Place': 'Terceiro lugar',
    Final: 'Final',
  },
};

const DICTS: Record<Lang, Dict> = { en, es, pt };

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] != null ? String(vars[k]) : `{${k}}`
  );
}

export interface I18n {
  lang: Lang;
  locale: string;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  stage: (stage: string) => string;
}

const LOCALES: Record<Lang, string> = {
  en: 'en-US',
  es: 'es-ES',
  pt: 'pt-BR',
};

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => loadLang());

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<I18n>(() => {
    const dict = DICTS[lang];
    return {
      lang,
      locale: LOCALES[lang],
      setLang,
      t: (key, vars) => interpolate(dict[key] ?? en[key] ?? key, vars),
      stage: (s) => STAGE_NAMES[lang][s] ?? STAGE_NAMES.en[s] ?? s,
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
