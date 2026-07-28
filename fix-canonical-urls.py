"""
fix-canonical-urls.py

Site-wide migration to extensionless "clean" URLs (Cloudflare Pages
already 308-redirects /foo.html -> /foo, so every page's own
canonical/og:url/JSON-LD AND every internal <a href="..."> must
describe the URL that's actually served, not the source filename, or
Google logs "Page with redirect" / wastes crawl budget following a
redirect on every internal link it finds).

For every *.html file in the project root, strips ".html" from:
  1. <link rel="canonical" href="...">
  2. <meta property="og:url" content="...">
  3. Any JSON-LD "url": "..." or "item": "..." field
     (BreadcrumbList entries, WebPage/Article url, publisher url, etc.)
  4. Any relative internal link: href="/some-page.html" — e.g. "see
     also" links inside guide/FAQ content, related-calculator cards
     hardcoded directly in a page instead of coming from the shared
     search-index.json / header / footer.

Only touches www.electromechcalc.com-style internal paths — never
touches /partials/header.html or /partials/footer.html (literal
file-fetch paths used by _middleware.js, not page routes, and must
keep their .html extension), and never touches external domains.

Idempotent: safe to re-run — files with no matching pattern are just
skipped, already-fixed files are left untouched.

Usage:
    py fix-canonical-urls.py

Run this from your project root (same folder as your *.html files).
"""

import glob
import re

# 1) Absolute:  https://www.electromechcalc.com/some-path.html
# 2) Relative:  href="/some-path.html"  (only inside an href="..." attribute,
#    so we never touch script/link src paths like /assets/foo.html by
#    accident — those never occur on this site anyway, but this keeps
#    the match scoped to actual page links)
ABSOLUTE_PATTERN = re.compile(
    r'(https://www\.electromechcalc\.com)/(?!partials/)([a-zA-Z0-9\-]+)\.html\b'
)
RELATIVE_HREF_PATTERN = re.compile(
    r'''(href=["'])(?!/partials/)/([a-zA-Z0-9\-]+)\.html(#[^"']*|\?[^"']*)?(["'])'''
)


def fix_urls(html):
    def repl_absolute(m):
        domain, slug = m.group(1), m.group(2)
        if slug == "index":
            return domain + "/"
        return f"{domain}/{slug}"

    def repl_relative(m):
        prefix, slug, tail, suffix = m.group(1), m.group(2), m.group(3) or "", m.group(4)
        if slug == "index":
            return f'{prefix}/{tail}{suffix}'
        return f'{prefix}/{slug}{tail}{suffix}'

    html = ABSOLUTE_PATTERN.sub(repl_absolute, html)
    html = RELATIVE_HREF_PATTERN.sub(repl_relative, html)
    return html


def process_file(path):
    with open(path, "r", encoding="utf-8", newline="") as f:
        original = f.read()

    fixed = fix_urls(original)

    if fixed != original:
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(fixed)
        return True
    return False


def main():
    html_files = sorted(glob.glob("*.html"))
    updated, skipped = [], []

    for filename in html_files:
        if process_file(filename):
            updated.append(filename)
        else:
            skipped.append(filename)

    print(f"\n✅ Updated ({len(updated)}):")
    for f in updated:
        print(f"   {f}")

    print(f"\n⏭️  Skipped - no .html canonical/og:url/JSON-LD URL found ({len(skipped)}):")
    for f in skipped:
        print(f"   {f}")


if __name__ == "__main__":
    main()
