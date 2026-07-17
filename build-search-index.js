#!/usr/bin/env node
/**
 * build-search-index.js
 *
 * Scans the site for calculator/content pages and generates
 * /search-index.json, which site-nav.js fetches at runtime to
 * power the header search box.
 *
 * Why this exists:
 * site-nav.js used to hardcode a 6-page array for search. With 30+
 * (and growing toward 100+) calculator pages, that array can never
 * be kept in sync by hand. This script builds the index at build
 * time from the actual .html files in the repo, so adding a new
 * calculator just means adding a new page — no code to touch.
 *
 * Usage:
 *   node build-search-index.js [rootDir] [outFile]
 *
 * Defaults: rootDir = current directory, outFile = ./search-index.json
 *
 * How a page is categorized:
 *   1. Explicit override — put this comment anywhere in the file:
 *        <!-- category: Electrical -->
 *      This always wins.
 *   2. Filename heuristic — CATEGORY_KEYWORDS below is checked
 *      against the filename. Extend this list as new calculator
 *      types are added.
 *   3. Falls back to "General".
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

const ROOT = path.resolve(process.argv[2] || ".");
const OUT_FILE = path.resolve(process.argv[3] || "./search-index.json");

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
// matters — first match wins. Keys are matched against the filename
// (without extension), case-insensitively, as substrings.
const CATEGORY_KEYWORDS = [
  { category: "Electrical", match: ["transformer", "ups-", "cable", "motor", "kva", "power-factor", "generator", "voltage", "current", "wire", "breaker", "dg-", "inverter", "solar"] },
  { category: "Mechanical", match: ["bearing", "pump", "torque", "gear", "shaft", "belt", "pressure", "flow-rate", "hvac", "cooling-tower", "converter"] },
  { category: "Financial", match: ["epf", "sip", "cagr", "emi", "interest", "investment", "retirement", "tax", "gratuity", "fd-", "rd-", "ppf", "nps"] },
];

function detectCategory(filePath, htmlContent) {
  const overrideMatch = htmlContent.match(/<!--\s*category:\s*([^-]+?)\s*-->/i);
  if (overrideMatch) return overrideMatch[1].trim();

  const base = path.basename(filePath, ".html").toLowerCase();
  for (const { category, match } of CATEGORY_KEYWORDS) {
    if (match.some((kw) => base.includes(kw))) return category;
  }
  return "General";
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

  for (const filePath of files) {
    const html = fs.readFileSync(filePath, "utf8");

    const rawTitle = extractTag(html, "title");
    // Strip common " | Site Name" suffixes for a cleaner search title.
    const title = rawTitle.split("|")[0].trim() || path.basename(filePath, ".html");

    const description = extractMetaDescription(html);
    const chips = extractFormulaChips(html);

    const category = detectCategory(filePath, html);
    const relPath = path.relative(ROOT, filePath);

    entries.push({
      title,
      url: toUrl(relPath),
      category,
      keywords: [description, ...chips].filter(Boolean).join(" — "),
    });
  }

  // Stable, alphabetical by title so diffs are readable in version control.
  entries.sort((a, b) => a.title.localeCompare(b.title));

  fs.writeFileSync(OUT_FILE, JSON.stringify(entries, null, 2) + "\n");
  console.log(`search-index.json written: ${entries.length} pages indexed -> ${OUT_FILE}`);
  return entries;
}

buildIndex();
