#!/usr/bin/env node
/**
 * build-search-index.js
 *
 * Scans the site for calculator/content pages and generates
 * /search-index.json, which _middleware.js (breadcrumb + Related
 * Calculators) and site-nav.js (search box) both read at runtime.
 *
 * This is the v2 version — same output shape as before, but built to
 * stay reliable as the site grows from 30+ pages toward 500+, where
 * silent filename-substring mis-categorization becomes a real risk.
 *
 * Usage:
 *   node build-search-index.js [rootDir] [outFile] [--strict]
 *
 * Defaults: rootDir = current directory, outFile = ./search-index.json
 *
 * --strict : exit with a non-zero code if any page falls back to
 *            "General" without an explicit override, or if any
 *            duplicate URL/title is found. Wire this into CI so a
 *            mis-tagged page never reaches production silently.
 *
 * ---------------------------------------------------------------
 * How a page is categorized (first match wins):
 *
 *   1. Explicit per-page metadata comment (recommended at scale):
 *        <!-- meta: {"category":"Electrical","title":"Custom Title",
 *                     "keywords":"extra search terms"} -->
 *      Any of category/title/keywords may be omitted; omitted fields
 *      fall through to the normal extraction below. This is the only
 *      fully unambiguous method and is the recommended way to tag
 *      pages once you're adding calculators in bulk.
 *
 *   2. Legacy explicit override (still supported):
 *        <!-- category: Electrical -->
 *
 *   3. Filename heuristic — CATEGORY_KEYWORDS below, matched as
 *      WHOLE WORD/TOKEN segments of the filename (split on "-" and
 *      "."), not raw substrings. This avoids false positives like
 *      "unit-converter-pro" no longer accidentally matching on a
 *      loose "current" substring, or a hypothetical
 *      "microcurrent-sensor.html" wrongly matching "current".
 *
 *   4. Falls back to "General" — and gets flagged in the build
 *      summary so it doesn't go unnoticed at scale.
 *
 * Each entry in search-index.json looks like:
 *   {
 *     "title": "Transformer Size Calculator",
 *     "url": "/transformer-size.html",
 *     "category": "Electrical",
 *     "keywords": "size a transformer by kva load voltage ..."
 *   }
 */

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const STRICT = args.includes("--strict");
const positional = args.filter((a) => !a.startsWith("--"));

const ROOT = path.resolve(positional[0] || ".");
const OUT_FILE = path.resolve(positional[1] || "./search-index.json");

// Directories that never contain real pages — skip entirely.
const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  "partials",     // header.html / footer.html fragments, not real pages
  "functions",    // _middleware.js etc.
  "assets",
  ".wrangler",
  "dist",
  "build",
]);

// Filenames that are never search results even though they're .html
const EXCLUDED_FILES = new Set([
  "404.html",
]);

// Extend this as new calculator categories are introduced. Order
// matters — first matching category wins. Keys are matched against
// filename TOKENS (the filename split on "-" and "."), not raw
// substrings, so "kva" won't accidentally match inside an unrelated
// word and "current" won't match "concurrent-something.html".
const CATEGORY_KEYWORDS = [
  {
    category: "Electrical",
    match: ["transformer", "ups", "cable", "motor", "kva", "kw", "hp",
            "apfc", "power", "factor", "generator", "voltage", "current",
            "wire", "breaker", "dg", "inverter", "solar", "capacitor"],
  },
  {
    category: "Mechanical",
    match: ["bearing", "pump", "torque", "gear", "shaft", "belt",
            "pressure", "flow", "rate", "hvac", "cooling", "tower",
            "converter", "unit", "maintenance", "tdh"],
  },
  {
    category: "Financial",
    match: ["epf", "sip", "cagr", "emi", "interest", "investment",
            "retirement", "tax", "gratuity", "fd", "rd", "ppf", "nps",
            "inflation"],
  },
];

// Build a Set of every keyword token for fast lookup, per category.
const CATEGORY_TOKEN_SETS = CATEGORY_KEYWORDS.map(({ category, match }) => ({
  category,
  tokens: new Set(match.map((k) => k.toLowerCase())),
}));

function tokenizeFilename(filePath) {
  return path
    .basename(filePath, ".html")
    .toLowerCase()
    .split(/[-.]+/)
    .filter(Boolean);
}

function detectCategoryFromFilename(filePath) {
  const tokens = tokenizeFilename(filePath);
  for (const { category, tokens: tokenSet } of CATEGORY_TOKEN_SETS) {
    if (tokens.some((t) => tokenSet.has(t))) return category;
  }
  return null; // no match — caller decides fallback
}

// Explicit per-page metadata comment, e.g.:
//   <!-- meta: {"category":"Electrical","keywords":"foo bar"} -->
// Returns {} if not present or unparsable (unparsable is logged, not thrown,
// so one bad comment doesn't kill the entire build).
function extractMetaOverride(html, filePath) {
  const m = html.match(/<!--\s*meta:\s*(\{[\s\S]*?\})\s*-->/i);
  if (!m) return {};
  try {
    return JSON.parse(m[1]);
  } catch (err) {
    console.warn(`⚠️  Unparsable <!-- meta: ... --> comment in ${filePath}, ignoring it. (${err.message})`);
    return {};
  }
}

