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
// Share Result modal — single "Share Result" button opens a modal with
// Share / Embed / Cite tabs, matching the site's calculator pages.
// Modal DOM is built once, lazily, on first open, and reused after that.
// ---------------------------------------------------------------------
function buildShareModal(){
  if (document.getElementById('shareModalOverlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'shareModalOverlay';
  overlay.className = 'share-modal-overlay';
  overlay.innerHTML = `
    <div class="share-modal-box" role="dialog" aria-modal="true" aria-labelledby="shareModalTitle">
      <button class="share-modal-close" aria-label="Close" onclick="closeShareModal()">&times;</button>
      <div class="share-modal-title" id="shareModalTitle">Share Calculator</div>
      <div class="share-modal-subtitle" id="shareModalSubtitle"></div>
      <div class="share-tabs">
        <button class="share-tab active" data-tab="share" onclick="switchShareTab('share')">Share</button>
        <button class="share-tab" data-tab="embed" onclick="switchShareTab('embed')">Embed</button>
        <button class="share-tab" data-tab="cite" onclick="switchShareTab('cite')">Cite</button>
      </div>
      <div class="share-panel active" data-panel="share">
        <label class="share-checkbox-row">
          <input type="checkbox" id="shareIncludeResults" checked>
          Include your current inputs in the link
        </label>
        <div class="share-icons-row">
          <button class="share-icon-item" onclick="shareTo('facebook')" aria-label="Share on Facebook">
            <span class="share-icon-circle" style="background:#1877F2;">f</span>
            <span class="share-icon-label">Facebook</span>
          </button>
          <button class="share-icon-item" onclick="shareTo('x')" aria-label="Share on X">
            <span class="share-icon-circle" style="background:#000;">X</span>
            <span class="share-icon-label">X</span>
          </button>
          <button class="share-icon-item" onclick="shareTo('linkedin')" aria-label="Share on LinkedIn">
            <span class="share-icon-circle" style="background:#0A66C2;">in</span>
            <span class="share-icon-label">LinkedIn</span>
          </button>
          <button class="share-icon-item" onclick="shareTo('whatsapp')" aria-label="Share on WhatsApp">
            <span class="share-icon-circle" style="background:#25D366;">W</span>
            <span class="share-icon-label">WhatsApp</span>
          </button>
        </div>
        <div class="share-link-row">
          <span class="share-link-text" id="shareLinkText"></span>
          <button class="share-copy-btn" onclick="copyShareText('shareLinkText', this)">Copy</button>
        </div>
      </div>
      <div class="share-panel" data-panel="embed">
        <p>Paste this snippet into your page to embed this calculator:</p>
        <div class="share-link-row">
          <span class="share-link-text" id="embedCodeText"></span>
          <button class="share-copy-btn" onclick="copyShareText('embedCodeText', this)">Copy</button>
        </div>
      </div>
      <div class="share-panel" data-panel="cite">
        <p>Cite this calculator:</p>
        <div class="share-link-row">
          <span class="share-link-text" id="citeText"></span>
          <button class="share-copy-btn" onclick="copyShareText('citeText', this)">Copy</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e){ if (e.target === overlay) closeShareModal(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeShareModal(); });
}

// Reads every labeled input/select inside the calculator's input panel
// and serializes it into a query string, so "include current inputs"
// reproduces the exact values the visitor is looking at — not just the
// bare page URL.
function getShareableURL(includeResults){
  const base = window.location.origin + window.location.pathname;
  if (!includeResults) return base;
  const panel = document.querySelector('.calc-input-panel');
  if (!panel) return base;
  const params = new URLSearchParams();
  panel.querySelectorAll('input[id], select[id]').forEach(function(el){
    if (el.type === 'checkbox') { params.set(el.id, el.checked ? '1' : '0'); }
    else { params.set(el.id, el.value); }
  });
  const qs = params.toString();
  return qs ? base + '?' + qs : base;
}

function toolNameFromTitle(){
  const t = document.title || '';
  return t.split('|')[0].split('—')[0].trim() || t;
}

function updateShareLinks(){
  const includeResults = document.getElementById('shareIncludeResults').checked;
  const url = getShareableURL(includeResults);
  const toolName = toolNameFromTitle();
  document.getElementById('shareLinkText').textContent = url;
  document.getElementById('shareModalSubtitle').textContent = toolName;
  document.getElementById('embedCodeText').textContent =
    '<iframe src="' + url + '" width="100%" height="700" style="border:0;" title="' + toolName + '"></iframe>';
  document.getElementById('citeText').textContent =
    toolName + '. ElectroMechCalc. Retrieved from ' + url;
}

function openShareModal(){
  buildShareModal();
  updateShareLinks();
  document.getElementById('shareIncludeResults').onchange = updateShareLinks;
  document.getElementById('shareModalOverlay').classList.add('open');
}

function closeShareModal(){
  const overlay = document.getElementById('shareModalOverlay');
  if (overlay) overlay.classList.remove('open');
}

function switchShareTab(tab){
  document.querySelectorAll('.share-tab').forEach(function(b){ b.classList.toggle('active', b.dataset.tab === tab); });
  document.querySelectorAll('.share-panel').forEach(function(p){ p.classList.toggle('active', p.dataset.panel === tab); });
}

function shareTo(network){
  const includeResults = document.getElementById('shareIncludeResults').checked;
  const url = encodeURIComponent(getShareableURL(includeResults));
  const text = encodeURIComponent(toolNameFromTitle());
  let shareUrl = '';
  if (network === 'facebook') shareUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + url;
  else if (network === 'x') shareUrl = 'https://twitter.com/intent/tweet?url=' + url + '&text=' + text;
  else if (network === 'linkedin') shareUrl = 'https://www.linkedin.com/sharing/share-offsite/?url=' + url;
  else if (network === 'whatsapp') shareUrl = 'https://wa.me/?text=' + text + '%20' + url;
  if (shareUrl) window.open(shareUrl, '_blank', 'noopener');
}

function copyShareText(elId, btn){
  const text = document.getElementById(elId).textContent;
  navigator.clipboard.writeText(text).then(function(){
    if (!btn) return;
    const original = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(function(){ btn.textContent = original; }, 1500);
  });
}
