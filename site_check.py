#!/usr/bin/env python3
# ElectroMechCalc pre-AdSense URL hygiene check (stdlib only)
# Run:  py site_check.py      -> writes site_check_report.txt
import re, time, urllib.request, urllib.error, urllib.parse, xml.etree.ElementTree as ET
from collections import Counter

BASE = "https://www.electromechcalc.com"
UA = {"User-Agent": "Mozilla/5.0 (EMC-site-check)"}
out = []
def log(s=""): print(s); out.append(s)

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k): return None
opener = urllib.request.build_opener(NoRedirect)

def get(url):
    """Returns (status, location, body) without following redirects."""
    req = urllib.request.Request(url, headers=UA)
    try:
        r = opener.open(req, timeout=20)
        return r.status, r.headers.get("Location"), r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace") if e.code < 300 or e.code >= 400 else ""
        return e.code, e.headers.get("Location"), body
    except Exception as e:
        return None, None, str(e)

def canon(html):
    m = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]*href=["\']([^"\']+)', html, re.I)
    return m.group(1) if m else None

def noindex(html):
    return bool(re.search(r'<meta[^>]+name=["\']robots["\'][^>]+noindex', html, re.I))

# 1. robots.txt
log("=== 1. robots.txt ===")
st, _, body = get(BASE + "/robots.txt")
log(f"status {st}"); log(body.strip()); log()

# 2. sitemap
log("=== 2. sitemap.xml ===")
st, _, body = get(BASE + "/sitemap.xml")
log(f"status {st}")
locs = [e.text.strip() for e in ET.fromstring(body).iter() if e.tag.endswith("loc")] if st == 200 else []
log(f"URLs in sitemap: {len(locs)}")
dups = [u for u, c in Counter(locs).items() if c > 1]
if dups: log(f"!! duplicate sitemap entries: {dups}")
for u in locs:
    if u.endswith(".html"): log(f"!! .html URL in sitemap: {u}")
    if not u.startswith(BASE): log(f"!! non-www / wrong host in sitemap: {u}")
    if "template" in u.lower(): log(f"!! template URL in sitemap: {u}")
cats = Counter(urllib.parse.urlparse(u).path.strip("/").split("/")[0] for u in locs if u.count("/") > 3)
log(f"Per-folder counts (compare with homepage/hub numbers): {dict(cats)}"); log()

# 3. every sitemap URL: 200, self-canonical, indexable
log("=== 3. Sitemap URL checks ===")
internal = set()
for u in locs:
    st, loc, html = get(u)
    issues = []
    if st != 200: issues.append(f"status {st}" + (f" -> {loc}" if loc else ""))
    else:
        c = canon(html)
        if c is None: issues.append("no canonical")
        elif c.rstrip("/") != u.rstrip("/"): issues.append(f"canonical mismatch: {c}")
        if noindex(html): issues.append("noindex but in sitemap")
        if not re.search(r"<title>\s*\S", html, re.I): issues.append("empty/missing <title>")
        for h in re.findall(r'href=["\'](/[^"\'#?]*)', html):
            if not h.startswith(("/assets/", "/cdn-cgi/")) and not re.search(r"\.(png|webp|jpg|svg|css|js|json|ico|xml|txt)$", h):
                internal.add(h)
    log(f"{'OK ' if not issues else '!! '} {u}" + ("" if not issues else "  -> " + "; ".join(issues)))
    time.sleep(0.3)
log()

# 4. internal links not in sitemap / broken
log("=== 4. Internal links (from page HTML) ===")
paths_in_sitemap = {urllib.parse.urlparse(u).path.rstrip("/") or "/" for u in locs}
for h in sorted(internal):
    p = h.rstrip("/") or "/"
    st, loc, _ = get(BASE + h)
    flag = ""
    if st != 200: flag = f"status {st}" + (f" -> {loc}" if loc else "")
    elif p not in paths_in_sitemap: flag = "200 but NOT in sitemap"
    if h.endswith(".html"): flag = (flag + "; " if flag else "") + "link uses .html"
    if flag: log(f"!!  {h}  -> {flag}")
    time.sleep(0.2)
log()

# 5. probes
log("=== 5. Probes ===")
probes = ["/master-template", "/master-template.html", "/this-page-should-not-exist-123",
          "/electrical", "/mechanical", "/financial", "/index.html"]
if locs:
    sample = urllib.parse.urlparse(locs[min(5, len(locs) - 1)]).path
    if sample != "/": probes.append(sample + ".html")
for p in probes:
    st, loc, html = get(BASE + p)
    note = ""
    if "template" in p and st == 200: note = "!! template publicly served" + (" (noindex present)" if noindex(html) else " AND indexable")
    elif p.endswith(".html") and st not in (301, 308): note = "!! .html variant not redirecting"
    elif "not-exist" in p and st != 404: note = "!! unknown URL does not return 404"
    log(f"{p:40} status {st}" + (f" -> {loc}" if loc else "") + (f"   {note}" if note else ""))

open("site_check_report.txt", "w", encoding="utf-8").write("\n".join(out))
print("\nSaved: site_check_report.txt")
