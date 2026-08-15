#!/usr/bin/env python3
"""
add_hero_typing.py
-------------------
Inserts the "WWW.ElectroMechCalc.com / Engineering Calculators" typing
animation right after the page's first <h1>, plus the CSS and JS it
needs, into one or more ElectroMechCalc page HTML files.

Safe to re-run: any file that already contains "heroTypingText" is
skipped automatically, so you can run this over the same folder again
later (e.g. after adding new pages) without creating duplicates.

USAGE
-----
    python3 add_hero_typing.py file1.html file2.html ...
    python3 add_hero_typing.py /path/to/pages/*.html

What it does, per file:
  1. Inserts the animated <p> markup immediately after the first </h1>.
  2. Inserts the .hero-typing / .hero-cursor CSS immediately before the
     LAST </style> in the file (assumes the page's main inline
     stylesheet is the last <style> block — true for all current
     ElectroMechCalc pages, but double-check if a page's structure
     ever changes).
  3. Inserts the typing JS immediately before </body>.

What it deliberately does NOT do:
  - Touch anything if the file has no <h1>, no </style>, or no </body>
    (it will print a WARN line and skip that step, not guess).
  - Re-insert into a file that already has the animation.
  - Modify any file outside the paths you pass it.

After running, spot-check a page or two in a browser (and with
prefers-reduced-motion enabled) before treating the whole batch as done.
"""
import sys
import re
import glob

TYPING_HTML = '''
    <p class="hero-typing text-sky-400 text-sm font-mono mb-2 justify-center" aria-label="WWW.ElectroMechCalc.com Engineering Calculators">
      <span id="heroTypingText">WWW.ElectroMechCalc.com</span><span class="hero-cursor" aria-hidden="true"></span>
    </p>
'''

TYPING_CSS = '''
  .hero-typing{
    display:inline-flex;
    align-items:center;
    min-height:1.2em;
    white-space:nowrap;
  }
  .hero-cursor{
    display:inline-block;
    width:2px;
    height:1em;
    margin-left:4px;
    background:currentColor;
    animation:heroCursorBlink 0.8s steps(1) infinite;
  }
  @keyframes heroCursorBlink{
    50%{ opacity:0; }
  }
  @media (prefers-reduced-motion: reduce){
    .hero-cursor{ animation:none; }
  }
'''

TYPING_JS = '''
<script>
(() => {
  const el = document.getElementById("heroTypingText");
  if (!el) return;
  const words = [
    "WWW.ElectroMechCalc.com",
    "Engineering Calculators"
  ];
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  if (reduceMotion) {
    el.textContent = words[0];
    return;
  }
  let wordIndex = 0;
  let charIndex = words[0].length;
  let deleting = true;
  const typeSpeed = 90;
  const deleteSpeed = 55;
  const pauseAfterTyping = 1800;
  const pauseAfterDeleting = 500;
  function animate() {
    const word = words[wordIndex];
    if (deleting) {
      if (charIndex > 0) {
        charIndex--;
        el.textContent = word.substring(0, charIndex);
        setTimeout(animate, deleteSpeed);
      } else {
        deleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        charIndex = 0;
        setTimeout(animate, pauseAfterDeleting);
      }
    } else {
      const nextWord = words[wordIndex];
      if (charIndex < nextWord.length) {
        charIndex++;
        el.textContent = nextWord.substring(0, charIndex);
        setTimeout(animate, typeSpeed);
      } else {
        deleting = true;
        setTimeout(animate, pauseAfterTyping);
      }
    }
  }
  setTimeout(() => {
    wordIndex = 0;
    charIndex = words[0].length;
    deleting = true;
    animate();
  }, 1500);
})();
</script>
'''


def process(path):
    try:
        with open(path, encoding='utf-8') as f:
            html = f.read()
    except OSError as e:
        print(f"ERROR {path}: could not read file ({e})")
        return

    if 'heroTypingText' in html:
        print(f"SKIP  {path} (already has the typing animation)")
        return

    changed = False

    # 1) HTML — right after the first </h1>
    m = re.search(r'</h1>', html)
    if not m:
        print(f"WARN  {path}: no <h1> found — HTML not inserted")
    else:
        idx = m.end()
        html = html[:idx] + TYPING_HTML + html[idx:]
        changed = True

    # 2) CSS — right before the LAST </style> in the file
    style_positions = [mm.start() for mm in re.finditer(r'</style>', html)]
    if not style_positions:
        print(f"WARN  {path}: no </style> found — CSS not inserted")
    else:
        idx = style_positions[-1]
        html = html[:idx] + TYPING_CSS + html[idx:]
        changed = True

    # 3) JS — right before </body>
    m = re.search(r'</body>', html)
    if not m:
        print(f"WARN  {path}: no </body> found — JS not inserted")
    else:
        idx = m.start()
        html = html[:idx] + TYPING_JS + html[idx:]
        changed = True

    if not changed:
        print(f"SKIP  {path} (nothing to insert)")
        return

    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"DONE  {path}")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    # Expand wildcards ourselves — Windows' cmd.exe does NOT expand
    # *.html before handing it to the program (unlike bash), so without
    # this, a literal "*.html" gets passed straight to open() and fails.
    # recursive=True also lets "**/*.html" reach into subfolders — a
    # plain "*.html" still matches root-level files only, same as before.
    paths = []
    for arg in sys.argv[1:]:
        matches = glob.glob(arg, recursive=True)
        if matches:
            paths.extend(matches)
        else:
            # No wildcard match — could be a plain filename, pass it
            # through as-is so process() can report a clear error.
            paths.append(arg)

    if not paths:
        print(f"No files matched: {' '.join(sys.argv[1:])}")
        sys.exit(1)

    for p in paths:
        process(p)
