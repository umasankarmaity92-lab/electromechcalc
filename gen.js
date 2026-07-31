const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------
// Calculator LIST + count now come from search-index.json (same file
// build-search-index.js maintains) instead of being hardcoded here.
// Add a new calculator page -> run build-search-index.js (or hand-edit
// search-index.json) -> re-run this script -> the category page picks
// it up automatically, with the right category, count, and JSON-LD.
//
// Only page-level polish (the one-line description on each card, and
// which cards get the "Featured" badge) still needs a manual entry
// below, in CARD_DESCRIPTIONS / FEATURED_URLS — everything else is
// derived.
// ---------------------------------------------------------------------

const SEARCH_INDEX_PATH = path.join(__dirname, 'search-index.json');

function loadSearchIndex() {
  let raw;
  try {
    raw = fs.readFileSync(SEARCH_INDEX_PATH, 'utf8');
  } catch (err) {
    throw new Error(`Could not read ${SEARCH_INDEX_PATH} — run build-search-index.js first. (${err.message})`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`search-index.json is not valid JSON (${err.message})`);
  }
}

// Hand-written one-liners for the calculator cards — kept separate from
// search-index.json's `keywords` field (which is built for search
// matching, not for reading as a sentence on a card). Keyed by url.
const CARD_DESCRIPTIONS = {
  '/transformer-size': 'Work out the right transformer kVA rating for your connected load and voltage in seconds.',
  '/kw-kva': "Convert apparent power to real power (or back) once you know the power factor.",
  '/hp-kw': 'Swap between horsepower and kilowatts for any motor nameplate rating.',
  '/motor-current': 'Find the full-load current (FLA) of a single-phase or three-phase motor.',
  '/apfc': "Size a capacitor bank in kVAR to correct your plant's power factor.",
  '/kva-current': 'Turn a kVA rating into line current for single- or three-phase supplies.',
  '/kw-current': 'Get the current draw from a real-power (kW) load at a given voltage and power factor.',
  '/cable-size': 'Pick a conductor size that keeps voltage drop and current within safe limits.',
  '/dg-size': 'Size a diesel generator set from your connected load and starting load.',
  '/inverter-size': "Match an inverter's VA rating to your load, with a safety margin for surges.",
  '/ups-calculator': 'Estimate UPS battery backup runtime from the Ah rating and load.',
  '/ups-size': 'Size a UPS in kVA from input current, load, and power factor.',
  '/solar-size': 'Work out how big a solar PV array you need for your daily load.',
  '/battery-backup': 'Estimate battery backup runtime from your load, battery Ah rating, and system voltage.',
  '/electrical-pro-max': 'An all-in-one toolkit for cable sizing, voltage drop, fault current, and load balancing.',

  '/bearing-life': "Estimate the L10 life of a bearing from its dynamic load rating and operating speed.",
  '/gear-ratio': 'Calculate output speed and torque multiplication for any gear pair.',
  '/pump-head': 'Add up elevation and friction losses to get total pump head.',
  '/pump-tdh': 'Work out Total Dynamic Head for correct pump selection.',
  '/belt-length': 'Find belt length from pulley sizes and center distance.',
  '/cooling-tower': "Check a cooling tower's range and approach to see how well it's performing.",
  '/unit-converter-pro': 'Convert between engineering units — pressure, flow, length, and more — in one tool.',
  '/maintenance-pro-cal': 'MTBF, MTTR, OEE, downtime cost, reliability, PM interval, and more in one maintenance toolkit.',

  '/epf-calculator': 'Project your EPF retirement corpus from salary, step-up, and interest rate.',
  '/gratuity-calculator': 'Work out your gratuity payout from salary and years of service.',
  '/sip-calculator': 'Estimate SIP or lump-sum mutual fund maturity value, with step-up support.',
  '/cagr-calculator': 'Find the annualized growth rate between a starting and ending investment value.',
  '/income-tax-calculator': 'Compare old vs new tax regime slabs to see which saves you more.',
  '/fd-calculator': 'Calculate fixed deposit maturity value with quarterly compounding.',
  '/rd-calculator': 'Work out recurring deposit maturity from monthly installment and tenure.',
  '/ppf-calculator': 'Project your PPF maturity value over the 15-year lock-in.',
  '/nps-calculator': 'Estimate your NPS retirement corpus and expected monthly annuity.',
  '/inflation-calculator': 'See how inflation erodes purchasing power, or what a future value really costs today.',
};

