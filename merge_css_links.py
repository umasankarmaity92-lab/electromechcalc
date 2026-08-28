#!/usr/bin/env python3
"""
merge_css_links.py
-------------------
Replaces the two separate CSS <link> blocks (tailwind.min.css and
theme.css?v=2) with a single reference to the merged /assets/site.min.css
across every page listed in sitemap.xml.

USAGE:
    1. Put this script in the root of your site repo (same folder that
       contains sitemap.xml, index.html, /electrical/, /mechanical/, /blog/, etc.)
    2. Make sure /assets/site.min.css already exists (merged tailwind + theme).
    3. Run:  python3 merge_css_links.py
    4. It edits files IN PLACE. A dry run mode is available first — see below.

Before running for real, do a dry run to see what it WOULD change:
    python3 merge_css_links.py --dry-run

Handles both CSS-link patterns found across the site:
  Pattern A (preload+swap for both files):
    <link rel="preload" as="style" href="/assets/tailwind.min.css">
    <link rel="stylesheet" href="/assets/tailwind.min.css" media="print" onload="this.media='all'">
    <noscript><link rel="stylesheet" href="/assets/tailwind.min.css"></noscript>
    ...
    <link rel="preload" as="style" href="/assets/theme.css?v=2">
    <link rel="stylesheet" href="/assets/theme.css?v=2" media="print" onload="this.media='all'">
    <noscript><link rel="stylesheet" href="/assets/theme.css?v=2"></noscript>

  Pattern B (tailwind blocking, theme deferred — 4 or 5 lines total):
    <link rel="stylesheet" href="/assets/tailwind.min.css">
    ...
    <link rel="preload" as="style" href="/assets/theme.css?v=2">
    <link rel="stylesheet" href="/assets/theme.css?v=2" media="print" onload="this.media='all'">
    <noscript><link rel="stylesheet" href="/assets/theme.css?v=2"></noscript>

  Homepage-style (both fully render-blocking, no preload trick):
    <link rel="stylesheet" href="/assets/tailwind.min.css">
    ...
    <link rel="stylesheet" href="/assets/theme.css?v=2">

Anything between the tailwind block and the theme block (e.g. Google
Fonts <link> tags) is preserved untouched — only the tailwind lines and
the theme lines themselves are removed/replaced.

Files not found on disk, or files where the expected pattern isn't
found, are reported and skipped — nothing is guessed or force-edited.
"""

import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

SITEMAP_PATH = "sitemap.xml"
REPO_ROOT = Path(".")
NEW_CSS_PATH = "/assets/site.min.css?v=1"

# ---------------------------------------------------------------------
# 1. Turn a sitemap <loc> URL into a local file path.
#    https://www.electromechcalc.com/                                -> index.html
#    https://www.electromechcalc.com/about                           -> about.html
#    https://www.electromechcalc.com/electrical/mcb-size              -> electrical/mcb-size.html
#    https://www.electromechcalc.com/blog/electrical/vfd-maintenance  -> blog/electrical/vfd-maintenance.html
# ---------------------------------------------------------------------
def url_to_filepath(url: str) -> Path:
    path = re.sub(r"^https?://[^/]+", "", url)  # strip domain
    path = path.strip("/")
    if path == "":
        return REPO_ROOT / "index.html"
    return REPO_ROOT / f"{path}.html"


# ---------------------------------------------------------------------
# 2. Regex patterns for the three CSS-link shapes seen across the site.
# ---------------------------------------------------------------------
TAILWIND_3LINE = re.compile(
    r'<link rel="preload" as="style" href="/assets/tailwind\.min\.css">\r?\n'
    r'<link rel="stylesheet" href="/assets/tailwind\.min\.css" media="print" onload="this\.media=\'all\'">\r?\n'
    r'<noscript><link rel="stylesheet" href="/assets/tailwind\.min\.css"></noscript>\r?\n'
)
TAILWIND_1LINE = re.compile(
    r'<link rel="stylesheet" href="/assets/tailwind\.min\.css">\r?\n'
)

THEME_3LINE = re.compile(
    r'<link rel="preload" as="style" href="/assets/theme\.css\?v=2">\r?\n'
    r'<link rel="stylesheet" href="/assets/theme\.css\?v=2" media="print" onload="this\.media=\'all\'">\r?\n'
    r'<noscript><link rel="stylesheet" href="/assets/theme\.css\?v=2"></noscript>\r?\n'
)
THEME_2LINE_ONLOAD = re.compile(
    r'<link rel="preload" as="style" href="/assets/theme\.css\?v=2" onload="this\.onload=null;this\.rel=\'stylesheet\'">\r?\n'
    r'<noscript><link rel="stylesheet" href="/assets/theme\.css\?v=2"></noscript>\r?\n'
)
THEME_1LINE = re.compile(
    r'<link rel="stylesheet" href="/assets/theme\.css\?v=2">\r?\n'
)

