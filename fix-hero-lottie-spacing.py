"""
fix-hero-lottie-spacing.py

Pulls the hero Lottie animation box upward (closer to the breadcrumb),
closing the extra gap caused by the hero section's top padding (py-14).
Safe to re-run — only replaces the exact old style string, so running
it twice has no extra effect.

Usage:
    python fix-hero-lottie-spacing.py
    (or: py fix-hero-lottie-spacing.py)

Run this from your project root.
"""

import glob

OLD = '<div class="mx-auto mb-3" style="width:150px;max-width:50%;aspect-ratio:800/450;overflow:hidden;">'
NEW = '<div class="mx-auto mb-3" style="width:150px;max-width:50%;aspect-ratio:800/450;overflow:hidden;margin-top:-28px;">'

def main():
    html_files = sorted(glob.glob("*.html"))
    updated, skipped = [], []

    for filename in html_files:
        with open(filename, "r", encoding="utf-8") as f:
            content = f.read()

        if OLD not in content:
            skipped.append(filename)
            continue

        content = content.replace(OLD, NEW)
        with open(filename, "w", encoding="utf-8") as f:
            f.write(content)
        updated.append(filename)

    print(f"\nUpdated ({len(updated)}):")
    for f in updated:
        print(f"   {f}")

    print(f"\nSkipped - no match found ({len(skipped)}):")
    for f in skipped:
        print(f"   {f}")

if __name__ == "__main__":
    main()
