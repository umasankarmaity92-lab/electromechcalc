"""
apply-perf-fixes.py

Bulk-applies the same head-level performance fixes made to index.html
across every other HTML page in the project:

  1. <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
  2. <link rel="preload" as="fetch" href="/assets/electromechcalc-hero.json" crossorigin>
     (only on pages that actually contain a #hero-lottie element)
  3. Converts the blocking theme.css <link rel="stylesheet"> into the
     non-blocking preload + media=print swap pattern (with noscript
     fallback), matching what fonts already do.
  4. Inserts a lightweight static SVG poster inside any EMPTY
     #hero-lottie div, so something paints before Lottie's JS takes
     over (site-nav.js already clears it before loadAnimation()).

Idempotent: safe to re-run — every step checks for its own marker
before inserting, so already-patched files and already-populated
hero-lottie divs are left untouched.

Usage:
    py apply-perf-fixes.py

Run this from your project root (same folder as your *.html files).
"""

import glob
import re

CDNJS_PRECONNECT = '<link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>'
HERO_JSON_PRELOAD = '<link rel="preload" as="fetch" href="/assets/electromechcalc-hero.json" crossorigin>'

THEME_CSS_BLOCKING_RE = re.compile(r'<link rel="stylesheet" href="/assets/theme\.css">\r?\n?')

THEME_CSS_ASYNC = (
    '<link rel="preload" as="style" href="/assets/theme.css">\r\n'
    '<link rel="stylesheet" href="/assets/theme.css" media="print" onload="this.media=\'all\'">\r\n'
    '<noscript><link rel="stylesheet" href="/assets/theme.css"></noscript>\r\n'
)

HERO_POSTER_SVG = (
    '\r\n          <svg viewBox="0 0 800 600" width="100%" height="100%" role="img" '
    'aria-label="ElectroMechCalc" style="opacity:.9">\r\n'
    '            <circle cx="400" cy="300" r="120" fill="none" stroke="#38bdf8" '
    'stroke-width="3" opacity="0.35"/>\r\n'
    '            <path d="M420 190 340 330h60l-20 90 110-140h-60l30-90z" '
    'fill="#f59e0b" opacity="0.85"/>\r\n'
    '          </svg>\r\n        '
)

HERO_DIV_EMPTY_RE = re.compile(r'(<div id="hero-lottie"[^>]*>)(\s*)(</div>)')

# Anchor point to insert the two new preconnect/preload lines after —
# whichever appears first in the file.
INSERT_AFTER_CANDIDATES = [
    re.compile(r'<link rel="preconnect" href="https://fonts\.gstatic\.com"[^>]*>\r?\n?'),
    re.compile(r'<link rel="stylesheet" href="/assets/tailwind\.min\.css">\r?\n?'),
]


def add_preconnect_and_preload(html, has_hero_lottie):
    if CDNJS_PRECONNECT in html and (not has_hero_lottie or HERO_JSON_PRELOAD in html):
        return html  # already patched

    lines_to_insert = ""
    if CDNJS_PRECONNECT not in html:
        lines_to_insert += CDNJS_PRECONNECT + "\r\n"
    if has_hero_lottie and HERO_JSON_PRELOAD not in html:
        lines_to_insert += HERO_JSON_PRELOAD + "\r\n"

    if not lines_to_insert:
        return html

    for pattern in INSERT_AFTER_CANDIDATES:
        m = pattern.search(html)
        if m:
            insert_at = m.end()
            return html[:insert_at] + lines_to_insert + html[insert_at:]

    # Fallback: no anchor found, insert right after <head>
    return html.replace("<head>", "<head>\r\n" + lines_to_insert, 1)


def make_theme_css_async(html):
    if 'href="/assets/theme.css" media="print"' in html:
        return html  # already patched
    return THEME_CSS_BLOCKING_RE.sub(THEME_CSS_ASYNC, html, count=1)


def add_hero_poster(html):
    def repl(m):
        return m.group(1) + HERO_POSTER_SVG + m.group(3)
    return HERO_DIV_EMPTY_RE.sub(repl, html, count=1)


def process_file(path):
    with open(path, "r", encoding="utf-8", newline="") as f:
        original = f.read()

    has_hero_lottie = 'id="hero-lottie"' in original

    html = original
    html = add_preconnect_and_preload(html, has_hero_lottie)
    html = make_theme_css_async(html)
    if has_hero_lottie:
        html = add_hero_poster(html)

    if html != original:
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(html)
        return True
    return False


def main():
    html_files = sorted(glob.glob("*.html"))
    # index.html was already hand-patched — skip so we don't touch its
    # already-customized head.
    html_files = [f for f in html_files if f != "index.html"]

    updated, skipped = [], []
    for filename in html_files:
        if process_file(filename):
            updated.append(filename)
        else:
            skipped.append(filename)

    print(f"\nUpdated ({len(updated)}):")
    for f in updated:
        print(f"   {f}")

    print(f"\nSkipped - already up to date / no match ({len(skipped)}):")
    for f in skipped:
        print(f"   {f}")


if __name__ == "__main__":
    main()
