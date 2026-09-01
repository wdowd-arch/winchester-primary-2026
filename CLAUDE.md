# CLAUDE.md — read this first

Live election-night results widget for the **Massachusetts state primary, Tuesday, Sept. 1, 2026**,
covering the two open state Senate seats on Winchester's ballot. Published by **Winchester News**.
Built on the pattern of an earlier Marblehead 2026 town-election widget (repo:
`wdowd-arch/marblehead-election-2026`).

`docs/HANDOFF.md` is the full technical brief. This file is the cold-start orientation: **what
state the project is in, what is decided, and what is still open.** Read both before changing
anything.

---

## Where things stand

| | |
|---|---|
| Widget | **Built and tested.** `node test/test.js` — 48 assertions, all passing. |
| Results feed | **Live path is `data/results.csv` in this repo.** `CSV_URL` points at it relatively. |
| Google Sheet | **Not used.** Dropped as the live source — see "How results get in". |
| Workbook | **Built, now a fallback.** `data/middlesex-senate-primary-2026-results.xlsx`. |
| GitHub repo | **Exists and pushed** — `wdowd-arch/winchester-primary-2026`. |
| GitHub Pages | **Enabled and live** at `https://wdowd-arch.github.io/winchester-primary-2026/`. |
| Ballot verification | **NOT DONE.** See "Unverified" below. This is the highest-priority open item. |
| Branding | **Placeholder.** Not Winchester News house style. |

### Layout

```
index.html      the widget — the only source file, served at the Pages root
CLAUDE.md       this file
README.md       orientation for a human arriving at the repo
docs/HANDOFF.md the full technical brief
data/           results.csv (the live feed), the fallback workbook, sample.csv
tools/          enter.py — writes results.csv; build-sheet.py — rebuilds the workbook
test/           test.js — the 48-assertion suite
```

`index.html` must stay at the repo root: GitHub Pages serves the site root from `main`, and the
embed URL in the article points there.

---

## How results get in

