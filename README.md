# 2nd & 5th Middlesex Senate primaries — live results

Election-night results widget for the **Massachusetts state primary, Tuesday, Sept. 1, 2026**,
covering the two open state Senate seats on Winchester's ballot. A **Winchester News** count.

One self-contained HTML page reads `data/results.csv` from this repo every 15 seconds and renders
live results for both districts, reported community by community, with Winchester broken out
precinct by precinct.

```
node test/test.js              # 48 assertions — run before every commit
python3 tools/enter.py show    # what has been entered so far
python3 -m http.server 8765    # http://localhost:8765/index.html?demo=1
```

`?demo=1` adds a scenario picker — Awaiting / Winchester in / Half in / All in / Tie — over
synthetic data. There is no build step and no dev/production pair: `index.html` is the only
source, and demo mode is a query parameter, so there is nothing to strip before deploying.

---

## Layout

```
index.html                  the widget — the only source file, served at the Pages root
CLAUDE.md                   cold-start orientation: project state, decisions, open items
README.md                   this file
docs/HANDOFF.md             the full technical brief — data contract, counting rules, setup
data/
  results.csv                                  THE LIVE FILE — what the page fetches
  middlesex-senate-primary-2026-results.xlsx   fallback workbook, if a human types instead
  sample.csv                                   a partly-filled export, for parser testing
tools/
  enter.py                                     writes results.csv by name, with validation
  build-sheet.py                               regenerates the fallback workbook
test/test.js                composition, parsing, reporting, call posture, results.csv
```

`index.html` stays at the repo root — GitHub Pages serves the site root from `main`, and the
article's iframe points there.

---

## The races

Both seats are open: Sen. Patricia Jehlen (2nd) and Sen. Jason Lewis (5th) are not seeking
re-election.

| Race | Communities | Winchester |
|---|---|---|
| **2nd Middlesex** (D) | Somerville, Medford, **Cambridge Wards 10 & 11 + W7-1, W8-1**, Winchester | precincts 4, 5, 6, 7 |
| **5th Middlesex** (D) | Malden, Melrose, Reading, Stoneham, Wakefield, Winchester | precincts 1, 2, 3, 8 |

**Cambridge is in the 2nd Middlesex through Wards 10 and 11 entire, plus Ward 7 Precinct 1 and
Ward 8 Precinct 1.** Ward 9 is not in this district. Cambridge is split across three senate
districts, so a citywide total would count voters from two others — the single easiest way to
corrupt that number. The column is labeled `Cambridge W10 W11 W7-1 W8-1` for exactly that reason.

---

## Two editorial decisions, not implementation details

Neither should be undone without talking to the desk.

**The reporting unit is the community, not the precinct — except in Winchester.** Other cities and
towns post town-level totals on election night; they do not feed precinct tapes to an out-of-town
newsroom. A full-district denominator would be roughly 90 precincts and could never be honestly
filled by hand. Winchester is broken out precinct by precinct because that is where our reporters
are. The page reads "3 of 6 communities reporting," plus "2 of 4 precincts" for Winchester.

A secondary precinct count rides on top where every community in a district has an established
figure: the 5th Middlesex totals 67 and the 2nd 65. It changes nothing about entry — a city's
citywide total brings in all of its precincts at once.

**The page does not call winners.** `ALLOW_CALL` is `false`. Partial reads "Leading"; complete
reads "X leads the district," marked unofficial. Never "wins" or "elected." These totals are
compiled by hand from other communities' postings, so "leads" is defensible and a declared
nomination is an editorial call that belongs in the story. `test/test.js` enforces this — it
renders every race at every reporting level and fails if winner language appears while
`ALLOW_CALL` is off.

---

## How the count works

```
Community postings + Winchester precinct tapes → tools/enter.py → data/results.csv
    → commit + push → Pages → index.html fetch() every 15s → parse + render → iframe
```

`CSV_URL` is the relative path `data/results.csv`, so the same file works locally and deployed,
same-origin, with no third-party service between the newsroom and the numbers. Entry goes through
`tools/enter.py`, which resolves the race, the area and the candidate by name against the file
itself and refuses anything it cannot match exactly once — hand-editing a 16-column CSV mid-count
is how a number lands in the wrong community:

```
python3 tools/enter.py set 2nd Somerville Azeem=2431 Barber=3102 Hopcroft=1890 \
    McLaughlin=1204 Uyterhoeven=2755 Write-in=12 Blanks=88
python3 tools/enter.py set 5th P1 Lipper=204 McDonald=188 O\'Malley=97
python3 tools/enter.py set 2nd Somerville Azeem=2439      # a correction
python3 tools/enter.py set 2nd Somerville Azeem=-         # back to not-reported
python3 tools/enter.py show --race 5th
```

Every change prints as `old -> new`, and each write reports whether that area is now fully
reporting or which candidates are still blank. Then commit and push; Pages redeploys and the page
picks it up on its next poll.

- A blank cell parses to `null`, never `0`; a real `0` stays `0`. That distinction separates
  "hasn't reported" from "reported zero" and drives the em-dash.
- An area counts as reported only once **every candidate cell** in its column has a number.
  `Write-in` and `Blanks` are never required, so a half-typed column cannot trip a call.
- Votes are summed only over fully-reported areas, so a partly-typed community never contributes
  a lopsided fragment.
- A tie at the top renders as "Tied," never as a lead. Bar length equals the printed percentage —
  bars are never rescaled to the leader.
- The page recomputes from scratch on every refresh, so a correction in the sheet corrects the
  page within 15 seconds. On a failed or slow fetch it keeps the last good numbers rather than
  flashing blanks.

`RACES`/`COLUMNS` in `index.html` and in `tools/build-sheet.py` must stay in sync. Changing a
candidate or a community means editing both and regenerating the workbook.

---

## Before it goes live

- [ ] **Finish verifying the ballot.** Names, spellings and both districts' composition are
      confirmed, and coverage is Democratic-only by editorial decision. Still open: the Tom
      Hopcroft footnote. Full status in [`CLAUDE.md`](CLAUDE.md).
- [ ] Enable GitHub Pages — Settings → Pages → branch `main`, path `/`. Nothing is published
      until this is on, and it is what serves `data/results.csv`.
- [ ] `node test/test.js`, then click through all five demo scenarios.
- [ ] **Time one round trip before polls close** — an `enter.py` write, a push, and however long
      Pages actually takes to serve the new CSV. That number sets the floor on how stale the page
      can be, and nobody has measured it yet.
- [ ] Decide the fallback if Pages is slow or GitHub is down: `data/middlesex-senate-primary-2026-results.xlsx`
      still builds a Google Sheet a human can type into, and `CSV_URL` can be repointed at its
      published CSV in one edit.
- [ ] Branding pass. `--accent: #1D4E6B`, the text wordmark and the Georgia typography are
      placeholders carried over from the Marblehead build, not Winchester News house style.

Embed snippet, the full data contract and the rest of the setup are in
[`docs/HANDOFF.md`](docs/HANDOFF.md).

---

Built on the pattern of the Marblehead 2026 town-election widget
(`wdowd-arch/marblehead-election-2026`).