// Curated ordering + which URL gets the "Featured" badge — loaded from
// nav-order.json, the SAME file _middleware.js reads to number the
// header dropdown links. One shared file so the header nav and these
// category pages can never drift out of sync with each other.
const NAV_ORDER_PATH = path.join(__dirname, 'nav-order.json');
const navOrderCfg = JSON.parse(fs.readFileSync(NAV_ORDER_PATH, 'utf8'));

const ORDER = {};
const FEATURED_URLS = new Set();
for (const [categoryName, cfg] of Object.entries(navOrderCfg)) {
  ORDER[categoryName] = cfg.featured ? [...cfg.order, cfg.featured] : [...cfg.order];
  if (cfg.featured) FEATURED_URLS.add(cfg.featured);
}

// Fallback description for a calculator that has no CARD_DESCRIPTIONS
// entry yet — built from search-index.json's own keywords field so a
// brand-new page still renders a reasonable card instead of a blank
// one. (Add a proper one-liner to CARD_DESCRIPTIONS above when you get
// a chance — this is a safety net, not a replacement for it.)
function fallbackDescription(entry) {
  const raw = (entry.keywords || '').split(' — ')[0].trim();
  if (!raw) return `${entry.title} — free, formula-based, and always accurate.`;
  const sentence = raw.charAt(0).toUpperCase() + raw.slice(1);
  const trimmed = sentence.length > 120 ? sentence.slice(0, 117).trim() + '…' : sentence;
  return /[.!?]$/.test(trimmed) ? trimmed : trimmed + '.';
}

function getCalcsForCategory(index, categoryName) {
  const entries = index.filter(e => e.category === categoryName);
  const order = ORDER[categoryName] || [];
  const rank = url => {
    const i = order.indexOf(url);
    return i === -1 ? order.length + 1 : i; // unlisted urls sort after curated ones
  };
  entries.sort((a, b) => rank(a.url) - rank(b.url) || a.title.localeCompare(b.title));

  return entries.map(e => [
    e.title,
    e.url,
    CARD_DESCRIPTIONS[e.url] || fallbackDescription(e),
    FEATURED_URLS.has(e.url),
  ]);
}

