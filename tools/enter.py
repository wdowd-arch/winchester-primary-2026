#!/usr/bin/env python3
"""
Enter results into data/results.csv, the file the live page reads.

Hand-editing a 16-column CSV during a count is how a number ends up in the
wrong community. This writes by name instead: it resolves the race, the area
and the candidate against what is actually in the file, refuses anything it
cannot match exactly once, and prints every change as old -> new.

    python3 tools/enter.py show
    python3 tools/enter.py show --race 5th
    python3 tools/enter.py set 2nd Somerville Azeem=2431 Barber=3102 \\
        Hopcroft=1890 McLaughlin=1204 Uyterhoeven=2755 Write-in=12 Blanks=88

Areas may be given as they appear in the header ("Cambridge W10...") or as a
bare Winchester precinct ("P4"). Candidates match on any unambiguous part of
the name, so "Lipper" and "O'Malley" are enough. Everything is
case-insensitive. Nothing is written unless every pair on the line resolves.
"""
import argparse
import csv
import sys
from pathlib import Path

CSV_PATH = Path(__file__).resolve().parent.parent / "data" / "results.csv"
NON_CANDIDATE = ("write-in", "blanks")


def load():
    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        rows = list(csv.reader(f))
    if not rows:
        sys.exit(f"{CSV_PATH} is empty")
    return rows[0], rows[1:]


def save(header, body):
    with CSV_PATH.open("w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerows([header] + body)


def resolve_race(body, token):
    """Match a race key on any unambiguous fragment: '2nd', 'Fifth', the key."""
    keys = list(dict.fromkeys(r[0] for r in body if r and r[0]))
    t = token.lower().replace("2nd", "second").replace("5th", "fifth")
    hits = [k for k in keys if t in k.lower()]
    if len(hits) != 1:
        sys.exit(f"race {token!r} matched {len(hits)} of: " + "; ".join(keys))
    return hits[0]


def resolve_area(header, token):
    """Match a column. A bare precinct like 'P4' means 'Winchester P4'."""
    areas = header[2:]
    t = token.strip().lower()
    if t.startswith("p") and t[1:].isdigit():
        t = "winchester " + t
    exact = [a for a in areas if a.lower() == t]
    if exact:
        return areas.index(exact[0]) + 2
    hits = [a for a in areas if t in a.lower()]
    if len(hits) != 1:
        sys.exit(f"area {token!r} matched {len(hits)} of: " + ", ".join(areas))
    return areas.index(hits[0]) + 2


def resolve_item(body, race, token):
    """Match a candidate (or Write-in / Blanks) within one race."""
    items = [r[1] for r in body if r and r[0] == race]
    t = token.strip().lower()
    hits = [i for i in items if t in i.lower()]
    if len(hits) != 1:
        sys.exit(f"candidate {token!r} matched {len(hits)} of: " + ", ".join(items))
    return hits[0]


def parse_votes(token):
    if token.strip() in ("", "-", "--"):
        return ""
    t = token.replace(",", "").strip()
    if not t.isdigit():
        sys.exit(f"votes {token!r} is not a whole number "
                 "(use '-' to clear a cell back to not-reported)")
    return str(int(t))


def cmd_set(args):
    header, body = load()
    race = resolve_race(body, args.race)
    col = resolve_area(header, args.area)
    area = header[col]

    # Resolve everything before writing anything, so a typo in the last pair
    # cannot leave the file half-updated.
    changes = []
    for pair in args.votes:
        if "=" not in pair:
            sys.exit(f"expected name=votes, got {pair!r}")
        name, raw = pair.split("=", 1)
        item = resolve_item(body, race, name)
        if any(item == c[0] for c in changes):
            sys.exit(f"{item} given twice on the same line")
        changes.append((item, parse_votes(raw)))

    for item, value in changes:
        row = next(r for r in body if r[0] == race and r[1] == item)
        old = row[col]
        row[col] = value
        mark = "  " if old == value else "->"
        print(f"  {item:<26} {old or '-':>8} {mark} {value or '-':>8}")

    save(header, body)

    missing = [r[1] for r in body
               if r[0] == race and r[1].lower() not in NON_CANDIDATE and not r[col]]
    print(f"\n{race}\n{area}: ", end="")
    print("REPORTING - all candidates in" if not missing
          else "partial - still blank: " + ", ".join(missing))


def cmd_show(args):
    header, body = load()
    races = list(dict.fromkeys(r[0] for r in body if r and r[0]))
    if args.race:
        races = [resolve_race(body, args.race)]
    for race in races:
        rows = [r for r in body if r[0] == race]
        cands = [r for r in rows if r[1].lower() not in NON_CANDIDATE]
        areas = [(i + 2, a) for i, a in enumerate(header[2:])
                 if any(r[i + 2] for r in rows)]
        print("\n" + race)
        if not areas:
            print("  nothing entered")
            continue
        width = max(len(r[1]) for r in rows)
        print("  " + " " * width + "  " + "  ".join(f"{a:>10}" for _, a in areas))
        for r in rows:
            print(f"  {r[1]:<{width}}  " +
                  "  ".join(f"{r[c] or '-':>10}" for c, _ in areas))
        done = [a for c, a in areas if all(r[c] for r in cands)]
        print(f"  reporting: {len(done)} area(s)" +
              (" - " + ", ".join(done) if done else ""))


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("set", help="write one area's numbers for one race")
    s.add_argument("race", help="2nd / 5th, or any unambiguous part of the key")
    s.add_argument("area", help="a column name, or a bare precinct like P4")
    s.add_argument("votes", nargs="+", metavar="NAME=VOTES",
                   help="use '-' for VOTES to clear a cell back to not-reported")
    s.set_defaults(func=cmd_set)

    v = sub.add_parser("show", help="print what has been entered so far")
    v.add_argument("--race", help="limit to one race")
    v.set_defaults(func=cmd_show)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
