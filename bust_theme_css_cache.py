#!/usr/bin/env python3
"""
bust_theme_css_cache.py
--------------------------
Adds (or bumps) a "?v=" cache-busting query string on every reference
to /assets/theme.css across all HTML files, so browsers/CDNs are
forced to fetch the latest CSS instead of serving a stale cached copy.

USAGE
-----
    python bust_theme_css_cache.py 2 "**\\*.html" "*.html"
    (first argument is the version number to set, e.g. 2, 3, 4 ...)
"""
import sys
import re
import glob

VERSIONED_RE = re.compile(r'/assets/theme\.css(\?v=\d+)?')


def process(path, version):
    try:
        with open(path, encoding='utf-8') as f:
            html = f.read()
    except OSError as e:
        print(f"ERROR {path}: could not read file ({e})")
        return

    if '/assets/theme.css' not in html:
        print(f"SKIP  {path} (no theme.css reference)")
        return

    new_html, count = VERSIONED_RE.subn(f'/assets/theme.css?v={version}', html)
    if count == 0:
        print(f"SKIP  {path} (nothing matched)")
        return

    if new_html == html:
        print(f"SKIP  {path} (already at v={version})")
        return

    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_html)
    print(f"DONE  {path} ({count} reference(s) updated)")


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    version = sys.argv[1]
    seen = set()
    paths = []
    for arg in sys.argv[2:]:
        matches = glob.glob(arg, recursive=True)
        if matches:
            for m in matches:
                if m not in seen:
                    seen.add(m)
                    paths.append(m)
        else:
            paths.append(arg)

    if not paths:
        print(f"No files matched: {' '.join(sys.argv[2:])}")
        sys.exit(1)

    for p in paths:
        process(p, version)
