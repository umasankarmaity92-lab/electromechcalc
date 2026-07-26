import re
import glob

PATTERN = re.compile(
    r'<div class="max-w-3xl mx-auto px-4 py-14 text-center relative z-10">\s*'
    r'<div class="mx-auto mb-3" style="width:340px;max-width:80%;aspect-ratio:800/450;overflow:hidden;margin-top:-28px;">\s*'
    r'<div id="hero-lottie" style="width:100%;aspect-ratio:800/600;transform:translateY\(-15%\);"></div>\s*'
    r'</div>\s*'
    r'<span class="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-(?P<color>[a-z]+-\d+) bg-(?P=color)/10 border border-(?P=color)/30 px-3 py-1\.5 rounded-full mb-5">\s*'
    r'<span class="w-1\.5 h-1\.5 bg-(?P=color) rounded-full"></span>\s*'
    r'(?P<badge>.*?)\s*'
    r'</span>\s*'
    r'<h1 class="text-3xl md:text-4xl font-display font-bold text-white leading-tight mb-3">\s*'
    r'(?P<title>.*?)\s*'
    r'</h1>\s*'
    r'<p class="text-gray-400 text-sm max-w-xl mx-auto">\s*'
    r'(?P<subtext>.*?)\s*'
    r'</p>\s*'
    r'</div>',
    re.DOTALL
)

def build_replacement(m):
    color = m.group("color")
    badge = m.group("badge")
    title = m.group("title")
    subtext = m.group("subtext")
    return f'''<div class="max-w-5xl mx-auto px-4 py-14 relative z-10">
    <div class="flex flex-col lg:flex-row items-center gap-6 lg:gap-10">

      <div class="flex-1 text-center lg:text-left order-2 lg:order-1">
        <span class="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-{color} bg-{color}/10 border border-{color}/30 px-3 py-1.5 rounded-full mb-5">
          <span class="w-1.5 h-1.5 bg-{color} rounded-full"></span>
          {badge}
        </span>
        <h1 class="text-3xl md:text-4xl font-display font-bold text-white leading-tight mb-3">
          {title}
        </h1>
        <p class="text-gray-400 text-sm max-w-xl mx-auto lg:mx-0">
          {subtext}
        </p>
      </div>

      <div class="flex-shrink-0 order-1 lg:order-2" style="width:280px;max-width:65%;aspect-ratio:800/450;overflow:hidden;">
        <div id="hero-lottie" style="width:100%;aspect-ratio:800/600;transform:translateY(-15%);"></div>
      </div>

    </div>
  </div>'''

def main():
    html_files = sorted(glob.glob("*.html"))
    updated, skipped = [], []
    for filename in html_files:
        with open(filename, "r", encoding="utf-8") as f:
            content = f.read()
        new_content, count = PATTERN.subn(build_replacement, content)
        if count == 0:
            skipped.append(filename)
            continue
        with open(filename, "w", encoding="utf-8") as f:
            f.write(new_content)
        updated.append(filename)
    print(f"\nUpdated ({len(updated)}):")
    for f in updated:
        print(f"   {f}")
    print(f"\nSkipped - no match found ({len(skipped)}):")
    for f in skipped:
        print(f"   {f}")

if __name__ == "__main__":
    main()
