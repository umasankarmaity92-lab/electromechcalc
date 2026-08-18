#!/usr/bin/env python3
"""
add_author_box.py (v4)

Inserts / upgrades a bordered "Created by / Reviewed by / Last reviewed /
Standards" author box (matching editorial-policy.html) into every
calculator/article HTML page — now with a themed border: solid black in
light mode, solid white in dark mode (body.dark-theme).

Handles:
  A. Page already has the current bordered box (marker: "author-box" class)
     -> skipped.
  B. Page has an older box (either the single-line "Reviewed by Umasankar
     Maity..." version, or the un-bordered "Created by / Reviewed by /
     Last reviewed" version from v3) -> replaced with the new bordered box.
  C. Page has no box yet -> inserted using one of two patterns:
        1. Calculator pages: right after the "Understanding X" <h2> in the
           EXPLANATION section, before the prose <div>.
        2. Blog/article pages: right after the opening
           <article ... blog-prose ...> tag.

Also ensures the .author-box CSS rule (incl. the dark-theme border/bg
override) exists in each page's <style> block, inserting it if missing.

Usage:
    python3 add_author_box.py /path/to/html/folder
    python3 add_author_box.py /path/to/html/folder --dry-run

Idempotent: safe to re-run any number of times.
"""

import argparse
import re
import sys
from pathlib import Path
from datetime import date

CATEGORY_STANDARDS = {
    "electrical": "IEC / IEEE / BIS / NEC",
    "mechanical": "ISO / DIN / manufacturer bearing & belt data",
    "financial":  "EPFO / Income Tax Act / RBI compounding conventions",
    "default":    "IEC / IEEE / BIS",
}

ELECTRICAL_FILES = {
    "apfc.html", "battery-backup.html", "cable-derating-tips.html",
    "cable-size.html", "common-transformer-sizing-mistakes.html",
    "dg-size.html", "electrical-pro-max.html", "hp-kw.html",
    "inverter-size.html", "kva-current.html", "kw-current.html",
    "kw-kva.html", "mcb-vs-mccb-rccb-elcb-mpcb.html", "motor-current.html",
    "power-factor.html", "transformer-size.html", "ups-calculator.html",
    "ups-runtime-basics.html", "ups-size.html", "solar-size.html",
    "unit-converter-pro.html",
}
MECHANICAL_FILES = {
    "bearing-life.html", "belt-length.html", "cooling-tower.html",
    "gear-ratio.html", "pump-head.html", "pump-tdh.html",
    "maintenance-pro-cal.html",
}
FINANCIAL_FILES = {
    "cagr-calculator.html", "epf-calculator.html", "fd-calculator.html",
    "gratuity-calculator.html", "income-tax-calculator.html",
    "inflation-calculator.html", "nps-calculator.html",
    "ppf-calculator.html", "rd-calculator.html", "sip-calculator.html",
}

H2_PROSE_RE = re.compile(
    r'(<h2 class="text-2xl md:text-3xl font-display font-bold text-brandDark mb-[56]">.*?</h2>\s*\n)'
    r'(\s*<div class="prose)',
    re.DOTALL,
)

ARTICLE_RE = re.compile(
    r'(<article[^>]*blog-prose[^>]*>\s*\n)',
)

# Matches any prior box version (old single-line, or v3 un-bordered) so it
# can be swapped for the new bordered one. Deliberately broad: matches the
# not-prose box div whether or not it already has the author-box class.
OLD_BOX_RE = re.compile(
    r'<div class="not-prose[^"]*\bbg-white\b[^"]*rounded-xl[^"]*"[^>]*>.*?</div>\s*(?=\n)',
    re.DOTALL,
)

NEW_BOX_MARKER = "author-box"
ANY_BOX_MARKER = "Reviewed by"

# Matches the long-form "Reviewed by ... team</a>, comprising a qualified
# electrical engineer, a mechanical engineer, and a Chartered Accountant."
# sentence regardless of the href used for the editorial-policy link, so it
# can be shortened in place on pages that ALREADY have the current bordered
# author-box (which the main box-detection logic below otherwise skips).
OLD_REVIEWED_BY_TAIL_RE = re.compile(
    r'(ElectroMechCalc editorial team</a>)'
    r',\s*comprising a qualified electrical engineer,\s*a mechanical engineer,\s*and a Chartered Accountant\.',
)


def shorten_reviewed_by(html):
    """Shorten an already-present 'Reviewed by ... team</a>, comprising...'
    sentence to just 'Reviewed by ... team</a>.', leaving everything else
    in the box (dates, standards, href) untouched. Returns (html, changed)."""
    new_html, n = OLD_REVIEWED_BY_TAIL_RE.subn(r'\1.', html)
    return new_html, n > 0

