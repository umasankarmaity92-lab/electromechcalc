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
  // trailing slash / missing leading slash differences in the index.
  const normalize = (p) => "/" + p.replace(/^\/+/, "").replace(/\/+$/, "");
  const currentPath = normalize(pathname);

  const current = index.find((entry) => normalize(entry.url) === currentPath);
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

  return `
<section class="related-calc-section max-w-6xl mx-auto px-4 py-12">
  <div class="flex items-end justify-between flex-wrap gap-3 border-b related-calc-header pb-4 mb-8">
    <div>
      <span class="block font-mono text-xs uppercase tracking-wider text-sky-600 mb-1">You Might Also Need</span>
      <h2 class="text-xl md:text-2xl font-display font-bold related-calc-heading">Related Calculators</h2>
    </div>
  </div>
  <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4">${cards}
  </div>
</section>`;
}

export async function onRequest(context) {
  const response = await context.next();

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    return response;
  }

  const url = new URL(context.request.url);

  const [headerRes, footerRes, searchIndexRes] = await Promise.all([
    context.env.ASSETS.fetch(new URL("/partials/header.html", url.origin)),
    context.env.ASSETS.fetch(new URL("/partials/footer.html", url.origin)),
    context.env.ASSETS.fetch(new URL("/search-index.json", url.origin)),
  ]);

  // If the partial fetch itself failed (404/500/etc.), don't inject its
  // error-page body as if it were real header/footer markup — fall
  // back to empty string so the rest of the page still renders.
  const [headerHTML, footerHTML] = await Promise.all([
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

  const relatedHTML = buildRelatedCalculatorsHTML(url.pathname, searchIndex);

  return new HTMLRewriter()
    .on("head", new PrependToHead())
    .on("#site-header", new InjectHTML(headerHTML))
    .on("#site-footer", new InsertBefore(relatedHTML))
    .on("#site-footer", new InjectHTML(footerHTML))
    .transform(response);
}