const categories = {
  electrical: {
    slug: 'electrical-calculators',
    name: 'Electrical',
    accent: 'sky',
    accentHex: '#0ea5e9',
    accentHexDark: '#0369a1',
    badge: 'Electrical Engineering',
    title: 'Electrical Calculators',
    metaDesc: 'A complete set of free electrical engineering calculators — transformer sizing, motor current, cable sizing, UPS, solar, DG sets, and more. Formula-first, field-tested, always free.',
    intro: `Electrical engineering is full of numbers that decide whether a job goes smoothly or comes back to bite you later — an undersized cable that overheats, a transformer that trips under load, a UPS that dies mid-shift because the runtime math was never actually checked. ElectroMechCalc's Electrical calculators exist to take the guesswork out of these decisions. Every tool here is built around a standard, published formula (IS / IEC / handbook references), so whether you're sizing a distribution transformer, converting kVA to kW, or working out the full-load current of a motor, you get a straight, checkable answer — not a black box.`,
    intro2: `Start with the basics — kVA ↔ kW, HP ↔ kW, and current conversions — or jump straight to sizing tools for transformers, DG sets, cables, inverters, UPS, and solar arrays. Each calculator shows its formula alongside the result, so you can verify the math or use it to explain the number to someone else.`,
    faqs: [
      ['Are these electrical calculators free to use?', 'Yes. Every electrical calculator on ElectroMechCalc is completely free, with no sign-up required.'],
      ['What standards are the formulas based on?', 'Each calculator is built around standard, published engineering formulas referencing IS, IEC, or established handbook conventions, and is reviewed for accuracy before publishing.'],
      ['Can I use these results for final electrical design?', 'These calculators are meant for preliminary planning and educational use. Always verify results against the applicable code or a qualified electrical engineer before finalizing a design.'],
      ['Which calculator should I start with?', 'If you are sizing equipment for a new load, start with the Transformer Size or DG Size calculator, then use Cable Size and Motor Current to check the downstream wiring.'],
    ],
  },
  mechanical: {
    slug: 'mechanical-calculators',
    name: 'Mechanical',
    accent: 'amber',
    accentHex: '#f59e0b',
    accentHexDark: '#b45309',
    badge: 'Mechanical Engineering',
    title: 'Mechanical Calculators',
    metaDesc: 'Free mechanical engineering calculators for bearings, gears, pumps, belts, cooling towers, and maintenance metrics like MTBF, MTTR, and OEE. Formula-first, always free.',
    intro: `Mechanical systems don't forgive bad math either — a bearing selected without checking its L10 life, a pump chosen against the wrong TDH, or a maintenance program run without tracking MTBF and OEE all end the same way: unplanned downtime. ElectroMechCalc's Mechanical calculators cover the day-to-day sizing and reliability questions that keep rotating equipment running, from bearing life and gear ratios to pump head, belt length, and cooling tower efficiency.`,
    intro2: `If you're responsible for keeping equipment running rather than just specifying it, the Maintenance Pro Cal toolkit below bundles MTBF, MTTR, OEE, downtime cost, reliability, and spare-parts planning into a single place — useful for anyone tracking plant reliability metrics day to day.`,
    faqs: [
      ['Are these mechanical calculators free to use?', 'Yes. Every mechanical calculator on ElectroMechCalc is completely free, with no sign-up required.'],
      ['What is L10 bearing life?', 'L10 life is the number of operating hours (or revolutions) at which 90% of a batch of identical bearings, under the same load and speed, are expected to still be running without fatigue failure.'],
      ['Can I use these results for final mechanical design?', 'These calculators are meant for preliminary planning and educational use. Always verify results against the applicable code, manufacturer datasheet, or a qualified mechanical engineer before finalizing a design.'],
      ['What does the Maintenance Pro Cal toolkit include?', 'It bundles MTBF, MTTR, OEE, downtime cost, reliability (R(t)/F(t)), PM interval, lubrication re-lube interval, spare parts (EOQ/ROP), and overall maintenance cost tools in one place.'],
    ],
  },
  financial: {
    slug: 'financial-calculators',
    name: 'Financial',
    accent: 'emerald',
    accentHex: '#10b981',
    accentHexDark: '#047857',
    badge: 'Personal Finance',
    title: 'Financial Calculators',
    metaDesc: 'Free financial calculators for EPF, SIP, PPF, NPS, FD, RD, gratuity, income tax, CAGR, and inflation — built for Indian salary structures and savings schemes, always free.',
    intro: `Alongside its engineering tools, ElectroMechCalc also carries a set of financial calculators built for the numbers that come up on every Indian payslip and savings account — EPF, gratuity, PPF, NPS, and fixed or recurring deposits. The goal is the same as on the engineering side: a straight, formula-based answer you can verify, not a sales pitch dressed up as a calculator.`,
    intro2: `Use SIP & Lump Sum or CAGR to check how an investment is likely to grow, EPF, PPF, or NPS to plan for retirement, FD or RD to compare bank deposit maturity values, or the Income Tax Calculator to see whether the old or new regime works out cheaper for you this year.`,
    faqs: [
      ['Are these financial calculators free to use?', 'Yes. Every financial calculator on ElectroMechCalc is completely free, with no sign-up required.'],
      ['Are these calculators specific to India?', 'Yes, tools like EPF, PPF, NPS, and Gratuity are built around Indian schemes and current rates, while SIP, CAGR, FD, RD, and Inflation use general compounding formulas that apply anywhere.'],
      ['Can I rely on these for final financial decisions?', 'These calculators are for preliminary planning and educational use. Always verify results against your latest account statements, scheme rules, or a qualified financial advisor before making a final decision.'],
      ['Which calculator should I use to plan for retirement?', 'EPF, PPF, and NPS Calculators are the three built specifically for retirement planning — use whichever matches the scheme(s) you are contributing to.'],
    ],
  },
};

