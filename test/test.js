#!/usr/bin/env node
/*
 * Logic tests for ../index.html. Run from the repo root:  node test/test.js
 *
 * Extracts the page's <script> and exercises the counting and call logic
 * directly, with a minimal DOM stub. The point is the two things that would
 * actually hurt on election night: a number landing in the wrong precinct, and
 * the page claiming a winner it has no business claiming.
 */
const fs = require('fs'), path = require('path');

function mkEl() {
  return { innerHTML: '', textContent: '', style: {},
           classList: { toggle(){}, add(){}, remove(){} },
           querySelectorAll: () => [], appendChild(){} };
}
const els = {};
global.document = {
  getElementById: id => (els[id] = els[id] || mkEl()),
  createElement: mkEl,
  body: { classList: { add(){}, remove(){}, toggle(){} } },
  documentElement: { scrollHeight: 1000 }
};
global.localStorage = { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = v; } };
global.location = { search: '' };
global.window = { addEventListener(){} }; global.window.parent = global.window;
global.setInterval = () => {};
global.fetch = async () => { throw new Error('offline in tests'); };

const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
const origWarn = console.warn; console.warn = () => {};
// Run the page's script in its own function scope and hand the pieces back out,
// so its declarations cannot collide with this file's.
const api = new Function(src + '\n;return { RACES, COLUMNS, SCENARIOS, ALLOW_CALL, parseCSV, parseCell,' +
                         ' colIndex, cellAt, total, hasData, areasReported, raceAreas, raceState,' +
                         ' raceLeadHtml, reportPhrase, render, allComplete };')();
console.warn = origWarn;
const { RACES, COLUMNS, SCENARIOS, ALLOW_CALL, parseCSV, parseCell, colIndex, cellAt, total,
        hasData, areasReported, raceAreas, raceState, raceLeadHtml, reportPhrase, render,
        allComplete } = api;

let fails = 0;
const eq = (label, got, want) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    fails++; console.log('FAIL ' + label + '\n  got  ' + JSON.stringify(got) + '\n  want ' + JSON.stringify(want));
  } else console.log('pass ' + label);
};
const R2 = RACES[0], R5 = RACES[1];
const WINNER_WORDS = /elected|\bwins\b|\bwon\b|defeat|victor/i;

// ── District composition ──
eq('2nd Middlesex has four communities', R2.communities.map(c => c.label),
   ['Somerville', 'Medford', 'Cambridge (wards 9-11)', 'Winchester (4-7)']);
eq('5th Middlesex has six communities', R5.communities.map(c => c.label),
   ['Malden', 'Melrose', 'Reading', 'Stoneham', 'Wakefield', 'Winchester (1-3, 8)']);
eq('Winchester 4-7 in the 2nd', R2.communities[3].areas,
   ['Winchester P4', 'Winchester P5', 'Winchester P6', 'Winchester P7']);
eq('Winchester 1,2,3,8 in the 5th', R5.communities[5].areas,
   ['Winchester P1', 'Winchester P2', 'Winchester P3', 'Winchester P8']);
eq('no Winchester precinct is in both districts',
   R2.communities[3].areas.filter(a => R5.communities[5].areas.includes(a)), []);
eq('all eight Winchester precincts are covered exactly once',
   COLUMNS.filter(c => c.startsWith('Winchester')).sort(),
   ['Winchester P1','Winchester P2','Winchester P3','Winchester P4',
    'Winchester P5','Winchester P6','Winchester P7','Winchester P8']);
eq('columns are unique', COLUMNS.length, new Set(COLUMNS).size);

// ── Parsing ──
eq('blank cell is null, not zero', parseCell(''), null);
eq('a real zero stays zero', parseCell('0'), 0);
eq('thousands separator', parseCell('1,204'), 1204);
{
  const hdr = 'Section,Item,' + COLUMNS.join(',') + '\n';
  const cells = COLUMNS.map(c => c === 'Somerville' ? '10' : '').join(',');
  const rows = parseCSV(hdr + '"' + R2.key + '","Barber, Christine",' + cells + '\n')
    .slice(1).map(r => [r[0], r[1], ...COLUMNS.map((_, i) => parseCell(r[2 + i]))]);
  eq('quoted comma does not shift columns',
     [rows[0][1], cellAt(rows[0], 'Somerville')], ['Barber, Christine', 10]);
}