The user asked whether Claude could keep a Google Sheet updated from images and spreadsheets as
results came in. **It cannot** — the Drive tools available here have no Sheets write at all
(`update_file` changes a file's title and folder, nothing more), and creating a replacement file
each time would change the file ID and break the published CSV URL. So on 2026-08-31 the live
source moved into the repo, with the user's agreement:

```
community postings / images -> tools/enter.py -> data/results.csv -> commit + push
    -> Pages -> index.html fetches it every 15s
```

`CSV_URL = "data/results.csv"` — relative, so it works locally and deployed, and same-origin, so
there is no CORS hop. **`tools/enter.py` is the way to write that file**, not an editor: it
resolves race, area and candidate by name against the file itself, refuses anything ambiguous or
unmatched, resolves every pair before writing any of them, and prints each change as `old -> new`.
A candidate from the other district fails to match, which is the wrong-column guard.

Two things this does not do, and nobody should imply otherwise:

- **Claude cannot watch for results.** There is no polling and no daemon; the loop is always the
  user sends something and Claude writes it. Scheduled wakeups bottom out around hourly, which is
  useless on election night.
- **Nobody has timed the round trip** — write, push, Pages redeploy, next 15s poll. That number is
  the floor on staleness and it needs measuring before polls close.

The workbook survives as the fallback: if Pages is slow or GitHub is down, it still builds a Sheet
a human can type into, and `CSV_URL` can be repointed at a published CSV in one edit.

---

## The two design decisions that matter

Do not undo either of these without talking to the user. They are editorial choices, not
implementation details.

### 1. The reporting unit is the community, not the precinct

Both Senate races span several municipalities. The user initially asked for precinct-level counts
across all of them. That was scoped back deliberately:

- Other cities and towns post **town-level totals** on election night. They do not feed precinct
  tapes to an out-of-town newsroom.
- Somerville alone has 21+ precincts; a full-district denominator would be ~90 precincts and could
  never be honestly filled.
- **Winchester is the exception** and *is* broken out precinct by precinct, because that is where
  Winchester News reporters actually are.

So the page reports **"3 of 6 communities reporting"** plus a strip showing every community as
in / partial / out, and Winchester additionally as "2 of 4 precincts".

The precinct sub-count is **live for the 5th Middlesex and dark for the 2nd.** The user supplied
per-community counts on 2026-08-31, including the `A` subprecincts that report separately at state
elections:

| 5th Middlesex | | 2nd Middlesex | |
|---|---|---|---|
| Malden | 27 | Somerville | 32 |
| Melrose | 14 | Medford | 18 |
| Reading | 8 | Cambridge | 11 |
| Stoneham | 7 | Winchester (4-7) | 4 |
| Wakefield | 7 | **total** | **65** |
| Winchester (1-3, 8) | 4 | | |
| **total** | **67** | | |

It is **all-or-nothing per district**: unless every community in a race has a count, that race
prints no precinct line rather than a denominator built on part of the district. Both districts
are now complete, so both carry the line — "3 of 6 communities reporting · 49 of 67 precincts".

**This does not change entry.** A single-column community contributes all of its precincts the
moment its citywide total lands — a posted city total means every precinct behind it is counted.
Only Winchester moves the sub-count one precinct at a time.

Note the counts came from the user, not a primary source, and one conflicts with an earlier
lookup: Medford here is 18, a web search said 16 (8 wards × 2, no subprecincts). Medford only
becomes visible once Cambridge resolves, so it can be re-checked then.

### 2. The page does not call winners

`ALLOW_CALL` at the top of the script is `false`. Partial reads "Leading"; complete reads
"X leads the district", marked unofficial. Never "wins" or "elected".

These totals are compiled by hand from other communities' postings. "Leads" is defensible;
declaring a nomination is an editorial call that belongs to the desk, in the story.

**`test/test.js` enforces this** — it renders every race at every reporting level and fails if winner
language appears while `ALLOW_CALL` is off. If you are tempted to soften that test, stop and ask.

---

## District composition (2021 redistricting)

| Race | Communities | Winchester |
|---|---|---|
| **2nd Middlesex** (D) | Somerville, Medford, **Cambridge Wards 10 & 11 + W7-1, W8-1**, Winchester | precincts 4, 5, 6, 7 |
| **5th Middlesex** (D) | Malden, Melrose, Reading, Stoneham, Wakefield, Winchester | precincts 1, 2, 3, 8 |

Both seats are open — Sen. Patricia Jehlen (2nd) and Sen. Jason Lewis (5th) are not seeking
re-election.

**Cambridge enters the 2nd Middlesex through Wards 10 and 11 entire, plus Ward 7 Precinct 1 and
Ward 8 Precinct 1** — eleven reporting units. **Ward 9 is NOT in this district**; it is Suffolk and
Middlesex (Brownsberger). Confirmed 2026-08-31 against the Cambridge Election Commission's *Wards, Precincts, and State Senate Districts* map (11 wards / 33 precincts, effective 2021-12-31).
Cambridge is split across three senate districts, so a citywide total would count voters from two
other ones. This is the easiest way to corrupt the 2nd Middlesex number, and the column is labeled
`Cambridge W10 W11 W7-1 W8-1` for that reason.

The configuration said `wards 9-11` until 2026-08-31 — wrong in both directions, including a ward
outside the district and omitting two precincts inside it.

---

## Verification status

Most of this project was originally assembled from web search summaries, because the build
environment blocks `sec.state.ma.us`, `malegislature.gov`, `electionstats.state.ma.us`,
`mass.gov`, MassGIS, Wikipedia, Ballotpedia and even `winchesternews.org`. Much of it has since
been confirmed by the editor against primary sources. **What is still open is listed first.**

### Open

- [ ] **Tom Hopcroft** — the page carries a footnote that he suspended active campaigning on
      July 31 but remained on the ballot past the withdrawal deadline. It renders under his name
      all night, so it needs to be right.

- [ ] **Medford's precinct count** — 18 (editor) against 16 from a web search (8 wards × 2, no
      subprecincts). Affects only the 2nd Middlesex denominator of 65.

### Confirmed

