#!/usr/bin/env python3
"""
fix_hero_typing_color.py
---------------------------
Fixes the invisible-text bug: adds `color:#d4af37;` as a plain CSS
rule inside the existing `.hero-typing{...}` block (works regardless
of whether the site's Tailwind CSS is a static pre-built file, unlike
the `text-[#d4af37]` arbitrary-value class, which silently does
nothing on a non-JIT build).

Run this on ALL html files AND on theme.css.
Safe to re-run (skips files/blocks that already have the color rule).

USAGE
-----
    python fix_hero_typing_color.py "**\\*.html" "*.html" "assets/theme.css"
"""
import sys
import re
import glob

HERO_TYPING_RULE_RE = re.compile(r'\.hero-typing\{\s*display:inline-flex;')


def process(path):
    try:
        with open(path, encoding='utf-8') as f:
            text = f.read()
    except OSError as e:
        print(f"ERROR {path}: could not read file ({e})")
        return

    if '.hero-typing{' not in text:
        print(f"SKIP  {path} (no .hero-typing CSS rule found)")
        return

    if 'color:#d4af37' in text:
        print(f"SKIP  {path} (color already set)")
        return

    m = HERO_TYPING_RULE_RE.search(text)
    if not m:
        print(f"WARN  {path}: .hero-typing{{ rule not found in expected form — not changed")
        return

    insert_at = m.end()
    text = text[:insert_at] + '\n    color:#d4af37;' + text[insert_at:]

    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f"DONE  {path}")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    seen = set()
    paths = []
    for arg in sys.argv[1:]:
        matches = glob.glob(arg, recursive=True)
        if matches:
            for m in matches:
                if m not in seen:
                    seen.add(m)
                    paths.append(m)
        else:
            paths.append(arg)

    if not paths:
        print(f"No files matched: {' '.join(sys.argv[1:])}")
        sys.exit(1)

    for p in paths:
        process(p)