CSS_MARKER = ".author-box{"
CSS_RULE = """
  .author-box{
    border:2px solid #000000;
  }
  body.dark-theme .author-box{
    border-color:#ffffff;
    background:#0B1220;
    color:#e2e8f0;
  }
"""

BOX_TEMPLATE = """
    <div class="not-prose author-box bg-white rounded-xl p-4 md:p-5 mb-6 text-sm text-gray-600 space-y-1">
      <p>Created by <a href="about.html" class="text-sky-600 underline">Umasankar Maity</a> — B.Tech in Electrical Engineering, with 11+ years of industrial experience.</p>
      <p>Reviewed by the <a href="editorial-policy.html" class="text-sky-600 underline">ElectroMechCalc editorial team</a>.</p>
      <p>Last reviewed: {review_date} &nbsp;|&nbsp; Standards referenced: {standards}</p>
    </div>
"""


def category_for(filename: str) -> str:
    if filename in ELECTRICAL_FILES:
        return "electrical"
    if filename in MECHANICAL_FILES:
        return "mechanical"
    if filename in FINANCIAL_FILES:
        return "financial"
    return "default"


def ensure_css(html):
    """Insert the .author-box CSS rule before </style> if not already present."""
    if CSS_MARKER in html:
        return html, False
    idx = html.find("</style>")
    if idx == -1:
        return html, False
    new_html = html[:idx] + CSS_RULE + html[idx:]
    return new_html, True


def process_file(path: Path, review_date: str, dry_run: bool) -> str:
    html = path.read_text(encoding="utf-8")
    notes = []

    standards = CATEGORY_STANDARDS[category_for(path.name)]
    box = BOX_TEMPLATE.format(review_date=review_date, standards=standards)

    # Shorten an existing long-form "Reviewed by ... comprising a qualified
    # electrical engineer..." sentence FIRST, before the box-presence check
    # below — this runs even on pages that already have the current
    # bordered author-box (which the box-detection logic would otherwise
    # skip entirely, leaving the old sentence untouched forever).
    html, reviewed_by_shortened = shorten_reviewed_by(html)
    if reviewed_by_shortened:
        notes.append("reviewed-by sentence shortened")

    # Box detection/replacement runs next. The shortening above only edits
    # inline text and never changes tag structure, so it doesn't affect
    # these patterns. This still runs before the CSS rule inserted below,
    # which itself contains the literal substring "author-box" and must
    # never be mistaken for an already-applied box.
    box_action = None
    if re.search(r'class="[^"]*\bauthor-box\b', html):
        pass  # already current, nothing to do for the box itself
    elif ANY_BOX_MARKER in html:
        old_match = OLD_BOX_RE.search(html)
        if not old_match:
            notes.append("BOX SKIPPED - marker found but div pattern didn't match, fix manually")
        else:
            html = html[: old_match.start()] + box.strip() + html[old_match.end():]
            box_action = "box replaced (old -> bordered)"
    else:
        match = H2_PROSE_RE.search(html)
        pattern_used = "calculator"
        if not match:
            match = ARTICLE_RE.search(html)
            pattern_used = "article"
        if not match:
            notes.append("BOX SKIPPED - no known pattern found, insert manually")
        else:
            html = html[: match.end(1)] + box + html[match.end(1):]
            box_action = f"box inserted ({pattern_used} pattern)"

    if box_action:
        notes.append(box_action)

    html, css_added = ensure_css(html)
    if css_added:
        notes.append("css added")

    if not notes:
        return "no changes needed"

    if not dry_run:
        path.write_text(html, encoding="utf-8")

    prefix = "would: " if dry_run else ""
    return prefix + "; ".join(notes)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("folder", type=str, help="Folder containing the .html files")
    parser.add_argument("--dry-run", action="store_true", help="Report only, do not write")
    parser.add_argument(
        "--review-date",
        type=str,
        default=date.today().strftime("%B %Y"),
        help="Review date text, e.g. 'July 2026' (defaults to current month/year)",
    )
    args = parser.parse_args()

    folder = Path(args.folder)
    if not folder.is_dir():
        print(f"Not a folder: {folder}", file=sys.stderr)
        sys.exit(1)

    html_files = sorted(folder.rglob("*.html"))
    if not html_files:
        print("No .html files found.", file=sys.stderr)
        sys.exit(1)

    for f in html_files:
        result = process_file(f, args.review_date, args.dry_run)
        rel = f.relative_to(folder)
        print(f"{str(rel):45s} -> {result}")


if __name__ == "__main__":
    main()
