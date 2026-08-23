// functions/_middleware.js
// Injects partials/header.html into <div id="site-header"></div>
// and partials/footer.html into <div id="site-footer"></div>
// on every HTML response, at the edge, before it reaches the browser.
//
// Edit partials/header.html or partials/footer.html and every page
// that uses <div id="site-header"></div> / <div id="site-footer"></div>
// updates automatically — no per-page copy-paste needed.
//
// ALSO injects a "Related Calculators" section right before
// <div id="site-footer"></div> on any page whose URL matches an
// entry in /search-index.json. Because #site-footer already exists
// on every page, this needs ZERO per-page edits — add/remove/re-tag
// a calculator in search-index.json and every page's related-widget
// updates automatically.
//
// ALSO injects an "Explore More Categories" section (4 category-hub
// cards: Electrical / Mechanical / Financial / Blog & Guides) right
// after the Related Calculators widget, before <div id="site-footer">
// — same gating as Related Calculators (indexed pages only, never on
// the homepage or General/company pages). This replaces what used to
// be a hand-duplicated block inside every calculator/blog HTML file,
// which is exactly how it drifted (some pages had 3 cards, missing
// "Blog & Guides"). Any page with old leftover
// <section id="explore-more"> / id="exploreCategoriesSection"> markup
// of its own must have that block deleted, or the section renders
// twice.
//
// ALSO injects a breadcrumb (Home / Category / Page Title) into
// <div id="breadcrumb"></div>, sourced from the same
// /search-index.json entry — zero per-page edits here either.
// Renders nothing on the homepage or on pages missing from the
// index (so the empty placeholder div just collapses).
//
// ALSO wraps everything between #site-header and #site-footer in a
// <main> landmark (opened right after #site-header, closed right
// before #site-footer, so breadcrumb + page content + Related
// Calculators all end up inside it). Fixes the "Document does not
// have a main landmark" accessibility error site-wide — zero
// per-page edits needed here either.

class InjectHTML {
  constructor(html) {
    this.html = html;
  }
  element(element) {
    element.setInnerContent(this.html, { html: true });
  }
}

// Replaces the placeholder element ITSELF (tag + all) with the given
// html, instead of injecting content INSIDE it. Required for
// #site-header: header.html's root <header class="site-header"
// id="siteHeader"> uses position:sticky, but sticky only has room to
// "stick" if its containing block (the nearest block ancestor) is
// taller than the sticky element. setInnerContent() left the sticky
// <header> nested inside <div id="site-header">, whose height
// shrink-wraps to exactly the header's own height (no overflow/height
// of its own) — so the sticky element had zero extra room to move
// within its parent and behaved as if position:static, scrolling away
// immediately. Replacing the placeholder div outright removes that
// shrink-wrapped wrapper, so <header id="siteHeader"> sits directly
// under its real ancestor (with the full page height below it) and
// position:sticky has room to work.
class ReplaceWithHTML {
  constructor(html) {
    this.html = html;
  }
  element(element) {
    element.replace(this.html, { html: true });
  }
}

// Inserts HTML immediately BEFORE the matched element (used to place
// the Related Calculators section right above the footer, without
// needing a dedicated placeholder div on every page).
class InsertBefore {
  constructor(html) {
    this.html = html;
  }
  element(element) {
    if (this.html) {
      element.before(this.html, { html: true });
    }
  }
}

// Inserts HTML immediately AFTER the matched element (used to open the
// <main> landmark right after #site-header, and to close it right
// before #site-footer via InsertBefore above). Fixes the Lighthouse/
// axe "Document does not have a main landmark" accessibility error
// on every page with zero per-page edits — same pattern as the
// Related Calculators / breadcrumb widgets above.
class InsertAfter {
  constructor(html) {
    this.html = html;
  }
  element(element) {
    if (this.html) {
      element.after(this.html, { html: true });
    }
  }
}

// Appended to the very start of <head>, before any CSS loads. Sets
// dark/light on <html> synchronously (render-blocking, by design) so
// the correct theme is painted on the very first frame. Without this,
// site-nav.js only applies the theme class on DOMContentLoaded, so a
// user with a saved or OS "dark" preference sees a flash of the light
// theme on every single page load before JS catches up. Mirrors the
// same localStorage key / matchMedia fallback that site-nav.js uses.
const EARLY_THEME_SCRIPT = `<script>(function(){try{var t=localStorage.getItem("emc-theme")||(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark-theme":"light-theme");var r=document.documentElement;r.classList.remove("dark-theme","light-theme");r.classList.add(t);}catch(e){}})();</script>`;

