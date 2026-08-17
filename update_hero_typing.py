#!/usr/bin/env python3
"""
update_hero_typing.py
----------------------
Updates the EXISTING "hero typing" animation (already inserted by
add_hero_typing.py) in one or more ElectroMechCalc page HTML files to
the new boxed / bold / new-text version.

Safe to re-run: if a file has already been updated to the new version
(detected via the "hero-typing-box" class), it is skipped.

USAGE
-----
    python update_hero_typing.py "**\\*.html" "*.html"
"""
import sys
import re
import glob

OLD_HTML = '''
    <p class="hero-typing text-sky-400 text-sm font-mono mb-2 justify-center" aria-label="WWW.ElectroMechCalc.com Engineering Calculators">
      <span id="heroTypingText">WWW.ElectroMechCalc.com</span><span class="hero-cursor" aria-hidden="true"></span>
    </p>
'''

NEW_HTML = '''
    <div class="hero-typing-box">
      <p class="hero-typing text-sky-400 text-sm font-mono font-bold justify-center" aria-label="Calculate Smarter. Work Faster. Practical Calculators & Maintenance Guides.">
        <span id="heroTypingText"></span><span class="hero-cursor" aria-hidden="true"></span>
      </p>
    </div>
'''

OLD_CSS = '''
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

NEW_CSS = '''
  .hero-typing-box{
    display:flex;
    align-items:center;
    justify-content:center;
    min-height:2.75em;
    max-width:640px;
    margin:0 auto 0.5rem;
    padding:0.4rem 1rem;
    box-sizing:border-box;
  }
  .hero-typing{
    display:inline-flex;
    align-items:center;
    justify-content:center;
    text-align:center;
    white-space:normal;
    word-break:break-word;
    line-height:1.3;
    margin:0;
  }
  .hero-cursor{
    display:inline-block;
    width:2px;
    height:1em;
    margin-left:4px;
    flex-shrink:0;
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

WORDS_RE = re.compile(r'const words = \[.*?\];', re.DOTALL)
NEW_WORDS = (
    'const words = [\n'
    '    "Calculate Smarter. Work Faster.",\n'
    '    "Practical Calculators & Maintenance Guides."\n'
    '  ];'
)


def process(path):
    try:
        with open(path, encoding='utf-8') as f:
            html = f.read()
    except OSError as e:
        print(f"ERROR {path}: could not read file ({e})")
        return

    if 'heroTypingText' not in html:
        print(f"SKIP  {path} (no typing animation found — run add_hero_typing.py first)")
        return

    if 'hero-typing-box' in html:
        print(f"SKIP  {path} (already updated to the new boxed version)")
        return

    changed = False

    if OLD_HTML in html:
        html = html.replace(OLD_HTML, NEW_HTML)
        changed = True
    else:
        print(f"WARN  {path}: old HTML block not found in expected exact form — HTML not updated")

    if OLD_CSS in html:
        html = html.replace(OLD_CSS, NEW_CSS)
        changed = True
    else:
        print(f"WARN  {path}: old CSS block not found in expected exact form — CSS not updated")

    if WORDS_RE.search(html):
        html = WORDS_RE.sub(NEW_WORDS, html, count=1)
        changed = True
    else:
        print(f"WARN  {path}: 'const words = [...]' not found — JS words not updated")

    if not changed:
        print(f"SKIP  {path} (nothing matched to update)")
        return

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
