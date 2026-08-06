"""
fix-bare-html-links.py

Companion to fix-canonical-urls.py. That script rewrites the
LEADING-SLASH relative form:  href="/some-page.html"
This script rewrites the BARE relative form (no leading slash), which
fix-canonical-urls.py's RELATIVE_HREF_PATTERN does not match at all:
    href="about.html"
    href="mechanical-calculators.html"
    href="dg-size.html#faq"

Why this matters (same reasoning as fix-canonical-urls.py):
Cloudflare Pages already 308-redirects /foo.html -> /foo, so every
internal <a href="..."> should point straight at the clean URL Google
actually indexes. A bare "slug.html" link still resolves correctly in
the browser (relative to the current page), but every click and every
crawl still pays for one extra redirect hop, and at scale that's what
shows up in Search Console as "Page with redirect" / wasted crawl
budget. As of this run this pattern was found in 55 files / 126 links
site-wide (about.html, editorial-policy.html, contact.html,
privacy-policy.html, terms.html, disclaimer.html, and — the larger
share — related-calculator / category links like
mechanical-calculators.html, dg-size.html, motor-current.html, etc.).

Converts:
    href="about.html"            -> href="/about"
    href="index.html"            -> href="/"
    href="dg-size.html#faq"      -> href="/dg-size#faq"
    href="cable-size.html?x=1"   -> href="/cable-size?x=1"

Does NOT touch:
    - Absolute URLs (https://..., http://...)
    - Already-absolute internal links (/some-page.html) — that's
      fix-canonical-urls.py's job; run both, order doesn't matter.
    - Anchor-only links (href="#faq")
    - mailto:, tel:, javascript: links
    - /partials/header.html, /partials/footer.html style fetch paths
      (never appear as bare hrefs on this site, but excluded to be safe)
    - Any non-href attribute (src, action, etc.)

Idempotent: safe to re-run — already-fixed files are left untouched.
Recursive: walks into category subfolders too (mechanical/, electrical/,
etc. — e.g. mechanical/belt-speed.html), same as build-search-index.js's
walk(), skipping the same non-page directories (node_modules, .git,
partials, functions, assets, .wrangler, dist, build).

Usage:
    py fix-bare-html-links.py

Run this from your project root (the folder that directly contains
index.html and your category subfolders like /mechanical/, /electrical/).
"""

import os
import re

# Directories that never contain real pages — skip entirely.
# Mirrors build-search-index.js's EXCLUDED_DIRS so this script covers
# exactly the same file set that produces search-index.json.
EXCLUDED_DIRS = {
    "node_modules", ".git", "partials", "functions", "assets",
    ".wrangler", "dist", "build",
}

# href="slug.html"  or  href="slug.html#frag"  or  href="slug.html?q=1"
# or  href="category/slug.html"  (e.g. mechanical/belt-speed.html).
# Segments: letters/digits/hyphens, optionally one subfolder level, no
# leading slash, no "://". Excludes partials/ (literal fetch paths used
# by _middleware.js, not page routes).
BARE_HREF_PATTERN = re.compile(
    r'''(href=["'])(?!partials/)([a-zA-Z0-9\-]+(?:/[a-zA-Z0-9\-]+)*)\.html(#[^"']*|\?[^"']*)?(["'])'''
)


def fix_urls(html):
    def repl(m):
        prefix, slug, tail, suffix = m.group(1), m.group(2), m.group(3) or "", m.group(4)
        if slug == "index":
            return f'{prefix}/{tail}{suffix}'
        return f'{prefix}/{slug}{tail}{suffix}'

    return BARE_HREF_PATTERN.sub(repl, html)


def process_file(path):
    with open(path, "r", encoding="utf-8", newline="") as f:
        original = f.read()

    fixed = fix_urls(original)

    if fixed != original:
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(fixed)
        # Count how many links changed in this file, for the report.
        before = BARE_HREF_PATTERN.findall(original)
        return True, len(before)
    return False, 0


def find_html_files(root="."):
    found = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDED_DIRS]
        for name in filenames:
            if name.endswith(".html"):
                rel = os.path.relpath(os.path.join(dirpath, name), root)
                found.append(rel.replace(os.sep, "/"))
    return sorted(found)


def main():
    html_files = find_html_files(".")
    updated, skipped = [], []
    total_links = 0

    for filename in html_files:
        changed, count = process_file(filename)
        if changed:
            updated.append((filename, count))
            total_links += count
        else:
            skipped.append(filename)

    print(f"\n✅ Updated ({len(updated)} files, {total_links} links):")
    for f, count in updated:
        print(f"   {f}  ({count} link{'s' if count != 1 else ''})")

    print(f"\n⏭️  Skipped - no bare .html link found ({len(skipped)}):")
    for f in skipped:
        print(f"   {f}")


if __name__ == "__main__":
    main()
