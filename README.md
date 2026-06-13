# FIFA World Cup 2026 — Schedule & Bracket Predictor

A fast React + Vite app to view the full World Cup schedule, enter your own
scores, and watch the group standings and knockout bracket fill in automatically.

## Features

- **Schedule** view grouped by day, with stage/group filters, search, and inline
  score inputs (UTC or your local time zone).
- **Groups** view with live standings (points, goal difference, qualifiers and
  best third-placed teams highlighted).
- **Bracket** view from Round of 32 through the Final + third-place play-off.
  Placeholders like _Winner Group C_ or _Winner Match 73_ resolve to real teams
  as you fill in results.
- **Knockout draws** include a penalty-shootout input to decide a winner.
- **Auto-save** — every score is stored in your browser (`localStorage`), so it
  survives page reloads. No backend, no sign-in.
- **Import any `.ics`** calendar to set up a future tournament. Export the
  fixtures as an ICS and drop them in — the whole schedule rebuilds.

## How scores drive the bracket

1. Fill in group-stage results → group tables update instantly.
2. Once all six matches in a group are decided, its winner/runner-up resolve.
3. After all groups finish, the eight best third-placed teams are assigned to
   their Round of 32 slots.
4. Each knockout result feeds the next round automatically (penalties decide
   draws).

## ICS format

The importer reads standard `VEVENT` entries:

- `SUMMARY` — `🇲🇽 Mexico vs 🇿🇦 South Africa` (knockout placeholders supported:
  `Winner Group C`, `Runner-up Group F`, `3rd Group A/B/C/D/F`,
  `Winner Match 73`, `Loser Match 101`).
- `DESCRIPTION` — contains `Stage:` and `Group:` fields.
- `LOCATION` — `Stadium, City`.
- `DTSTART` — UTC datetime.
- `UID` — `match_2026_<index>_…` (0-based); `Match N` references in summaries are
  1-based.

## Run it

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build
npm run preview  # preview the build
```

The bundled World Cup 2026 calendar lives at
`public/worldcup_2026_all_matches.ics` and loads by default.
