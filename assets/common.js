// Shared header-aware scroll used by everything below — scrolls so
// `el`'s top sits just under the sticky site header, instead of the
// browser default which puts it flush at the very top edge (partly
// hidden underneath the header). Measured live so it adapts to any
// header height (mobile vs desktop, menu open/closed).
function scrollToElement(el, smooth){
  if(!el) return;
  const header = document.querySelector('.site-header');
  const headerHeight = header ? header.getBoundingClientRect().height : 0;
  const top = el.getBoundingClientRect().top + window.pageYOffset - headerHeight - 16;
  window.scrollTo({ top: Math.max(top, 0), behavior: smooth ? 'smooth' : 'auto' });
}

// Calculate button -> scroll down to the result panel.
function scrollToResult(){
  scrollToElement(document.getElementById('resultPanel'), true);
}

// Switching between sub-calculators on multi-tool hub pages (Electrical
// Pro Max, Maintenance Pro Cal, etc.) -> scroll up to the calculator's
// input section, since the tool-switch links can live in the sidebar/
// result panel, well below the input panel on mobile.
function scrollToCalculator(){
  scrollToElement(document.getElementById('calculator'), true);
}

// When a link elsewhere on the site points at THIS_PAGE.html#calculator
// (or any other #id), the browser's native anchor jump lands the target
// flush at the very top of the viewport — under the sticky header, same
// problem scrollToElement() solves above. Runs once on load and re-does
// that jump with the header height subtracted. requestAnimationFrame
// gives fonts/hero-lottie one paint to settle so the measured position
// is accurate.
function scrollToHashOnLoad(){
  if (!location.hash) return;
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch (e) { return; }
  const el = document.getElementById(id);
  if (!el) return;
  requestAnimationFrame(() => scrollToElement(el, false));
}
document.addEventListener('DOMContentLoaded', scrollToHashOnLoad);

// Same-page anchor clicks (Table of Contents links, "Jump to FAQ" etc.)
// use the browser's native instant jump by default, which — like the
// two cases above — lands the target flush under the sticky header.
// Delegated click handler intercepts any in-page `<a href="#...">` and
// re-does the jump through scrollToElement() instead. Site-wide via
// common.js, so every calculator's Table of Contents gets this for
// free without a per-page change.
document.addEventListener('click', function(e){
  const a = e.target.closest('a[href^="#"]');
  if(!a) return;
  const id = a.getAttribute('href').slice(1);
  if(!id) return;
  const el = document.getElementById(id);
  if(!el) return;
  e.preventDefault();
  scrollToElement(el, true);
  if (history.pushState) history.pushState(null, '', '#' + id);
});

// ---------------------------------------------------------------------
// Share Result modal loader — the modal's DOM/logic lives in
// /assets/share-modal.js and is NOT part of this file, so pages that
// never open Share pay nothing for it. This loader fetches that file
// once on first click (cached by the browser after that) and then
// opens the modal. Wired to buttons by the middleware, which rewrites
// onclick="openShareModal()" -> onclick="loadShareModal()" at the edge
// (see RewriteShareButtonOnClick in _middleware.js) — no per-page
// template edits needed.
// ---------------------------------------------------------------------
let shareModalLoadPromise = null;
function loadShareModal(){
  if (typeof openShareModal === 'function') { openShareModal(); return; }
  if (!shareModalLoadPromise) {
    shareModalLoadPromise = new Promise(function(resolve, reject){
      const s = document.createElement('script');
      s.src = '/assets/share-modal.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  shareModalLoadPromise.then(function(){ openShareModal(); });
}
