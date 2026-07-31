#!/usr/bin/env python3
"""
add_author_box.py (v3)

Inserts / upgrades a "Created by / Reviewed by / Last reviewed / Standards"
author box (matching editorial-policy.html) into every calculator/article
HTML page.

Three cases handled:
  A. Page already has the NEW box (marker: "ElectroMechCalc editorial team")
     -> skipped.
  B. Page has the OLD box (single "Reviewed by Umasankar Maity..." line)
     -> that whole <div> is replaced with the new box.
  C. Page has no box yet
     -> new box is inserted using one of two patterns:
        1. Calculator pages: right after the "Understanding X" <h2> in the
           EXPLANATION section and before the prose <div>. Accepts mb-5/mb-6.
        2. Blog/article pages: right after the opening
           <article ... blog-prose ...> tag.

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

# Category -> standards line, used to customize the box.
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
}
FINANCIAL_FILES = {
    "cagr-calculator.html", "epf-calculator.html", "fd-calculator.html",
    "gratuity-calculator.html", "income-tax-calculator.html",
    "inflation-calculator.html", "nps-calculator.html",
    "ppf-calculator.html", "rd-calculator.html", "sip-calculator.html",
}

# Pattern 1: calculator pages -- "Understanding ..." H2 immediately followed
# by the prose div, inside the EXPLANATION section. mb-5 and mb-6 both
# appear across the site, so accept either.
H2_PROSE_RE = re.compile(
    r'(<h2 class="text-2xl md:text-3xl font-display font-bold text-brandDark mb-[56]">.*?</h2>\s*\n)'
    r'(\s*<div class="prose)',
    re.DOTALL,
)

# Pattern 2: blog/article pages -- insert right after the opening
# <article ... blog-prose ...> tag.
ARTICLE_RE = re.compile(
    r'(<article class="[^"]*blog-prose[^"]*">\s*\n)',
)

# Matches the OLD box (single "Reviewed by Umasankar Maity..." line) so it
# can be swapped out for the new one.
OLD_BOX_RE = re.compile(
    r'<div class="not-prose bg-white border border-gray-200 rounded-xl p-4 md:p-5 mb-\d+ text-sm text-gray-600">.*?</div>',
    re.DOTALL,
)

NEW_BOX_MARKER = 'Created by <a href="/about"'
OLD_BOX_MARKER = "Reviewed by"

BOX_TEMPLATE = """
    <div class="not-prose bg-white border border-gray-200 rounded-xl p-4 md:p-5 mb-6 text-sm text-gray-600 space-y-1">
      <p>Created by <a href="/about" class="text-sky-600 underline">Umasankar Maity</a> — B.Tech in Electrical Engineering, with 11+ years of industrial experience.</p>
      <p>Reviewed by the <a href="https://www.electromechcalc.com/editorial-policy" class="text-sky-600 underline">ElectroMechCalc editorial team</a>, comprising a qualified electrical engineer, a mechanical engineer, and a Chartered Accountant.</p>
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


def process_file(path: Path, review_date: str, dry_run: bool) -> str:
    html = path.read_text(encoding="utf-8")

    if NEW_BOX_MARKER in html:
        return "skipped (already has new box)"

    standards = CATEGORY_STANDARDS[category_for(path.name)]
    box = BOX_TEMPLATE.format(review_date=review_date, standards=standards)

    # Case B: old box present -> replace it in place.
    if OLD_BOX_MARKER in html:
        old_match = OLD_BOX_RE.search(html)
        if not old_match:
            return "SKIPPED - old marker found but box <div> pattern didn't match, fix manually"
        new_html = html[: old_match.start()] + box.strip() + html[old_match.end():]
        if not dry_run:
            path.write_text(new_html, encoding="utf-8")
        return f"{'would replace' if dry_run else 'replaced'} (old -> new box)"

    # Case C: no box yet -> insert fresh.
    match = H2_PROSE_RE.search(html)
    pattern_used = "calculator"
    if not match:
        match = ARTICLE_RE.search(html)
        pattern_used = "article"

    if not match:
        return "SKIPPED - no known pattern found, insert manually"

    new_html = html[: match.end(1)] + box + html[match.end(1):]

    if not dry_run:
        path.write_text(new_html, encoding="utf-8")

    return f"{'would update' if dry_run else 'updated'} ({pattern_used} pattern)"


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

    html_files = sorted(folder.glob("*.html"))
    if not html_files:
        print("No .html files found.", file=sys.stderr)
        sys.exit(1)

    for f in html_files:
        result = process_file(f, args.review_date, args.dry_run)
        print(f"{f.name:45s} -> {result}")


if __name__ == "__main__":
    main()