NEW_BLOCK_PRELOAD_SWAP = (
    '<link rel="preload" as="style" href="{0}">\n'
    '<link rel="stylesheet" href="{0}" media="print" onload="this.media=\'all\'">\n'
    '<noscript><link rel="stylesheet" href="{0}"></noscript>\n'
).format(NEW_CSS_PATH)

NEW_BLOCK_RENDER_BLOCKING = f'<link rel="stylesheet" href="{NEW_CSS_PATH}">\n'


def find_tailwind_match(html: str):
    """Returns (match, is_render_blocking)."""
    m3 = TAILWIND_3LINE.search(html)
    if m3:
        return m3, False
    m1 = TAILWIND_1LINE.search(html)
    if m1:
        return m1, True
    return None, None


def find_theme_match(html: str):
    return (
        THEME_3LINE.search(html)
        or THEME_2LINE_ONLOAD.search(html)
        or THEME_1LINE.search(html)
    )


def process_file(path: Path, dry_run: bool, is_homepage: bool):
    if not path.exists():
        return "missing"

    html = path.read_text(encoding="utf-8")

    if "site.min.css" in html:
        return "already-merged"

    m_tw, _tw_is_blocking = find_tailwind_match(html)
    m_th = find_theme_match(html)

    if not m_tw or not m_th:
        return "no-match"

    # Only the homepage has an established, deliberate reason to keep the
    # CSS render-blocking (avoids a whole-page CLS regression seen there
    # previously). Every other page is standardized to the non-blocking
    # preload+swap pattern, regardless of whatever mixed/inconsistent
    # pattern it happened to have before.
    new_block = NEW_BLOCK_RENDER_BLOCKING if is_homepage else NEW_BLOCK_PRELOAD_SWAP

    if m_tw.start() < m_th.start():
        new_html = (
            html[: m_tw.start()]
            + new_block
            + html[m_tw.end() : m_th.start()]
            + html[m_th.end() :]
        )
    else:
        # theme block appears before tailwind block (unexpected order) —
        # remove theme block, replace tailwind block.
        new_html = (
            html[: m_th.start()]
            + html[m_th.end() : m_tw.start()]
            + new_block
            + html[m_tw.end() :]
        )

    if not dry_run:
        path.write_text(new_html, encoding="utf-8")

    return "changed"


def main():
    dry_run = "--dry-run" in sys.argv

    sitemap_path = Path(SITEMAP_PATH)
    if not sitemap_path.exists():
        print(f"ERROR: {SITEMAP_PATH} not found in the current folder.")
        print("Run this script from your repo root (same folder as sitemap.xml).")
        sys.exit(1)

    tree = ET.parse(sitemap_path)
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locs = [el.text.strip() for el in tree.findall(".//sm:loc", ns) if el.text]

    if not locs:
        # namespace-less fallback
        locs = [el.text.strip() for el in tree.findall(".//loc") if el.text]

    print(f"Found {len(locs)} URLs in {SITEMAP_PATH}")
    if dry_run:
        print("*** DRY RUN — no files will be modified ***\n")

    results = {"changed": [], "already-merged": [], "no-match": [], "missing": []}

    for url in locs:
        fpath = url_to_filepath(url)
        url_path = re.sub(r"^https?://[^/]+", "", url).strip("/")
        is_homepage = url_path == ""
        status = process_file(fpath, dry_run, is_homepage)
        results[status].append(str(fpath))

    print(f"\nChanged:        {len(results['changed'])}")
    print(f"Already merged: {len(results['already-merged'])}")
    print(f"No pattern match (needs manual check): {len(results['no-match'])}")
    print(f"Missing file:   {len(results['missing'])}")

    if results["no-match"]:
        print("\n--- Files with no matching CSS-link pattern (check manually) ---")
        for p in results["no-match"]:
            print(" ", p)

    if results["missing"]:
        print("\n--- Files listed in sitemap but not found on disk ---")
        for p in results["missing"]:
            print(" ", p)

    if dry_run:
        print("\nRe-run without --dry-run to actually apply these changes.")


if __name__ == "__main__":
    main()