// ── Cross-district isolation ──
{
  const row = [R2.key, 'x', ...COLUMNS.map(c => raceAreas(R5).includes(c) ? 999 : null)];
  row[colIndex('Somerville')] = 40;
  eq('5th-district columns are invisible to a 2nd-district total', total(row, raceAreas(R2)), 40);
}

// ── Reporting ──
const fill = (race, comms, votes) => race.cands.map((c, i) => {
  const row = [race.key, c.n, ...COLUMNS.map(() => null)];
  race.communities.slice(0, comms).forEach(cm => cm.areas.forEach(a => { row[colIndex(a)] = votes[i]; }));
  return row;
});
{
  const rows = fill(R2, 1, [10, 20, 5, 7, 9]);
  rows[2][colIndex('Medford')] = 50;   // Medford typed for one candidate only
  eq('a half-typed community does not count', areasReported(rows, raceAreas(R2)), ['Somerville']);
  const st = raceState(R2, rows);
  eq('partial community shows as partial', st.communities[1].state, 'partial');
  eq('a partly-typed community contributes no votes', st.cands.every(c => c.votes <= 20), true);
}
eq('nothing entered -> awaiting', raceState(R2, fill(R2, 0, [0,0,0,0,0])).state, 'awaiting');
eq('some communities -> leading', raceState(R2, fill(R2, 2, [10,50,5,7,9])).state, 'leading');
eq('every community -> complete', raceState(R2, fill(R2, 4, [10,50,5,7,9])).state, 'complete');
eq('community count', (st => [st.commIn, st.commTotal])(raceState(R5, fill(R5, 3, [1,2,3]))), [3, 6]);
eq('a tie is reported as a tie', raceState(R5, fill(R5, 6, [40,40,10])).tied, true);
eq('write-in blank does not block completion',
   raceState(R2, fill(R2, 4, [1,2,3,4,5]).concat([[R2.key,'Write-in',...COLUMNS.map(() => null)]])).state, 'complete');
eq('both races complete -> banner',
   allComplete(fill(R2, 4, [1,2,3,4,5]).concat(fill(R5, 6, [1,2,3]))), true);
eq('one race short -> no banner',
   allComplete(fill(R2, 4, [1,2,3,4,5]).concat(fill(R5, 5, [1,2,3]))), false);

// ── Winchester breakout ──
{
  const rows = R2.cands.map(c => {
    const row = [R2.key, c.n, ...COLUMNS.map(() => null)];
    ['Winchester P4', 'Winchester P6'].forEach(a => { row[colIndex(a)] = 100; });
    return row;
  });
  const w = raceState(R2, rows).communities.find(c => c.home);
  eq('Winchester shows 2 of 4 precincts', [w.inCount, w.parts, w.state], [2, 4, 'partial']);
}

// ── Precinct sub-count is suppressed while any count is unverified ──
eq('precinct line hidden when counts unknown',
   /precincts/.test(reportPhrase(raceState(R2, fill(R2, 4, [1,2,3,4,5])))), false);

// ── The call posture ──
eq('ALLOW_CALL is off by default', ALLOW_CALL, false);
RACES.forEach(race => {
  for (let n = 0; n <= race.communities.length; n++) {
    const hero = raceLeadHtml(race, raceState(race, fill(race, n, race.cands.map((_, i) => 100 - i * 10))));
    if (WINNER_WORDS.test(hero)) {
      fails++; console.log('FAIL winner language in ' + race.key + ' at ' + n + ' communities: ' + hero);
    }
  }
});
console.log('pass no winner language while ALLOW_CALL is off');

Object.keys(SCENARIOS).forEach(name => {
  try { render(SCENARIOS[name]()); } catch (e) { fails++; console.log('FAIL render ' + name + ': ' + e.message); }
});
eq('no winner language in the rendered page', WINNER_WORDS.test(els['races'].innerHTML), false);

console.log(fails ? '\n' + fails + ' FAILURE(S)' : '\nALL TESTS PASSED');
process.exit(fails ? 1 : 0);
