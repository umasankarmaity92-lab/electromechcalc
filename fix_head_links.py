#!/usr/bin/env python3
"""
ElectroMechCalc — head link normaliser
======================================

Fixes two site-wide issues found in the browser console audit:

1. "preloaded but not used" warnings — caused by the 3-link pattern
   (preload + media="print" swap + noscript) used for site.min.css and
   Google Fonts. The browser never credits the preload, so it is pure
   overhead.

2. Google Fonts loaded from two different URLs across the site
   (display=swap on older pages, display=optional on index.html), so the
   font stylesheet is downloaded again when a visitor moves between
   pages instead of being served from cache.

After this script every page matches the index.html pattern:

    <link rel="stylesheet" href="/assets/site.min.css?v=1">
    <link rel="preload" as="style" href="...&display=optional"
          onload="this.onload=null;this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="...&display=optional"></noscript>

No URL is added or removed — only duplicate <link> tags for the same URL
are dropped, and display=swap becomes display=optional.

USAGE (run from anywhere; pass your repo folder):

    python3 fix_head_links.py "C:\\Users\\user\\Documents\\GitHub\\electromechcalc"            # dry run, changes nothing
    python3 fix_head_links.py "C:\\Users\\user\\Documents\\GitHub\\electromechcalc" --apply    # writes the files

Options:
    --apply     actually write the files (default is dry run)
    --backup    also write a .bak copy of every changed file
    --quiet     only print the summary

Line endings, indentation and everything else in the file are preserved.
Check the result with `git diff` before committing.
"""

import argparse
import os
import re
import sys

# Only version-control / dependency folders are skipped — every other
# folder and sub-folder in the repo is scanned.
SKIP_DIRS = {'.git', 'node_modules'}

# A <link ...> tag, optionally wrapped in <noscript>...</noscript>
LINK_RE = re.compile(
    r'(?:[ \t]*<noscript>\s*<link\b[^>]*>\s*</noscript>)|(?:[ \t]*<link\b[^>]*>)',
    re.IGNORECASE)

FONT_URL_RE = re.compile(r'https://fonts\.googleapis\.com/css2\?[^"\']+')


COMMENT_RE = re.compile(r'<!--.*?-->', re.DOTALL)
SCRIPT_RE = re.compile(r'<script\b.*?</script>|<textarea\b.*?</textarea>', re.DOTALL | re.IGNORECASE)


def attr(tag, name):
    m = re.search(r'\b' + name + r'\s*=\s*"([^"]*)"', tag, re.I)
    if not m:
        m = re.search(r"\b" + name + r"\s*=\s*'([^']*)'", tag, re.I)
    return m.group(1) if m else None


def dead_zones(text):
    """Ranges that must never be edited: HTML comments, scripts, textareas."""
    zones = [m.span() for m in COMMENT_RE.finditer(text)]
    zones += [m.span() for m in SCRIPT_RE.finditer(text)]
    return zones


def in_dead_zone(pos, zones):
    return any(a <= pos < b for a, b in zones)


def find_group(text, needle):
    """All live link tags (with their positions) whose href contains `needle`.

    Tags inside HTML comments, <script> or <textarea> are ignored — editing
    those would either do nothing or, worse, leave the only surviving link
    commented out.
    """
    zones = dead_zones(text)
    out = []
    for m in LINK_RE.finditer(text):
        if in_dead_zone(m.start(), zones):
            continue
        tag = m.group(0)
        href = attr(tag, 'href')
        if href and needle in href:
            out.append((m.start(), m.end(), tag, href))
    return out


def replace_span(text, start, end, new):
    return text[:start] + new + text[end:]


def fix_css(text, report):
    """Collapse the site.min.css trio into one synchronous stylesheet link."""
    group = find_group(text, 'site.min.css')
    if not group:
        return text, False
    if len(group) == 1 and 'media="print"' not in group[0][2].lower() \
            and 'preload' not in group[0][2].lower():
        return text, False                      # already correct (index.html)

    href = group[0][3]
    indent = re.match(r'[ \t]*', group[0][2]).group(0)
    keep = indent + '<link rel="stylesheet" href="%s">' % href

    # Remove from the last match backwards so earlier offsets stay valid
    for i, (s, e, tag, _h) in enumerate(reversed(group)):
        if i == len(group) - 1:                 # the first tag in the file
            text = replace_span(text, s, e, keep)
        else:
            # also swallow the newline that followed the removed tag
            nl = len(text[e:e + 2]) - len(text[e:e + 2].lstrip('\r\n'))
            text = replace_span(text, s, e + nl, '')
    report.append('css: %d link tags -> 1 synchronous stylesheet' % len(group))
    return text, True


