"""
add-copy-exclude-marker.py

Site-wide fix for the Copy Result bug: copyResultGeneric() in common.js
strips any element marked data-copy-exclude before copying #resultPanel's
text — but that marker was only ever added to a handful of pages
(belt-speed.html, master-template.html, thermocouple-voltage.html).
Every other calculator page's Related Calculators card still gets
copied along with the actual result.

Finds the specific div that wraps the "Related Calculators" heading
(matched by the <span> text immediately inside it, not just by class —
several other blocks like "Breakdown" share the exact same div classes,
so a class-only match would tag the wrong element) and adds
data-copy-exclude to that div's opening tag.

Recursive: walks into category subfolders (mechanical/, electrical/,
etc.), same exclusions as build-search-index.js (node_modules, .git,
partials, functions, assets, .wrangler, dist, build).

Idempotent: skips any file where the target div already has
data-copy-exclude.

Usage:
    py add-copy-exclude-marker.py

Run this from your project root (the folder that directly contains
index.html and your category subfolders).
"""

import os
import re

EXCLUDED_DIRS = {
    "node_modules", ".git", "partials", "functions", "assets",
    ".wrangler", "dist", "build",
}

# Matches the Related Calculators wrapper div specifically — requires
# the "Related Calculators" text inside its <span> so it never matches
# other divs sharing the same class list (e.g. the Breakdown card).
# Captures the div's own opening tag so we can insert the attribute
# into THAT tag only.
PATTERN = re.compile(
    r'(<div\s+class="bg-white rounded-xl border border-gray-100 p-4")'
    r'(\s*>\s*<span[^>]*>\s*Related Calculators\s*</span>)',
    re.IGNORECASE,
)

ALREADY_TAGGED_NEAR_RELATED = re.compile(
    r'data-copy-exclude[^>]*>\s*<span[^>]*>\s*Related Calculators\s*</span>',
    re.IGNORECASE,
)


def find_html_files(root="."):
    found = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDED_DIRS]
        for name in filenames:
            if name.endswith(".html"):
                rel = os.path.relpath(os.path.join(dirpath, name), root)
                found.append(rel.replace(os.sep, "/"))
    return sorted(found)


def process_file(path):
    with open(path, "r", encoding="utf-8", newline="") as f:
        original = f.read()

    if ALREADY_TAGGED_NEAR_RELATED.search(original):
        return "already-tagged"

    if not PATTERN.search(original):
        return None  # no Related Calculators block on this page at all

    fixed, count = PATTERN.subn(r'\1 data-copy-exclude\2', original, count=1)

    if fixed != original:
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(fixed)
        return "tagged"
    return "no-change"


def main():
    html_files = find_html_files(".")
    tagged, already, no_block, no_change = [], [], [], []

    for filename in html_files:
        result = process_file(filename)
        if result == "tagged":
            tagged.append(filename)
        elif result == "already-tagged":
            already.append(filename)
        elif result is None:
            no_block.append(filename)
        else:
            no_change.append(filename)

    print(f"\n✅ Tagged ({len(tagged)}):")
    for f in tagged:
        print(f"   {f}")

    print(f"\n⏭️  Already tagged, skipped ({len(already)}):")
    for f in already:
        print(f"   {f}")

    if no_change:
        print(f"\n⚠️  Pattern found but regex didn't apply — check manually ({len(no_change)}):")
        for f in no_change:
            print(f"   {f}")

    print(f"\n(No Related Calculators block found on {len(no_block)} other files — skipped, nothing to do)")


if __name__ == "__main__":
    main()
