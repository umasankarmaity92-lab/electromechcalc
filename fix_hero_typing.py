#!/usr/bin/env python3
"""
fix_hero_typing.py
--------------------
Finishes/fixes the hero-typing update on files where update_hero_typing.py
only partially matched (WARN on HTML or CSS). Checks the HTML, CSS, and
JS parts INDEPENDENTLY, so it is safe to run on every file, including
ones already fully updated (those parts are left untouched).

USAGE
-----
    python fix_hero_typing.py "**\\*.html" "*.html"
"""
import sys
import re
import glob

NEW_HTML_BLOCK = '''<div class="hero-typing-box">
      <p class="hero-typing text-sky-400 text-sm font-mono font-bold justify-center" aria-label="Calculate Smarter. Work Faster. Practical Calculators & Maintenance Guides.">
        <span id="heroTypingText"></span><span class="hero-cursor" aria-hidden="true"></span>
      </p>
    </div>'''

P_RE = re.compile(r'<p class="hero-typing[^"]*"[^>]*>.*?</p>', re.DOTALL)

OLD_CSS_RE = re.compile(
    r'\.hero-typing\{[^}]*\}\s*'
    r'\.hero-cursor\{[^}]*\}\s*'
    r'@keyframes heroCursorBlink\{[^}]*\}\s*'
    r'@media \(prefers-reduced-motion: reduce\)\{[^}]*\}',
    re.DOTALL
)

NEW_CSS_BLOCK = '''.hero-typing-box{
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
  }'''

WORDS_RE = re.compile(r'const words = \[.*?\];', re.DOTALL)
NEW_WORDS = (
    'const words = [\n'
    '    "Calculate Smarter. Work Faster.",\n'
    '    "Practical Calculators & Maintenance Guides."\n'
    '  ];'
)


def fix_html(html):
    m = P_RE.search(html)
    if not m:
        return html, None  # no <p class="hero-typing..."> at all
    preceding = html[max(0, m.start() - 80):m.start()]
    if 'hero-typing-box' in preceding:
        return html, True  # already correctly wrapped
    html = html[:m.start()] + NEW_HTML_BLOCK + html[m.end():]
    return html, 'fixed'


def fix_css(html):
    if 'word-break:break-word' in html:
        return html, True  # new CSS already present
    m = OLD_CSS_RE.search(html)
    if not m:
        return html, None  # old CSS block not found in any recognizable form
    html = html[:m.start()] + NEW_CSS_BLOCK + html[m.end():]
    return html, 'fixed'


def fix_words(html):
    if 'Calculate Smarter. Work Faster.' in html:
        return html, True  # already correct
    if not WORDS_RE.search(html):
        return html, None
    html = WORDS_RE.sub(NEW_WORDS, html, count=1)
    return html, 'fixed'


def process(path):
    try:
        with open(path, encoding='utf-8') as f:
            html = f.read()
    except OSError as e:
        print(f"ERROR {path}: could not read file ({e})")
        return

    if 'heroTypingText' not in html:
        print(f"SKIP  {path} (no typing animation found)")
        return

    changed = False
    notes = []

    html, r = fix_html(html)
    if r == 'fixed':
        changed = True
    elif r is None:
        notes.append("HTML: no <p class=\"hero-typing...\"> found")

    html, r = fix_css(html)
    if r == 'fixed':
        changed = True
    elif r is None:
        notes.append("CSS: old block not found in any recognizable form")

    html, r = fix_words(html)
    if r == 'fixed':
        changed = True
    elif r is None:
        notes.append("JS: 'const words = [...]' not found")

    if changed:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"FIXED {path}" + (f"  (still needs manual check: {'; '.join(notes)})" if notes else ""))
    elif notes:
        print(f"WARN  {path}: {'; '.join(notes)}")
    else:
        print(f"OK    {path} (already fully up to date)")


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