- [x] **Coverage is Democratic-only — editor's decision, 2026-08-31.** Whether either district
      has a Republican primary was never established and does not need to be: the page covers the
      two Democratic races, each labeled "Democratic primary". If that scope ever changes, a new
      race is an entry in `RACES`, a rerun of `tools/build-sheet.py` and a regenerated
      `results.csv`.

- [x] **Candidate names and spellings — editor, 2026-08-31.**
      2nd Middlesex: Burhan Azeem, Christine Barber, Tom Hopcroft, Matt McLaughlin,
      Erika Uyterhoeven. 5th Middlesex: Kate Lipper-Garabedian, Carey McDonald, Ryan J. O'Malley.
- [x] **Ballot order — not required, editor's call, 2026-08-31.** It would change nothing once
      votes land: the page sorts candidates by vote total. Configured order shows only in the
      "Awaiting first returns" state, before any numbers arrive.
- [x] **2nd Middlesex composition — 2026-08-31.** Somerville, Medford, the Cambridge portion
      below, and Winchester precincts 4, 5, 6, 7.
- [x] **5th Middlesex composition — editor, 2026-08-31.** Malden, Melrose, Reading, Stoneham,
      Wakefield and Winchester precincts 1, 2, 3 and 8.
- [x] **Cambridge's ward composition — 2026-08-31**, against the Cambridge Election Commission's *Wards, Precincts, and State Senate Districts* map (11 wards / 33 precincts, effective 2021-12-31): Wards 10 and 11 entire, plus
      Ward 7 Precinct 1 and Ward 8 Precinct 1; eleven units; Ward 9 excluded (it is Suffolk and
      Middlesex). The old `wards 9-11` was wrong and has been corrected everywhere. Corroborated
      by the MassGIS SENATE2021 layer for the district identities.
- [x] **Precinct counts — editor, 2026-08-31**, including the `A` subprecincts that report
      separately at state elections. 5th: Malden 27, Melrose 14, Reading 8, Stoneham 7,
      Wakefield 7, Winchester 4 = 67. 2nd: Somerville 32, Medford 18, Cambridge 11,
      Winchester 4 = 65.

---

## How to work on this

```
node test/test.js                 # always, before committing
python3 tools/enter.py show       # what is in the live file right now
python3 tools/build-sheet.py      # regenerate the fallback workbook after a config change
python3 -m http.server 8765       # then open http://localhost:8765/index.html?demo=1
```

`?demo=1` gives a scenario picker (Awaiting / Winchester in / Half in / All in / Tie) over
synthetic data. There is **no build step and no dev/production file pair** — `index.html` is the
only source. (The Marblehead project had a `build-index.py` and a separate dev file; it was a
recurring "edited the wrong file" trap and was dropped on purpose. Don't reintroduce it.)

**`RACES`/`COLUMNS` in `index.html` and `RACES`/`COLUMNS` in `tools/build-sheet.py` must stay in
sync**, and `data/results.csv` must match both. Changing a candidate or a community means editing
both, regenerating the workbook, and regenerating `results.csv` — the test suite now checks the
CSV's header, race keys, ballot and row widths against `index.html`, so drift fails the build
rather than silently dropping a race.

### Conventions carried over from the Marblehead build

- A blank cell parses to `null`, never `0`; a real `0` stays `0`. This distinction is load-bearing
  — it separates "hasn't reported" from "reported zero" and drives the em-dash.
- An area counts as reported only when every **candidate** cell in its column has a number.
  `Write-in`/`Blanks` are never required, so a half-typed column can't trip a call.
- Votes are summed only over fully-reported areas.
- Bar length equals the printed percentage; never rescale bars to the leader.
- Georgia typography, one accent color, no per-candidate hues.

---

## Next actions, in order

1. Ballot verification (above). **Highest priority.**
2. Time one full round trip: `enter.py` write → push → Pages → the page showing it.
3. Dry run the whole loop end to end before polls close.
4. Branding pass — real logo, real accent color.
5. Embed the iframe in the article (snippet in `docs/embed.html`).

The user said they would supply the numbers themselves. If that means they will hand over results
rather than a reporter typing into the Sheet, ask — the Sheet only earns its keep when someone
other than Claude is doing the entry.
