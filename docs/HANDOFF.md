# 2nd & 5th Middlesex Senate primaries — election night handoff

Live results for the two open state Senate seats on Winchester's ballot in the **Massachusetts
state primary, Tuesday, Sept. 1, 2026**. Built on the Marblehead 2026 election-night pattern,
restructured for races that span several communities.

---

## District composition

From the 2021 redistricting (effective 2022):

| Race | Communities | Winchester's share |
|---|---|---|
| **State Senate · 2nd Middlesex** (D) | Somerville (all), Medford (all), **Cambridge Wards 10 and 11 plus W7-1 and W8-1**, Winchester precincts 4–7 | 4 of the town's 8 precincts |
| **State Senate · 5th Middlesex** (D) | Malden, Melrose, Reading, Stoneham, Wakefield (all), Winchester precincts 1, 2, 3, 8 | the other 4 precincts |

Both seats are open — Sen. Patricia Jehlen (2nd) and Sen. Jason Lewis (5th) are not seeking
re-election.

**Cambridge is in the 2nd Middlesex for Wards 10 and 11 entire, plus Ward 7 Precinct 1 and Ward 8
Precinct 1** — eleven reporting units. **Ward 9 is not in this district** (it is Suffolk and
Middlesex). Cambridge is split across three senate districts, so a citywide total would count
voters from two others. This is the single easiest way to corrupt the 2nd Middlesex number.
Confirmed 2026-08-31 against the Cambridge Election Commission's *Wards, Precincts, and State Senate Districts* map (11 wards / 33 precincts, effective 2021-12-31).

---

## Reporting units, and why they are what they are

The reporting unit is the **community**, not the precinct — except in Winchester, which is broken
out precinct by precinct because that is where our own reporters are.

That is a deliberate choice about what is actually obtainable. Other cities and towns post their
own totals on election night; they do not feed precinct tapes to an out-of-town newsroom. Somerville
alone has more than twenty precincts. Building the denominator out of ~90 precincts across nine
municipalities would produce an "X of N precincts reporting" line that could never be filled in
honestly.

So the page counts **"3 of 6 communities reporting"** and shows a strip of every community with
its state (in / partial / out). Winchester additionally shows "2 of 4 precincts".

**The precinct sub-count is live for the 5th Middlesex only.** Each community carries a
`precincts` figure: Malden 27, Melrose 14, Reading 8, Stoneham 7, Wakefield 7, Winchester 4 — 67
in all, counting the `A` subprecincts that report separately at state elections. The 5th therefore
reads "3 of 6 communities reporting · 49 of 67 precincts".

The 2nd Middlesex totals 65: Somerville 32, Medford 18, Cambridge 11, Winchester 4. The rule is
all-or-nothing per district — a denominator built on part of a district would be worse than none —
and both districts now clear it.

This changes nothing about entry. A single-column community contributes all its precincts the
moment its citywide total lands; only Winchester moves the count one precinct at a time.

---

## Call posture

`ALLOW_CALL` at the top of the script is **`false`**, and the test suite fails the build if winner
language appears anywhere while it is off.

- Partial: **"Leading · 3 of 6 communities reporting"**, counting only communities that have fully
  reported.
- Complete: **"All communities reporting · X leads the district"**, marked unofficial.

Set `ALLOW_CALL = true` only if the desk decides the page itself should declare a nomination. These
totals are compiled by hand from other communities' postings, so "leads" is defensible and "wins"
is an editorial decision, not a technical one.

---

## Files

| File | Role |
|---|---|
| **`index.html`** | The whole widget — self-contained, no build step. Edit directly. |
| **`data/results.csv`** | **The live feed.** What the page fetches. Write it with `tools/enter.py`. |
| **`tools/enter.py`** | Validated entry: `set` one area's numbers, `show` the current state. |
| **`tools/build-sheet.py`** | Regenerates the fallback workbook. Race config here must match `RACES`/`COLUMNS` in `index.html`. |
| **`data/middlesex-senate-primary-2026-results.xlsx`** | Fallback workbook (Results / How to use / District composition). |
| **`test/test.js`** | `node test/test.js` — 48 assertions on composition, parsing, reporting, call posture and `results.csv`. |
| **`data/sample.csv`** | A partially-filled export, for testing the parser without a live sheet. |

Demo mode is a query parameter, not a separate build: `index.html?demo=1` gives a scenario picker
(Awaiting / Winchester in / Half in / All in / Tie) over synthetic data. Nothing to strip before
deploying.

---

## Data flow

```
Community totals + Winchester precinct tapes  ->  tools/enter.py  ->  data/results.csv
   ->  commit + push  ->  Pages  ->  index.html fetch() every 15s  ->  parse + render  ->  iframe
```

`CSV_URL` is the relative path `data/results.csv`: same file locally and deployed, same origin, no
third-party service in the path. The Google Sheet was dropped as the live source because the Drive
tooling available to Claude has no Sheets write — see "How results get in" in `CLAUDE.md`.

The page recomputes every race from scratch on each refresh, so a correction in `results.csv`
corrects the page one poll after it deploys. **The round trip — write, push, Pages redeploy, next
15s poll — has not been measured. Time it before polls close.**

---

## Data contract — keep in sync

The widget keeps only rows where **column A is a known race key** and **column B is non-empty**, so
decorative title and spacer rows are ignored.