def fix_fonts(text, report):
    """One self-swapping preload + noscript fallback, always display=optional."""
    group = find_group(text, 'fonts.googleapis.com/css2')
    if not group:
        return text, False

    href = FONT_URL_RE.search(group[0][3])
    if not href:
        return text, False
    url = href.group(0).replace('display=swap', 'display=optional')
    if 'display=' not in url:
        url += '&display=optional'
    swapped = 'display=swap' in group[0][3]

    indent = re.match(r'[ \t]*', group[0][2]).group(0)
    nl = '\r\n' if '\r\n' in text else '\n'
    keep = (indent + '<link rel="preload" as="style" href="%s" '
            'onload="this.onload=null;this.rel=\'stylesheet\'">' % url + nl +
            indent + '<noscript><link rel="stylesheet" href="%s"></noscript>' % url)

    already = (len(group) == 2 and 'onload' in group[0][2] and not swapped)
    if already:
        return text, False

    for i, (s, e, tag, _h) in enumerate(reversed(group)):
        if i == len(group) - 1:
            text = replace_span(text, s, e, keep)
        else:
            n = len(text[e:e + 2]) - len(text[e:e + 2].lstrip('\r\n'))
            text = replace_span(text, s, e + n, '')
    report.append('fonts: %d link tags -> preload+noscript%s'
                  % (len(group), ', display=swap -> optional' if swapped else ''))
    return text, True


def process(path, apply_changes, backup, quiet):
    with open(path, 'r', encoding='utf-8', newline='') as f:
        original = f.read()
    if 'site.min.css' not in original and 'fonts.googleapis.com' not in original:
        return None

    report = []
    text, c1 = fix_css(original, report)
    text, c2 = fix_fonts(text, report)
    if not (c1 or c2) or text == original:
        return None

    # Safety: the set of URLs on the page must not change
    def urls(t):
        live = COMMENT_RE.sub(' ', t)
        return sorted(set(re.findall(r'href="([^"]*)"', live)
                          + re.findall(r"href='([^']*)'", live)))
    before, after = urls(original), urls(text)
    before_norm = sorted(set(u.replace('display=swap', 'display=optional') for u in before))
    if before_norm != sorted(set(after)):
        print('  !! SKIPPED (url set would change): %s' % path)
        return None

    if apply_changes:
        if backup:
            with open(path + '.bak', 'w', encoding='utf-8', newline='') as f:
                f.write(original)
        with open(path, 'w', encoding='utf-8', newline='') as f:
            f.write(text)
    if not quiet:
        print('  %s' % os.path.relpath(path))
        for line in report:
            print('      - %s' % line)
    return report


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('root', help='path to the electromechcalc repo folder')
    ap.add_argument('--apply', action='store_true', help='write the files (default: dry run)')
    ap.add_argument('--backup', action='store_true', help='keep a .bak copy of each changed file')
    ap.add_argument('--quiet', action='store_true')
    args = ap.parse_args()

    if not os.path.isdir(args.root):
        sys.exit('Not a folder: %s' % args.root)

    print('Mode: %s' % ('APPLY (files will be written)' if args.apply else 'DRY RUN (nothing written)'))
    print('Root: %s\n' % os.path.abspath(args.root))

    changed = scanned = 0
    per_folder = {}
    for dirpath, dirnames, filenames in os.walk(args.root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        dirnames.sort()
        for name in sorted(filenames):
            if not name.lower().endswith(('.html', '.htm')):
                continue
            scanned += 1
            folder = os.path.relpath(dirpath, args.root)
            stat = per_folder.setdefault(folder, [0, 0])
            stat[0] += 1
            if process(os.path.join(dirpath, name), args.apply, args.backup, args.quiet):
                changed += 1
                stat[1] += 1

    print('\n----------------------------------------')
    print('PER FOLDER (scanned / %s)' % ('changed' if args.apply else 'to change'))
    for folder in sorted(per_folder):
        n, c = per_folder[folder]
        print('   %-42s %4d / %d' % (folder if folder != '.' else '(root)', n, c))
    print('----------------------------------------')
    print('Folders with HTML  : %d' % len(per_folder))
    print('HTML files scanned : %d' % scanned)
    print('Files %s : %d' % ('changed' if args.apply else 'that would change', changed))
    if not args.apply:
        print('\nRun again with --apply to write the changes.')
    else:
        print('\nCheck with: git diff')


if __name__ == '__main__':
    main()