function escapeHTML(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// NOTE ON COLOR CLASSES:
// tailwind_min.css is a PURGED subset containing only classes already
// seen in existing site source. It does NOT include: any ring-* utility,
// any group-hover:* variant, border-*-300 for any color, or
// hover:border-amber-300 / hover:border-emerald-300 (only the sky
// versions happened to exist already). Rather than depend on
// dynamically-interpolated Tailwind classes that may silently be
// missing from a purge, the featured-card ring, the cross-category
// hover border, and the card-title hover color are implemented as
// plain hand-written CSS below (scoped with .cat-accent, using the
// category's real hex value) so they work regardless of what's in
// tailwind_min.css.

function calcCard(c, cat) {
  const [title, url, desc, featured] = c;
  const featClass = featured ? 'cat-card--featured' : '';
  const featBadge = featured ? `<span class="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full mb-2 w-fit"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.2 21 12 17.4 5.8 21 7 14.14l-5-4.87 7.1-1.01L12 2z"/></svg>Featured</span>` : '';
  return `
        <a href="${url}" class="calc-card cat-card ${featClass} group bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-2">
          ${featBadge}
          <h3 class="cat-card-title font-display font-semibold text-base text-brandDark transition-colors">${escapeHTML(title)}</h3>
          <p class="text-xs text-gray-500 leading-relaxed flex-1">${escapeHTML(desc)}</p>
          <span class="cat-card-cta inline-flex items-center gap-1 text-xs font-semibold mt-1">
            Open calculator
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
        </a>`;
}

function faqItem(q, a, i) {
  return `
    <details class="py-4" ${i === 0 ? 'open' : ''}>
      <summary class="flex items-center justify-between cursor-pointer font-display font-semibold text-brandDark text-sm md:text-base">
        ${escapeHTML(q)}
        <span class="plus text-xl text-gray-400 flex-shrink-0 ml-4">+</span>
      </summary>
      <p class="text-sm text-gray-600 leading-relaxed mt-3">${escapeHTML(a)}</p>
    </details>`;
}

function otherCategoryLinks(currentSlug) {
  return Object.values(categories)
    .filter(c => c.slug !== currentSlug)
    .map(c => `
        <a href="/${c.slug}" class="other-cat-card flex-1 bg-white rounded-2xl border border-gray-100 p-6 transition-colors" style="--cat-hex:${c.accentHex}">
          <span class="font-mono text-[10px] uppercase tracking-wider" style="color:${c.accentHex}">${c.name}</span>
          <h3 class="font-display font-bold text-lg text-brandDark mt-1">${c.title}</h3>
          <span class="inline-flex items-center gap-1 text-xs font-semibold mt-3" style="color:${c.accentHex}">
            Browse all
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
        </a>`).join('');
}

function buildPage(cat) {
  const count = cat.calcs.length;
  const faqSchema = cat.faqs.map(([q,a]) => `    {
      "@type": "Question",
      "name": ${JSON.stringify(q)},
      "acceptedAnswer": { "@type": "Answer", "text": ${JSON.stringify(a)} }
    }`).join(',\n');

  const itemListSchema = cat.calcs.map((c, i) => `    {
      "@type": "ListItem",
      "position": ${i+1},
      "url": "https://www.electromechcalc.com${c[1]}",
      "name": ${JSON.stringify(c[0])}
    }`).join(',\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#ffffff">

<title>${cat.title} — All ${count} Free ${cat.name} Tools | ElectroMechCalc</title>

<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7925875010930786"
     crossorigin="anonymous"></script>

<meta name="description" content="${cat.metaDesc}">
<meta name="keywords" content="${cat.name.toLowerCase()} calculators, ${cat.calcs.map(c=>c[0].toLowerCase()).join(', ')}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://www.electromechcalc.com/${cat.slug}">
<link rel="icon" href="/favicon.png" type="image/png">

<meta property="og:type" content="website">
<meta property="og:site_name" content="ElectroMechCalc">
<meta property="og:title" content="${cat.title} — ${count} Free Tools">
<meta property="og:description" content="${cat.metaDesc}">
<meta property="og:url" content="https://www.electromechcalc.com/${cat.slug}">
<meta property="og:image" content="https://www.electromechcalc.com/logo.png">
<meta property="og:locale" content="en_IN">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${cat.title} — ${count} Free Tools">
<meta name="twitter:description" content="${cat.metaDesc}">
<meta name="twitter:image" content="https://www.electromechcalc.com/logo.png">

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "${cat.title}",
  "url": "https://www.electromechcalc.com/${cat.slug}",
  "description": "${cat.metaDesc}",
  "publisher": { "@type": "Organization", "name": "ElectroMechCalc", "url": "https://www.electromechcalc.com/" }
}
</script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "itemListElement": [
${itemListSchema}
  ]
}
</script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
${faqSchema}
  ]
}
</script>

