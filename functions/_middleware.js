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
  const kicker = isGeneral ? "You Might Also Need" : "You Might Also Need";
  const heading = isGeneral ? "Related Pages" : "Related Calculators";

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
  const breadcrumbHTML = buildBreadcrumbHTML(url.pathname, searchIndex);

  return new HTMLRewriter()
    .on("head", new PrependToHead())
    .on("#site-header", new InjectHTML(headerHTML))
    .on("#site-header", new InsertAfter('<main id="main-content">'))
    .on("#breadcrumb", new InjectHTML(breadcrumbHTML))
    .on("#site-footer", new InsertBefore(relatedHTML))
    .on("#site-footer", new InsertBefore("</main>"))
    .on("#site-footer", new InjectHTML(footerHTML))
    .transform(response);
}
