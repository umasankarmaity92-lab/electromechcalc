"""
resize-hero-lottie.py

Resizes the hero Lottie animation box on calculator pages to match the
homepage size (340px instead of 150px). Safe to re-run.

Usage:
    py resize-hero-lottie.py

Run this from your project root.
"""

import glob

OLD = 'style="width:150px;max-width:50%;aspect-ratio:800/450;overflow:hidden;margin-top:-28px;"'
NEW = 'style="width:340px;max-width:80%;aspect-ratio:800/450;overflow:hidden;margin-top:-28px;"'

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
