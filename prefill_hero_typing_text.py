#!/usr/bin/env python3
"""
prefill_hero_typing_text.py
------------------------------
Fixes the "no text shows for the first 1.5s" issue: pre-fills the
heroTypingText span with the first phrase so it's visible immediately
on page load, instead of staying empty until the JS animation kicks in.

Safe to re-run (skips files already pre-filled).

USAGE
-----
    python prefill_hero_typing_text.py "**\\*.html" "*.html"
"""
import sys
import re
import glob

OLD_SPAN = '<span id="heroTypingText"></span>'
NEW_SPAN = '<span id="heroTypingText">Calculate Smarter. Work Faster.</span>'


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

    if NEW_SPAN in html:
        print(f"SKIP  {path} (already pre-filled)")
        return

    if OLD_SPAN not in html:
        print(f"WARN  {path}: empty heroTypingText span not found in expected form — not changed")
        return

    html = html.replace(OLD_SPAN, NEW_SPAN)
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