<link rel="stylesheet" href="/assets/tailwind.min.css">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
<link rel="preload" as="fetch" href="/assets/electromechcalc-hero.json" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="preload" as="style" href="/assets/theme.css">
<link rel="stylesheet" href="/assets/theme.css" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="/assets/theme.css"></noscript>
<style>
  body{font-family:'Inter',system-ui,sans-serif;}
  h1,h2,h3,.font-display{font-family:'Space Grotesk',system-ui,sans-serif;}
  .font-mono{font-family:'JetBrains Mono',monospace;}

  .blueprint-grid{
    background-image:
      linear-gradient(#1f2f47 1px, transparent 1px),
      linear-gradient(90deg, #1f2f47 1px, transparent 1px);
    background-size:42px 42px;
  }

  .calc-card{
    transition:transform .15s ease, box-shadow .15s ease, border-color .15s ease;
  }
  .calc-card:hover{
    transform:translateY(-3px);
    box-shadow:0 14px 28px rgba(11,18,32,0.10);
  }

  /* ---- accent effects, hand-written (see note in gen.js) ---- */
  .cat-card-title{ color: inherit; }
  .cat-card:hover .cat-card-title{ color:${cat.accentHex}; }
  .cat-card-cta{ color:${cat.accentHex}; }
  .cat-card--featured{
    border-color:${cat.accentHex}66 !important;
    box-shadow:0 0 0 3px ${cat.accentHex}26;
  }
  .other-cat-card:hover{ border-color:${cat.accentHex}66; box-shadow:0 8px 20px rgba(11,18,32,0.06); }

  details summary::-webkit-details-marker{display:none;}
  details summary{list-style:none;cursor:pointer;}
  details summary .plus{transition:transform .2s ease;}
  details[open] summary .plus{transform:rotate(45deg);}

  @media (prefers-reduced-motion: reduce){
    *{transition:none !important;}
  }

  .nav-dropdown .nav-dropdown-panel{ display:none; }
  .nav-dropdown.nav-dropdown-open .nav-dropdown-panel{ display:block; }
  .nav-dropdown-panel{ padding-top:10px; margin-top:-10px; }

  body{ transition:background-color .2s ease, color .2s ease; }
  body.dark-theme{ background:#0B1220 !important; color:#e2e8f0 !important; }
  body.dark-theme .calc-card:hover{ box-shadow:0 14px 28px rgba(0,0,0,0.35); }
  body.dark-theme .stat-tile{ background:#111c2e !important; border-color:#1f2f47 !important; }
</style>
</head>
<body class="bg-gray-50 text-gray-800">

<div id="site-header"></div>

<div id="breadcrumb"></div>

<!-- ===================== HERO ===================== -->
<section class="bg-brandDark blueprint-grid relative overflow-hidden border-b border-brandLine">
  <div class="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,rgba(14,165,233,0.16),transparent_70%)] pointer-events-none"></div>
  <div class="max-w-5xl mx-auto px-4 py-14 relative z-10 text-center">
    <span class="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-${cat.accent}-400 bg-${cat.accent}-400/10 border border-${cat.accent}-400/30 px-3 py-1.5 rounded-full mb-5">
      <span class="w-1.5 h-1.5 bg-${cat.accent}-400 rounded-full"></span>
      ${cat.badge}
    </span>
    <h1 class="text-3xl md:text-5xl font-display font-bold text-white leading-tight mb-4">
      ${cat.title}
    </h1>
    <p class="font-mono text-xs uppercase tracking-wider text-gray-500 mb-4">${count} free calculators</p>
    <p class="text-gray-400 text-sm md:text-base max-w-2xl mx-auto">
      Formula-first, field-tested, and always free — every tool below shows its working, not just an answer.
    </p>
  </div>
</section>

<!-- ===================== INTRO ===================== -->
<section class="bg-white border-b border-gray-100">
  <div class="max-w-3xl mx-auto px-4 py-12">
    <div class="prose prose-sm max-w-none text-gray-600 leading-relaxed space-y-4">
      <p>${cat.intro}</p>
      <p>${cat.intro2}</p>
    </div>
  </div>
</section>

<!-- ===================== CALCULATOR GRID ===================== -->
<section class="max-w-6xl mx-auto px-4 py-14">
  <div class="flex items-end justify-between flex-wrap gap-3 border-b border-gray-100 pb-4 mb-8">
    <div>
      <span class="block font-mono text-xs uppercase tracking-wider mb-1" style="color:${cat.accentHex}">Browse All</span>
      <h2 class="text-xl md:text-2xl font-display font-bold text-brandDark">All ${cat.name} Calculators</h2>
    </div>
  </div>
  <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">${cat.calcs.map(c => calcCard(c, cat)).join('')}
  </div>
</section>

<!-- ===================== CROSS-CATEGORY CTA ===================== -->
<section class="bg-white border-y border-gray-100 py-14">
  <div class="max-w-5xl mx-auto px-4">
    <div class="text-center mb-8">
      <span class="block font-mono text-xs uppercase tracking-wider text-sky-600 mb-1">Looking for something else?</span>
      <h2 class="text-xl md:text-2xl font-display font-bold text-brandDark">Explore the Other Categories</h2>
    </div>
    <div class="flex flex-col md:flex-row gap-5">${otherCategoryLinks(cat.slug)}
    </div>
  </div>
</section>

<!-- ===================== FAQ ===================== -->
<section class="max-w-3xl mx-auto px-4 py-16">
  <div class="text-center mb-10">
    <span class="block font-mono text-xs uppercase tracking-wider mb-1" style="color:${cat.accentHex}">FAQ</span>
    <h2 class="text-2xl md:text-3xl font-display font-bold text-brandDark">Frequently Asked Questions</h2>
  </div>

  <div class="divide-y divide-gray-200">
    ${cat.faqs.map(([q,a],i) => faqItem(q,a,i)).join('')}
  </div>
</section>

<div id="site-footer"></div>

<script src="/assets/site-nav.js"></script>

</body>
</html>
`;
}

const searchIndex = loadSearchIndex();

for (const key of Object.keys(categories)) {
  const cat = categories[key];
  cat.calcs = getCalcsForCategory(searchIndex, cat.name);
  if (!cat.calcs.length) {
    console.warn(`⚠️  No search-index.json entries found for category "${cat.name}" — skipping ${cat.slug}.html`);
    continue;
  }
  const html = buildPage(cat);
  fs.writeFileSync(path.join(__dirname, `${cat.slug}.html`), html);
  console.log(`wrote ${cat.slug}.html (${html.length} bytes) — ${cat.calcs.length} calculators`);
}
