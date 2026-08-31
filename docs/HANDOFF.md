# 2nd & 5th Middlesex Senate primaries — election night handoff

Live results for the two open state Senate seats on Winchester's ballot in the **Massachusetts
state primary, Tuesday, Sept. 1, 2026**. Built on the Marblehead 2026 election-night pattern,
restructured for races that span several communities.

---

## District composition

From the 2021 redistricting (effective 2022):

| Race | Communities | Winchester's share |
|---|---|---|
| **State Senate · 2nd Middlesex** (D) | Somerville (all), Medford (all), **Cambridge wards 9–11 only**, Winchester precincts 4–7 | 4 of the town's 8 precincts |
| **State Senate · 5th Middlesex** (D) | Malden, Melrose, Reading, Stoneham, Wakefield (all), Winchester precincts 1, 2, 3, 8 | the other 4 precincts |

Both seats are open — Sen. Patricia Jehlen (2nd) and Sen. Jason Lewis (5th) are not seeking
re-election.

**Cambridge is in the 2nd Middlesex for wards 9, 10 and 11 only.** A citywide Cambridge total
would count voters who are not in this district. This is the single easiest way to corrupt the
2nd Middlesex number.

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

**Precinct counts are wired in but not filled.** Each community has a `precincts` field in
`RACES`, currently `null` for everything except Winchester. When every community in a district has
a verified number, the page automatically adds a secondary "N of M precincts" line. Until then it
omits it rather than printing a figure we cannot stand behind. See **Still to verify**.

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
| **`tools/build-sheet.py`** | Regenerates the workbook. Race config here must match `RACES`/`COLUMNS` in `index.html`. |
| **`data/middlesex-senate-primary-2026-results.xlsx`** | Data-entry workbook (Results / How to use / District composition). |
| **`test/test.js`** | `node test/test.js` — 28 assertions on composition, parsing, reporting and call posture. |
| **`data/sample.csv`** | A partially-filled export, for testing the parser without a live sheet. |

Demo mode is a query parameter, not a separate build: `index.html?demo=1` gives a scenario picker
(Awaiting / Winchester in / Half in / All in / Tie) over synthetic data. Nothing to strip before
deploying.

---

## Data flow

```
Community totals + Winchester precinct tapes  ->  Google Sheet (Results tab)  ->  published CSV
   ->  index.html fetch() every 15s  ->  parse + render  ->  iframe in the article
```

The page recomputes every race from scratch on each refresh, so a correction in the sheet corrects
the page within 15 seconds.

---

## Data contract — keep in sync

The widget keeps only rows where **column A is a known race key** and **column B is non-empty**, so
decorative title and spacer rows are ignored.

- **Column A = race key**, matching `RACES[].key` exactly: `Second Middlesex Senate - Democratic`,
  `Fifth Middlesex Senate - Democratic`. ASCII, plain hyphen. If this drifts, that race vanishes.
- **Column B = item:** a candidate name, `Write-in`, or `Blanks`.
- **Columns C onward = the 16 reporting areas**, in the order of `COLUMNS`:
  Somerville, Medford, Cambridge W9-11, Winchester P4–P7, Malden, Melrose, Reading, Stoneham,
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
2. Upload the xlsx to Drive, open as a Google Sheet.
3. **File → Share → Publish to web → the `Results` tab → CSV** → copy the URL.
4. Paste into `CSV_URL` at the top of the `<script>` in `index.html`.
5. `node test/test.js`, then click through all five scenarios at `?demo=1`.
6. Push, enable GitHub Pages (Settings → Pages → branch `main`, path `/`).
7. Share the Sheet as Editor with whoever is typing.
8. Dry run with the live sheet before Tuesday.

### Embedding

```html
<iframe id="senate-results" src="https://wdowd-arch.github.io/winchester-primary-2026/"
        title="2nd and 5th Middlesex Senate primary results" loading="lazy" scrolling="no"
        style="width:100%; height:2600px; border:0; display:block;"></iframe>
<script>
  window.addEventListener('message', function (e) {
    if (e.origin !== 'https://wdowd-arch.github.io') return;
    if (e.data && e.data.winchesterHeight)
      document.getElementById('senate-results').style.height = e.data.winchesterHeight + 'px';
  });
</script>
```

---

## Still to verify

Everything here was assembled from news reporting and search results. The build environment blocks
outbound web access to `sec.state.ma.us`, `malegislature.gov`, `electionstats.state.ma.us`,
`mass.gov`, Wikipedia, Ballotpedia and `winchesternews.org`, so **none of it was confirmed against
a primary source.** Check before polls close:

- [ ] **Candidate names, spellings and ballot order.**
      2nd Middlesex: Burhan Azeem, Christine Barber, Tom Hopcroft, Matt McLaughlin,
      Erika Uyterhoeven. 5th Middlesex: Kate Lipper-Garabedian, Carey McDonald, Ryan J. O'Malley.
- [ ] **Tom Hopcroft** — the page footnotes that he suspended campaigning July 31 but stayed on the
      ballot. Confirm that is still accurate.
- [ ] **Republican primaries** — whether either district has candidates. If so, each is a new entry
      in `RACES` plus a rerun of `tools/build-sheet.py`. If not, consider saying so on the page.
- [ ] **District composition** — that Cambridge is wards 9–11, and that Winchester's split is still
      4/5/6/7 and 1/2/3/8.
- [ ] **Precinct counts per community**, if you want the precinct line. Unverified working figures
      that must NOT be shipped without checking: Cambridge wards 9–11 ≈ 9 (Cambridge has 11 wards /
      33 precincts); Medford ≈ 16–17; Somerville ≈ 21+ with sub-precincts (2A, 3A, 4A);
      Malden ≈ 24–27; Reading ≈ 8; Stoneham ≈ 7; Wakefield ≈ 7; Melrose unknown.
      Sources that would settle it: the Secretary of the Commonwealth's district pages,
      MassGIS "2022 Wards and Precincts", `electionstats.state.ma.us`, or each clerk.

---

## Branding — needs a pass

Placeholders, not Winchester News house style: `--accent: #1D4E6B`, a text wordmark, and Georgia
typography carried over from the Marblehead build. Swap in the real logo and color.