class PrependToHead {
  element(element) {
    element.prepend(EARLY_THEME_SCRIPT, { html: true });
  }
}

// ---------------------------------------------------------------------
// Site-wide calculator UX (border, auto-scroll-to-result, shared JS).
// Targets the same class/attribute patterns every calculator page's
// template already emits, so this needs ZERO per-page edits — add a
// new calculator with the same template and it picks these up
// automatically. If a page's markup drifts from the template (e.g. a
// custom layout), it simply won't match and is left untouched.
// ---------------------------------------------------------------------

// <script src="/assets/common.js"> (holds scrollToResult()) — appended
// once to <head> on every page. `defer` means load order relative to
// other head tags doesn't matter.
const COMMON_JS_TAG = '<script src="/assets/common.js" defer></script>';
class AppendCommonScriptToHead {
  element(element) {
    element.append(COMMON_JS_TAG, { html: true });
  }
}

// Calculator input panel: adds .calc-input-panel (border color rule
// lives in theme.css) without disturbing any existing classes.
class AddCalcInputPanelClass {
  element(element) {
    const cls = element.getAttribute("class") || "";
    if (!cls.includes("calc-input-panel")) {
      element.setAttribute("class", `${cls} calc-input-panel`.trim());
    }
  }
}

// Result panel: tags it with id="resultPanel" (if not already set) so
// scrollToResult() in common.js has something to scroll to.
class AddResultPanelId {
  element(element) {
    if (!element.getAttribute("id")) {
      element.setAttribute("id", "resultPanel");
    }
  }
}

// Calculate button: appends a scrollToResult() call onto whatever
// calculateXxx() the button already runs, e.g.
//   onclick="calculateEMI()"  ->  onclick="calculateEMI(); scrollToResult();"
// Idempotent — skips buttons that already call scrollToResult (e.g.
// pages that were hand-edited before this middleware rule existed).
class AddScrollToResultOnClick {
  element(element) {
    const onclick = element.getAttribute("onclick") || "";
    if (onclick && !onclick.includes("scrollToResult")) {
      element.setAttribute("onclick", `${onclick.trim().replace(/;\s*$/, "")}; scrollToResult();`);
    }
  }
}


// Share Result button: rewrites onclick="openShareModal()" (baked into
// the calculator template) to onclick="loadShareModal()" — the lazy
// loader in common.js that fetches /assets/share-modal.js on first
// click instead of shipping the modal's DOM/JS to every page load.
// Zero per-page edits needed; idempotent (only touches buttons that
// still say openShareModal).
class RewriteShareButtonOnClick {
  element(element) {
    const onclick = element.getAttribute("onclick") || "";
    if (onclick.includes("openShareModal")) {
      element.setAttribute("onclick", onclick.replace(/openShareModal\(\)/g, "loadShareModal()"));
    }
  }
}

