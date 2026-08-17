#!/usr/bin/env python3
"""
set_hero_typing_gold.py
-------------------------
Changes the hero-typing text color from sky-blue to gold on all pages
that already have the animation. Safe to re-run (skips files already
set to gold).

USAGE
-----
    python set_hero_typing_gold.py "**\\*.html" "*.html"
"""
import sys
import re
import glob

OLD_CLASS = 'hero-typing text-sky-400 text-sm font-mono font-bold justify-center'
NEW_CLASS = 'hero-typing text-[#d4af37] text-sm font-mono font-bold justify-center'


def process(path):
    try:
        with open(path, encoding='utf-8') as f:
            html = f.read()
    except OSError as e:
        print(f"ERROR {path}: could not read file ({e})")
        return

    if 'heroTypingText' not in html:
        print(f"SKIP  {path} (no typing animation found)")
        return

    if NEW_CLASS in html:
        print(f"SKIP  {path} (already gold)")
        return

    if OLD_CLASS not in html:
        print(f"WARN  {path}: hero-typing class not found in expected form — not changed")
        return

    html = html.replace(OLD_CLASS, NEW_CLASS)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)
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