// Legacy override: <!-- category: Electrical -->
function extractLegacyCategoryOverride(html) {
  const m = html.match(/<!--\s*category:\s*([^-]+?)\s*-->/i);
  return m ? m[1].trim() : null;
}

function extractTag(html, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = html.match(re);
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
}

function extractMetaDescription(html) {
  const m = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  return m ? m[1].trim() : "";
}

function extractFormulaChips(html) {
  const chips = [];
  const re = /class=["'][^"']*formula-chip[^"']*["'][^>]*>([^<]*)</gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const text = m[1].replace(/\s+/g, " ").trim();
    if (text) chips.push(text);
  }
  return chips;
}

function toUrl(rootRelativePath) {
  const normalized = rootRelativePath.split(path.sep).join("/");
  return "/" + normalized.replace(/^\.\//, "");
}

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), acc);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      if (EXCLUDED_FILES.has(entry.name)) continue;
      acc.push(path.join(dir, entry.name));
    }
  }
  return acc;
}

function buildIndex() {
  const files = walk(ROOT);
  const entries = [];

  // Collected for the end-of-build summary / --strict checks.
  const fellBackToGeneral = [];
  const titleToUrls = new Map(); // title -> [urls] (case-insensitive)
  const seenUrls = new Set();
  const duplicateUrls = [];

  for (const filePath of files) {
    const html = fs.readFileSync(filePath, "utf8");
    const relPath = path.relative(ROOT, filePath);
    const url = toUrl(relPath);

    // ---- category resolution (priority order) ----
    const meta = extractMetaOverride(html, relPath);
    const legacyOverride = extractLegacyCategoryOverride(html);
    const filenameGuess = detectCategoryFromFilename(filePath);

    let category = meta.category || legacyOverride || filenameGuess || "General";
    let usedExplicitOverride = Boolean(meta.category || legacyOverride);

    if (category === "General" && !usedExplicitOverride) {
      fellBackToGeneral.push(url);
    }

    // ---- title resolution ----
    const rawTitle = extractTag(html, "title");
    const fallbackTitle = rawTitle.split("|")[0].trim() || path.basename(filePath, ".html");
    const title = meta.title || fallbackTitle;

    // ---- keywords resolution ----
    const description = extractMetaDescription(html);
    const chips = extractFormulaChips(html);
    const autoKeywords = [description, ...chips].filter(Boolean).join(" — ");
    const keywords = meta.keywords
      ? [meta.keywords, autoKeywords].filter(Boolean).join(" — ")
      : autoKeywords;

    // ---- duplicate tracking ----
    if (seenUrls.has(url)) duplicateUrls.push(url);
    seenUrls.add(url);

    const titleKey = title.toLowerCase();
    if (!titleToUrls.has(titleKey)) titleToUrls.set(titleKey, []);
    titleToUrls.get(titleKey).push(url);

    entries.push({ title, url, category, keywords });
  }

  // Stable, alphabetical by title so diffs are readable in version control.
  entries.sort((a, b) => a.title.localeCompare(b.title));

  fs.writeFileSync(OUT_FILE, JSON.stringify(entries, null, 2) + "\n");

  // ---------------------------------------------------------------
  // Build summary — always printed, even without --strict, so you
  // catch mis-tagged pages as the calculator count grows.
  // ---------------------------------------------------------------
  const byCategory = {};
  for (const e of entries) {
    byCategory[e.category] = (byCategory[e.category] || 0) + 1;
  }

  const duplicateTitles = [...titleToUrls.entries()].filter(([, urls]) => urls.length > 1);

  console.log(`\n✅ search-index.json written: ${entries.length} pages indexed -> ${OUT_FILE}`);
  console.log("\nPages per category:");
  for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat.padEnd(12)} ${count}`);
  }

  let hasProblems = false;

  if (fellBackToGeneral.length) {
    hasProblems = true;
    console.warn(`\n⚠️  ${fellBackToGeneral.length} page(s) fell back to "General" with no explicit tag:`);
    fellBackToGeneral.forEach((u) => console.warn(`   - ${u}`));
    console.warn(`   Fix: add <!-- meta: {"category":"..."} --> or <!-- category: ... --> to these files,`);
    console.warn(`   or extend CATEGORY_KEYWORDS if the filename genuinely fits an existing category.`);
  }

  if (duplicateUrls.length) {
    hasProblems = true;
    console.warn(`\n⚠️  Duplicate URL(s) detected (should be impossible — check for symlinks/case collisions):`);
    [...new Set(duplicateUrls)].forEach((u) => console.warn(`   - ${u}`));
  }

  if (duplicateTitles.length) {
    hasProblems = true;
    console.warn(`\n⚠️  Duplicate page title(s) across different URLs (confusing in search results):`);
    duplicateTitles.forEach(([title, urls]) => {
      console.warn(`   - "${title}" -> ${urls.join(", ")}`);
    });
  }

  if (!hasProblems) {
    console.log("\n✅ No fallback-to-General, duplicate URL, or duplicate title issues found.");
  }

  if (STRICT && hasProblems) {
    console.error("\n❌ --strict mode: failing build due to the issue(s) above.");
    process.exit(1);
  }

  return entries;
}

buildIndex();
