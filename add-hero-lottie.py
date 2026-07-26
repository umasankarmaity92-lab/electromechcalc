"""
add-hero-lottie.py

Adds the small hero Lottie animation container to every calculator page's
[PER-PAGE] HERO section, so the animation (loaded centrally by
site-nav.js) shows on every page. Safe to re-run — skips any file that
already has the container or doesn't match the expected hero markup
(e.g. index.html, about.html, which use a different/no hero layout).

Usage:
    python add-hero-lottie.py

Run this from your project root (C:\\Users\\user\\Documents\\GitHub\\electromechcalc).
Requires site-nav.js and index.html to already be updated with the
centralized Lottie loader (see chat) before running this.
"""

import os
import glob

ANCHOR = '<div class="max-w-3xl mx-auto px-4 py-14 text-center relative z-10">'

SNIPPET = ANCHOR + '''
    <div class="mx-auto mb-2" style="width:340px;max-width:80%;aspect-ratio:800/450;overflow:hidden;margin-top:-28px;">
      <div id="hero-lottie" style="width:100%;aspect-ratio:800/600;transform:translateY(-15%);"></div>
    </div>
'''

# Files to always skip — homepage already has its own larger Lottie
# container, and these don't use the calculator hero layout at all.
SKIP_FILES = {
    "index.html", "about.html", "contact.html", "privacy-policy.html",
    "terms.html", "disclaimer.html", "editorial-policy.html",
}

def main():
    html_files = sorted(glob.glob("*.html"))
    updated, skipped_has, skipped_no_anchor, skipped_excluded = [], [], [], []

    for filename in html_files:
        if filename in SKIP_FILES:
            skipped_excluded.append(filename)
            continue

        with open(filename, "r", encoding="utf-8") as f:
            content = f.read()

        if 'id="hero-lottie"' in content:
            skipped_has.append(filename)
            continue

        if ANCHOR not in content:
            skipped_no_anchor.append(filename)
            continue

        content = content.replace(ANCHOR, SNIPPET, 1)
        with open(filename, "w", encoding="utf-8") as f:
            f.write(content)
        updated.append(filename)

    print(f"\n✅ Updated ({len(updated)}):")
    for f in updated:
        print(f"   {f}")

    if skipped_has:
        print(f"\n⏭️  Already had hero-lottie ({len(skipped_has)}):")
        for f in skipped_has:
            print(f"   {f}")

    if skipped_no_anchor:
        print(f"\n⚠️  No matching hero markup found — check manually ({len(skipped_no_anchor)}):")
        for f in skipped_no_anchor:
            print(f"   {f}")

    if skipped_excluded:
        print(f"\n➖ Intentionally skipped ({len(skipped_excluded)}):")
        for f in skipped_excluded:
            print(f"   {f}")

if __name__ == "__main__":
    main()
