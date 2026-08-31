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
| Widget | **Built and tested.** `node test/test.js` — 40 assertions, all passing. |
| Results feed | **Live path is `data/results.csv` in this repo.** `CSV_URL` points at it relatively. |
| Google Sheet | **Not used.** Dropped as the live source — see "How results get in". |
| Workbook | **Built, now a fallback.** `data/middlesex-senate-primary-2026-results.xlsx`. |
| GitHub repo | **Exists and pushed** — `wdowd-arch/winchester-primary-2026`. |
| GitHub Pages | **Not enabled.** Settings → Pages → branch `main`, path `/`. |
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
test/           test.js — the 40-assertion suite
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

There is **no district-wide precinct denominator**, and the machinery for one has been removed
(2026-08-31, at the user's direction). It existed only to print "N of M precincts" once someone
verified counts for all nine other municipalities; its one visible effect was a dashed box telling
readers a number was missing. A lookup attempt that day got Medford (16) and Reading (8) with
moderate confidence and nothing usable for Somerville, Cambridge W9-11, Stoneham, Wakefield or
Melrose — every primary source is blocked by the build environment's egress proxy. If the clerks
supply verified counts later, the feature is one commit to restore; a wrong denominator is wrong
on the page all night, so do not restore it from estimates.

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
| **2nd Middlesex** (D) | Somerville, Medford, **Cambridge wards 9–11 only**, Winchester | precincts 4, 5, 6, 7 |
| **5th Middlesex** (D) | Malden, Melrose, Reading, Stoneham, Wakefield, Winchester | precincts 1, 2, 3, 8 |

Both seats are open — Sen. Patricia Jehlen (2nd) and Sen. Jason Lewis (5th) are not seeking
re-election.

**Cambridge enters the 2nd Middlesex through wards 9, 10 and 11 only.** A citywide Cambridge total
would count voters outside the district. This is the easiest way to corrupt the 2nd Middlesex
number, and the sheet column is labeled `Cambridge W9-11` for that reason.

---

## UNVERIFIED — the highest-priority open item

**Every fact below came from web search summaries, not a primary source.** The build environment's
network policy blocked `sec.state.ma.us`, `malegislature.gov`, `electionstats.state.ma.us`,
`mass.gov`, `en.wikipedia.org`, `ballotpedia.org` and `winchesternews.org`. Search results were
internally inconsistent on precinct counts (one gave a Malden precinct list summing to 24 while
stating 27 polling places in the same answer).

**Do not present any of this as confirmed, and do not fill precinct counts into `RACES` from the
estimates below.** Check against the official ballot and the Town/City Clerks:

- [ ] Candidate names, spellings, **ballot order**.
      2nd Middlesex: Burhan Azeem, Christine Barber, Tom Hopcroft, Matt McLaughlin,
      Erika Uyterhoeven. 5th Middlesex: Kate Lipper-Garabedian, Carey McDonald, Ryan J. O'Malley.
- [ ] **Tom Hopcroft** — the page carries a footnote that he suspended active campaigning on
      July 31 but remained on the ballot past the withdrawal deadline. Confirm.
- [ ] **Republican primaries** — whether either district has any candidates at all. Unknown.
- [ ] District composition and Winchester's 4/5/6/7 vs 1/2/3/8 split.
- [ ] Precinct counts per community — **only if someone wants the precinct line back.** Not
      needed for the page as it now stands. Best figures so far, none from a primary source:
      Medford 16 (8 wards × 2); Reading 8; Malden 24 precincts + 3 sub-precincts = 27, with the
      right denominator unclear; Wakefield 6 or 7; Cambridge W9–11, Somerville, Stoneham and
      Melrose unknown.

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

1. Enable GitHub Pages (Settings → Pages → branch `main`, path `/`).
2. Ballot verification (above). **Highest priority.**
3. Time one full round trip: `enter.py` write → push → Pages → the page showing it.
4. Dry run the whole loop end to end before polls close.
5. Branding pass — real logo, real accent color.
6. Embed the iframe in the article (snippet in `docs/HANDOFF.md`).

The user said they would supply the numbers themselves. If that means they will hand over results
rather than a reporter typing into the Sheet, ask — the Sheet only earns its keep when someone
other than Claude is doing the entry.