- **Column A = race key**, matching `RACES[].key` exactly: `Second Middlesex Senate - Democratic`,
  `Fifth Middlesex Senate - Democratic`. ASCII, plain hyphen. If this drifts, that race vanishes.
- **Column B = item:** a candidate name, `Write-in`, or `Blanks`.
- **Columns C onward = the 16 reporting areas**, in the order of `COLUMNS`:
  Somerville, Medford, Cambridge W10 W11 W7-1 W8-1, Winchester P4–P7, Malden, Melrose, Reading,
  Stoneham,
  Wakefield, Winchester P1, P2, P3, P8. Never insert or delete a column.
- **A blank cell parses to `null`, not `0`.** A real `0` stays `0`. This separates "hasn't
  reported" from "reported zero" and drives the em-dash.
- Quoted commas and apostrophes are handled — a real CSV parser, not `split(',')`.

---

## Counting rules

- An **area** counts as reported only when **every candidate cell** in its column has a number.
  `Write-in` and `Blanks` are not required, so a half-typed column cannot move a race forward.
- Votes are summed **only over fully-reported areas**, so a partly-typed community never
  contributes a lopsided fragment to the standings.
- A **finished Winchester precinct counts** even while its community shows "partial" — a precinct
  is a genuine reporting unit. A single-column community is all-or-nothing.
- A community that has been started but not finished shows as **partial**, so the desk can see
  someone is mid-entry rather than that it is untouched.
- A tie at the top renders as **"Tied"**, never as a lead.
- Bar length equals the printed percentage — never rescaled to the leader.

---

## Reliability

- `render(data)` is separate from `refresh()`.
- On load the page paints instantly from `localStorage` (`middlesex-senate-primary-2026`), so a
  reader refresh never flashes blanks.
- On a failed, empty or slow fetch it keeps `lastGood` and never resets to zero. Status reads
  `Loading…` / `Live · updated …` / `Results updating… · last good …`.
- Auto-refresh every 15s.

---

## Setup

1. Verify the ballot and district data (below).
2. Enable GitHub Pages: Settings → Pages → branch `main`, path `/`. This also serves
   `data/results.csv`.
3. `node test/test.js`, then click through all five scenarios at `?demo=1`.
4. Dry run the full loop: `python3 tools/enter.py set 2nd Somerville …`, commit, push, and watch
   the deployed page pick it up. **Time it.**
5. Clear the dry-run numbers before polls close —
   `python3 tools/enter.py set 2nd Somerville Azeem=- Barber=- …`, or regenerate the file — and
   confirm the deployed page reads "Awaiting first returns" for both races.

### Fallback

If Pages is slow or GitHub is unreachable, `data/middlesex-senate-primary-2026-results.xlsx` still
builds a Google Sheet a human can type into: upload to Drive, open as a Sheet, File → Share →
Publish to web → the `Results` tab → CSV, and point `CSV_URL` at that URL. Same column contract,
so nothing else changes.

### Embedding

The paste-ready snippet lives in [`embed.html`](embed.html) — copy that file's contents into a
Custom HTML block in the article. It checks `e.source` as well as `e.origin`, so only this widget
can resize its own iframe, and clamps the height so a bad value cannot break the article layout.

`render()` calls `postHeight()` on every pass, so the iframe tracks the page as results come in.
If the host CMS strips `<script>`, drop the script block and leave the iframe at a fixed height
tall enough for the finished page — check it on a phone, where it is tallest.

---

## Verification status

Originally assembled from news reporting and search results, because the build environment blocks
`sec.state.ma.us`, `malegislature.gov`, `electionstats.state.ma.us`, `mass.gov`, MassGIS,
Wikipedia, Ballotpedia and `winchesternews.org`. Most of it has since been confirmed by the editor.

**Open before polls close:**

- [ ] **Tom Hopcroft** — the page footnotes that he suspended campaigning July 31 but stayed on
      the ballot. Confirm it is still accurate; it shows under his name all night.
- [ ] **Medford's precinct count** — 18 (editor) vs 16 (web search). Affects the 2nd's 65 only.

**Confirmed:**

- [x] **Coverage is Democratic-only** — editor's decision, 2026-08-31. Each race is labeled
      "Democratic primary" on the page.

- [x] **Candidate names and spellings** — editor, 2026-08-31.
- [x] **Ballot order** — not required, editor's call. The page sorts by vote total, so configured
      order is visible only before any results land.
- [x] **2nd Middlesex composition** — Somerville, Medford, the Cambridge portion below, Winchester
      precincts 4-7.
- [x] **5th Middlesex composition** — editor, 2026-08-31: Malden, Melrose, Reading, Stoneham,
      Wakefield and Winchester precincts 1, 2, 3 and 8.
- [x] **Cambridge's ward composition** — 2026-08-31 against the Cambridge Election Commission's *Wards, Precincts, and State Senate Districts* map (11 wards / 33 precincts, effective 2021-12-31): Wards 10 and 11 entire plus W7-1
      and W8-1, eleven units, Ward 9 excluded. Corroborated by the MassGIS SENATE2021 layer.
- [x] **Precinct counts** — editor, 2026-08-31, `A` subprecincts included. 5th = 67, 2nd = 65.

---

## Branding — needs a pass

Placeholders, not Winchester News house style: `--accent: #1D4E6B`, a text wordmark, and Georgia
typography carried over from the Marblehead build. Swap in the real logo and color.