// Normalizes a URL path for matching against search-index.json entries.
// Strips leading/trailing slashes AND the .html extension, and folds
// "/index" down to "/", so that:
//   - Cloudflare Pages' live request pathname (which has .html
//     stripped by its automatic clean-URL redirect, e.g. "/apfc")
//   - search-index.json entries (stored with .html, e.g. "/apfc.html")
// both normalize to the same value ("/apfc") and match correctly.
function normalizePath(p) {
  let s = "/" + String(p).replace(/^\/+/, "").replace(/\/+$/, "");
  s = s.replace(/\.html$/i, "");
  if (s === "" || s === "/index") s = "/";
  return s;
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Builds the Related Calculators HTML block for the current page.
// Returns "" (nothing gets injected) if the current URL isn't a
// calculator page in search-index.json.
function buildRelatedCalculatorsHTML(pathname, index) {
  if (!Array.isArray(index) || !index.length) return "";

  // Normalize: "/transformer-size.html" style matching, tolerant of
  // trailing slash / missing leading slash differences in the index,
  // AND tolerant of Cloudflare Pages stripping the .html extension
  // from the live request URL (search-index.json still stores the
  // .html form, so without this the two never match).
  const currentPath = normalizePath(pathname);

  const current = index.find((entry) => normalizePath(entry.url) === currentPath);
  if (!current) return ""; // Not a calculator page — don't inject anything.

  const MAX_ITEMS = 4;

  // Prefer same-category calculators first, then fill remaining
  // slots from other categories so the widget always has content
  // even for categories with very few calculators.
  const sameCategory = index.filter(
    (e) => e !== current && e.category === current.category
  );
  const others = index.filter(
    (e) => e !== current && e.category !== current.category
  );

  const picks = [...sameCategory, ...others].slice(0, MAX_ITEMS);
  if (!picks.length) return "";

  const cards = picks
    .map(
      (e) => `
      <a href="${escapeHTML(e.url)}" class="calc-card related-calc-card rounded-xl shadow-sm p-5 flex flex-col gap-2">
        <h3 class="font-display font-semibold text-sm related-calc-title">${escapeHTML(e.title)}</h3>
        <span class="text-xs related-calc-category">${escapeHTML(e.category || "")}</span>
      </a>`
    )
    .join("");

  const isGeneral = current.category === "General";
  const isBlog = current.category === "Blog";
  const kicker = "You Might Also Need";
  const heading = isGeneral ? "Related Pages" : isBlog ? "Related Blog" : "Related Calculators";

  return `
<section class="related-calc-section max-w-6xl mx-auto px-4 py-12">
  <div class="flex items-end justify-between flex-wrap gap-3 border-b related-calc-header pb-4 mb-8">
    <div>
      <span class="block font-mono text-xs uppercase tracking-wider text-sky-600 mb-1">${kicker}</span>
      <h2 class="text-xl md:text-2xl font-display font-bold related-calc-heading">${heading}</h2>
    </div>
  </div>
  <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4">${cards}
  </div>
</section>`;
}

// ---------------------------------------------------------------------
// "Explore More Categories" — 4 category-hub cards (Electrical /
// Mechanical / Financial / Blog & Guides). Previously hand-duplicated
// into every individual calculator/blog HTML file (as
// <section id="explore-more">...</section> or, on some blog pages,
// id="exploreCategoriesSection") — which is exactly how it drifted
// out of sync (some pages had 3 cards, missing "Blog & Guides").
// Centralizing it here means every page updates from one place.
//
// Gated the same way as buildRelatedCalculatorsHTML above (only
// renders for a URL that's actually in search-index.json, and never
// on the homepage) PLUS skips "General" pages (About/Contact/Privacy/
// Terms/Disclaimer) since this section was never shown there even
// before it became middleware-driven.
//
// id="explore-more" is kept identical to the existing calculator-page
// markup on purpose: any page whose own <style> block still has
// "body.dark-theme #explore-more a.calc-card { ... }" keeps working
// with zero changes there. (The dark-theme rule for this section also
// now lives in theme.css directly — see the .result-tile note there
// for the same reasoning — so that per-page rule is now redundant but
// harmless if left in place.)
//
// IMPORTANT — avoiding a double-render bug: any page that still has
// its OLD hardcoded <section id="explore-more"> (or
// id="exploreCategoriesSection") markup in its own HTML will now show
// the section TWICE — once from that leftover markup, once injected
// here. That old per-page block must be deleted from every file that
// has one before/when this middleware change goes live.
// ---------------------------------------------------------------------
function buildExploreMoreHTML(pathname, index) {
  if (!Array.isArray(index) || !index.length) return "";

  const currentPath = normalizePath(pathname);
  if (currentPath === "/") return ""; // homepage — never had this section

  const current = index.find((entry) => normalizePath(entry.url) === currentPath);
  if (!current) return ""; // not an indexed page (e.g. a 404) — nothing to inject
  if (current.category === "General") return ""; // About/Contact/Privacy/etc. never had this section

  return `
<section id="explore-more" class="max-w-6xl mx-auto px-4 pb-16">
  <h2 class="font-display font-semibold text-brandDark text-xl mb-5">Explore More Categories</h2>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
    <a href="/electrical-calculators" class="calc-card border border-gray-200 rounded-2xl bg-white p-6 flex flex-col items-start gap-2.5">
      <div class="w-11 h-11 rounded-lg flex items-center justify-center" style="background:#e0f2fe">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>
      </div>
      <h3 class="font-display font-semibold text-brandDark">Electrical Calculators</h3>
      <p class="text-sm text-gray-500">Cable size, transformer size, motor current, DG size, solar sizing &amp; more.</p>
      <span class="text-sky-600 text-sm font-medium mt-auto">Browse all &rarr;</span>
    </a>
    <a href="/mechanical-calculators" class="calc-card border border-gray-200 rounded-2xl bg-white p-6 flex flex-col items-start gap-2.5">
      <div class="w-11 h-11 rounded-lg flex items-center justify-center" style="background:#fef3c7">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      </div>
      <h3 class="font-display font-semibold text-brandDark">Mechanical Calculators</h3>
      <p class="text-sm text-gray-500">Belt length, bearing life, cooling tower efficiency &amp; more.</p>
      <span class="text-sky-600 text-sm font-medium mt-auto">Browse all &rarr;</span>
    </a>
    <a href="/financial-calculators" class="calc-card border border-gray-200 rounded-2xl bg-white p-6 flex flex-col items-start gap-2.5">
      <div class="w-11 h-11 rounded-lg flex items-center justify-center" style="background:#dcfce7">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      </div>
      <h3 class="font-display font-semibold text-brandDark">Financial Calculators</h3>
      <p class="text-sm text-gray-500">EPF, PPF, SIP, gratuity, income tax, CAGR &amp; more.</p>
      <span class="text-sky-600 text-sm font-medium mt-auto">Browse all &rarr;</span>
    </a>
    <a href="/blog-guides" class="calc-card border border-gray-200 rounded-2xl bg-white p-6 flex flex-col items-start gap-2.5">
      <div class="w-11 h-11 rounded-lg flex items-center justify-center" style="background:rgba(167,139,250,0.15)">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <h3 class="font-display font-semibold text-brandDark">Blog &amp; Guides</h3>
      <p class="text-sm text-gray-500">Maintenance guides &amp; engineering articles.</p>
      <span class="text-sky-600 text-sm font-medium mt-auto">Browse all &rarr;</span>
    </a>
  </div>
</section>`;
}

// Builds the breadcrumb HTML block for the current page from the
// same /search-index.json used by search and Related Calculators.
// Returns "" (nothing gets injected, div stays empty) for:
//   - the homepage (/ or /index.html)
//   - any URL not found in search-index.json (e.g. a 404)
function buildBreadcrumbHTML(pathname, index) {
  if (!Array.isArray(index) || !index.length) return "";

  const currentPath = normalizePath(pathname);

  if (currentPath === "/") return ""; // homepage — normalizePath already folds "/index.html" to "/"

  const current = index.find((entry) => normalizePath(entry.url) === currentPath);
  if (!current) return "";

  const crumbs = [`<a href="/" class="breadcrumb-home">Home</a>`];

  // "General" pages (About, Contact, Privacy, etc.) skip the category
  // segment since it isn't a real nav dropdown — go straight to the
  // page title.
  if (current.category && current.category !== "General") {
    crumbs.push(
      `<span class="breadcrumb-sep">&rarr;</span><span class="breadcrumb-category">${escapeHTML(current.category)}</span>`
    );
  }

  crumbs.push(
    `<span class="breadcrumb-sep">&rarr;</span><span class="breadcrumb-current">${escapeHTML(current.title)}</span>`
  );

  return `<!-- BREADCRUMB_BUILD_v2 --><nav class="breadcrumb-nav" aria-label="Breadcrumb">${crumbs.join("")}</nav>`;
}

// ---------------------------------------------------------------------
// Header nav dropdown links (Electrical / Mechanical / Finance) — both
// the desktop dropdown panels and the mobile accordion sublinks are
// built here from search-index.json, numbered in the curated order
// defined in nav-order.json. Any calculator not yet listed in
// nav-order.json still shows up (appended alphabetically, before the
// featured item) so a brand-new page is never silently missing from
// the nav — just add it to nav-order.json later to control its exact
// position.
// ---------------------------------------------------------------------

const PRO_STAR_SVG = `<svg class="pro-star-icon" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="display:inline;vertical-align:-1px;margin-right:2px"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.2 21 12 17.4 5.8 21 7 14.14l-5-4.87 7.1-1.01L12 2z"/></svg>`;

function orderedEntriesForCategory(categoryName, index, navOrder) {
  const cfg = (navOrder && navOrder[categoryName]) || { order: [], featured: null };
  const entries = index.filter((e) => e.category === categoryName && e.url !== cfg.featured);
  const byUrl = new Map(entries.map((e) => [e.url, e]));

  const orderedUrls = cfg.order.filter((u) => byUrl.has(u));
  const extraUrls = [...byUrl.keys()]
    .filter((u) => !orderedUrls.includes(u))
    .sort((a, b) => byUrl.get(a).title.localeCompare(byUrl.get(b).title));

  const mainEntries = [...orderedUrls, ...extraUrls].map((u) => byUrl.get(u));
  const featuredEntry = cfg.featured ? index.find((e) => e.url === cfg.featured && e.category === categoryName) : null;

  return { mainEntries, featuredEntry };
}

function buildDesktopNavLinksHTML(categoryName, index, navOrder) {
  if (!Array.isArray(index) || !index.length) return "";
  const { mainEntries, featuredEntry } = orderedEntriesForCategory(categoryName, index, navOrder);

  let html = mainEntries
    .map((e, i) => `<a href="${escapeHTML(e.url)}" class="nav-dropdown-link">${i + 1}. ${escapeHTML(e.title)}</a>`)
    .join("");

  if (featuredEntry) {
    const n = mainEntries.length + 1;
    html += `<div class="border-t border-[var(--border)] mt-1 pt-1"><a href="${escapeHTML(featuredEntry.url)}" class="nav-dropdown-link text-amber-500 font-semibold">${PRO_STAR_SVG} ${n}. ${escapeHTML(featuredEntry.title)}</a></div>`;
  }
  return html;
}

function buildMobileNavLinksHTML(categoryName, index, navOrder) {
  if (!Array.isArray(index) || !index.length) return "";
  const { mainEntries, featuredEntry } = orderedEntriesForCategory(categoryName, index, navOrder);

  let html = mainEntries
    .map((e, i) => `<a href="${escapeHTML(e.url)}" class="mobile-sublink">${i + 1}. ${escapeHTML(e.title)}</a>`)
    .join("");

  if (featuredEntry) {
    const n = mainEntries.length + 1;
    html += `<a href="${escapeHTML(featuredEntry.url)}" class="mobile-sublink text-amber-400 font-semibold">${PRO_STAR_SVG} ${n}. ${escapeHTML(featuredEntry.title)}</a>`;
  }
  return html;
}

// Fetches any /*.json asset (search-index.json, nav-order.json, ...)
// through Cloudflare's edge Cache API so that, within a given edge
// location, each file is fetched and parsed from ASSETS at most once
// every CACHE_TTL_SECONDS instead of on every single HTML request.
// Falls back to a direct ASSETS fetch (uncached) if caches.default
// isn't available for some reason (e.g. certain local dev environments).
async function getCachedJSON(context, origin, assetPath, ttlSeconds) {
  const assetURL = new URL(assetPath, origin);

  const fetchFresh = () => context.env.ASSETS.fetch(new Request(assetURL.toString()));

  if (typeof caches === "undefined" || !caches.default) {
    return fetchFresh();
  }

  const cache = caches.default;
  const cacheKey = new Request(assetURL.toString());

  let response = await cache.match(cacheKey);
  if (response) return response;

  response = await fetchFresh();
  if (response.ok) {
    const cached = new Response(response.body, response);
    cached.headers.set("Cache-Control", `s-maxage=${ttlSeconds}`);
    context.waitUntil(cache.put(cacheKey, cached.clone()));
    response = cached;
  }
  return response;
}

const NAV_ORDER_CACHE_TTL_SECONDS = 300; // 5 minutes — same window as search-index.json

// Fetches /search-index.json through Cloudflare's edge Cache API so
// that, within a given edge location, the ~500-page index is fetched
// and parsed from ASSETS at most once every CACHE_TTL_SECONDS instead
// of on every single HTML request. Falls back to a direct ASSETS
// fetch (uncached) if caches.default isn't available for some reason
// (e.g. certain local dev environments). Superseded by the generic
// getCachedJSON() helper above (used for both search-index.json and
// nav-order.json) — kept as a thin wrapper so nothing else has to change.
const SEARCH_INDEX_CACHE_TTL_SECONDS = 300; // 5 minutes

function getSearchIndexResponse(context, origin) {
  return getCachedJSON(context, origin, "/search-index.json", SEARCH_INDEX_CACHE_TTL_SECONDS);
}

export async function onRequest(context) {
  const response = await context.next();

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    return response;
  }

  const url = new URL(context.request.url);

  const [headerRes, footerRes, searchIndexRes, navOrderRes] = await Promise.all([
    context.env.ASSETS.fetch(new URL("/partials/header.html", url.origin)),
    context.env.ASSETS.fetch(new URL("/partials/footer.html", url.origin)),
    getSearchIndexResponse(context, url.origin),
    getCachedJSON(context, url.origin, "/nav-order.json", NAV_ORDER_CACHE_TTL_SECONDS),
  ]);

  // If the partial fetch itself failed (404/500/etc.), don't inject its
  // error-page body as if it were real header/footer markup — fall
  // back to empty string so the rest of the page still renders.
  let [headerHTML, footerHTML] = await Promise.all([
    headerRes.ok ? headerRes.text() : Promise.resolve(""),
    footerRes.ok ? footerRes.text() : Promise.resolve(""),
  ]);

  let searchIndex = [];
  try {
    if (searchIndexRes.ok) {
      searchIndex = await searchIndexRes.json();
    }
  } catch (err) {
    // If the index is missing/malformed, just skip the related-widget
    // for this request rather than breaking the whole page.
    searchIndex = [];
  }

  let navOrder = {};
  try {
    if (navOrderRes.ok) {
      navOrder = await navOrderRes.json();
    }
  } catch (err) {
    // Missing/malformed nav-order.json just means every category falls
    // back to alphabetical order with no featured item — not a reason
    // to break the header.
    navOrder = {};
  }

  // Splice the numbered nav dropdown links into header.html's own
  // placeholder divs BEFORE header.html is handed to InjectHTML below —
  // plain string substitution here avoids depending on whether
  // HTMLRewriter re-scans content that was itself just inserted via
  // setInnerContent (desktop panel + mobile accordion, x3 categories).
  if (headerHTML) {
    const navFills = [
      ["nav-links-electrical", buildDesktopNavLinksHTML("Electrical", searchIndex, navOrder)],
      ["nav-links-mechanical", buildDesktopNavLinksHTML("Mechanical", searchIndex, navOrder)],
      ["nav-links-finance", buildDesktopNavLinksHTML("Financial", searchIndex, navOrder)],
      ["mobile-links-electrical", buildMobileNavLinksHTML("Electrical", searchIndex, navOrder)],
      ["mobile-links-mechanical", buildMobileNavLinksHTML("Mechanical", searchIndex, navOrder)],
      ["mobile-links-finance", buildMobileNavLinksHTML("Financial", searchIndex, navOrder)],
    ];
    for (const [id, html] of navFills) {
      headerHTML = headerHTML.replace(`id="${id}"></div>`, `id="${id}">${html}</div>`);
    }
  }

  const relatedHTML = buildRelatedCalculatorsHTML(url.pathname, searchIndex);
  const exploreMoreHTML = buildExploreMoreHTML(url.pathname, searchIndex);
  const breadcrumbHTML = buildBreadcrumbHTML(url.pathname, searchIndex);

  return new HTMLRewriter()
    .on("head", new PrependToHead())
    .on("head", new AppendCommonScriptToHead())
    .on('div[class*="lg:col-span-3"][class*="border-gray-100"]', new AddCalcInputPanelClass())
    .on('div[class*="lg:col-span-2"][class*="flex-col"][class*="gap-4"]', new AddResultPanelId())
    .on('button[onclick^="calculate"]', new AddScrollToResultOnClick())
    .on('button.share-result-btn[onclick*="openShareModal"]', new RewriteShareButtonOnClick())
    .on("#site-header", new ReplaceWithHTML(headerHTML))
    .on("#site-header", new InsertAfter('<main id="main-content">'))
    .on("#breadcrumb", new InjectHTML(breadcrumbHTML))
    .on("#site-footer", new InsertBefore(relatedHTML))
    .on("#site-footer", new InsertBefore(exploreMoreHTML))
    .on("#site-footer", new InsertBefore("</main>"))
    .on("#site-footer", new InjectHTML(footerHTML))
    .transform(response);
}
