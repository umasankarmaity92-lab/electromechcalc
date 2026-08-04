#!/usr/bin/env node
/**
 * fix-old-pages.js
 *
 * One-time bulk fix for OLD static calculator pages (the ones published
 * before master-template.html was updated for the PageSpeed fixes).
 * Master-template.html only affects NEW pages generated from it — this
 * script brings the same two fixes to every already-published page:
 *
 *   1. Render-blocking CSS fix
 *      /assets/tailwind.min.css and the Google Fonts stylesheet were
 *      loaded as plain blocking <link rel="stylesheet">. Switches them
 *      to the same preload + media=print swap trick already used for
 *      theme.css, with <noscript> fallbacks.
 *
 *   2. Social-share image fix
 *      <meta property="og:image"> and <meta name="twitter:image">
 *      pointed at /logo.png (now a small 96x96 header icon — blurry
 *      when stretched for a social preview card). Repoints both to the
 *      new dedicated /og-image.png (1200x630).
 *
 * Does NOT touch:
 *   - <img src="/logo.png"> in the header/footer (that's the correct,
 *     already-fixed small icon — left alone)
 *   - Any page that doesn't contain the exact old block (reported as
 *     "skipped" so you can check it manually — could mean it's already
 *     fixed, or hand-edited differently)
 *
 * Usage:
 *   node fix-old-pages.js [rootDir] [--dry-run]
 *
 * Defaults: rootDir = current directory
 * --dry-run : report what WOULD change, without writing any files.
 *
 * Always run with --dry-run first and review the summary, then run for
 * real. Keep a git commit / backup before running for real either way.
 */

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const positional = args.filter((a) => !a.startsWith("--"));
const ROOT = path.resolve(positional[0] || ".");

// Directories that never contain real pages — skip entirely.
const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  "partials",   // header.html / footer.html are handled separately, not by this script
  "functions",
  "assets",
  ".wrangler",
  "dist",
  "build",
]);

const EXCLUDED_FILES = new Set([
  "404.html",
  "master-template.html", // already fixed by hand — don't touch
]);

// ---------------------------------------------------------------------
// Fix 1: render-blocking CSS
// Matched as two independent single-line replacements (tailwind link,
// google fonts link) rather than one big block — pages differ slightly
// in blank lines / comments around these tags, and single-line matches
// are immune to that.
// ---------------------------------------------------------------------
const TAILWIND_OLD = `<link rel="stylesheet" href="/assets/tailwind.min.css">`;
const TAILWIND_NEW = `<link rel="preload" as="style" href="/assets/tailwind.min.css">
<link rel="stylesheet" href="/assets/tailwind.min.css" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="/assets/tailwind.min.css"></noscript>`;

const FONTS_HREF = `https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap`;
const FONTS_OLD = `<link href="${FONTS_HREF}" rel="stylesheet">`;
const FONTS_NEW = `<link rel="preload" as="style" href="${FONTS_HREF}">
<link href="${FONTS_HREF}" rel="stylesheet" media="print" onload="this.media='all'">
<noscript><link href="${FONTS_HREF}" rel="stylesheet"></noscript>`;

// ---------------------------------------------------------------------
// Fix 2: social-share image — only the two meta tags, never the
// header/footer <img> logo.
// ---------------------------------------------------------------------
const OG_IMAGE_RE = /(<meta\s+property=["']og:image["']\s+content=["'])https:\/\/www\.electromechcalc\.com\/logo\.png(["'])/i;
const TWITTER_IMAGE_RE = /(<meta\s+name=["']twitter:image["']\s+content=["'])https:\/\/www\.electromechcalc\.com\/logo\.png(["'])/i;
const NEW_IMAGE_URL = "https://www.electromechcalc.com/og-image.png";

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

function fixFile(filePath) {
  const original = fs.readFileSync(filePath, "utf8");
  let content = original;
  const applied = [];

  if (content.includes(TAILWIND_OLD)) {
    content = content.replace(TAILWIND_OLD, TAILWIND_NEW);
    applied.push("tailwind-css");
  }

  if (content.includes(FONTS_OLD)) {
    content = content.replace(FONTS_OLD, FONTS_NEW);
    applied.push("google-fonts");
  }

  if (OG_IMAGE_RE.test(content)) {
    content = content.replace(OG_IMAGE_RE, `$1${NEW_IMAGE_URL}$2`);
    applied.push("og:image");
  }

  if (TWITTER_IMAGE_RE.test(content)) {
    content = content.replace(TWITTER_IMAGE_RE, `$1${NEW_IMAGE_URL}$2`);
    applied.push("twitter:image");
  }

  const changed = content !== original;
  if (changed && !DRY_RUN) {
    fs.writeFileSync(filePath, content);
  }

  return { changed, applied };
}

function main() {
  const files = walk(ROOT);
  const changedFiles = [];
  const untouchedFiles = [];
  const partialFiles = [];

  for (const filePath of files) {
    const relPath = path.relative(ROOT, filePath);
    const { changed, applied } = fixFile(filePath);

    if (!changed) {
      untouchedFiles.push(relPath);
      continue;
    }

    const expected = ["tailwind-css", "google-fonts", "og:image", "twitter:image"];
    const missing = expected.filter((k) => !applied.includes(k));

    if (missing.length) {
      partialFiles.push({ relPath, applied, missing });
    } else {
      changedFiles.push(relPath);
    }
  }

  console.log(`\n${DRY_RUN ? "🔍 DRY RUN — no files written" : "✅ Files updated"}`);
  console.log(`\nFully fixed (${changedFiles.length}):`);
  changedFiles.forEach((f) => console.log(`  ✓ ${f}`));

  if (partialFiles.length) {
    console.log(`\n⚠️  Partially matched — review these by hand (${partialFiles.length}):`);
    partialFiles.forEach(({ relPath, applied, missing }) => {
      console.log(`  - ${relPath}: applied [${applied.join(", ")}], missing [${missing.join(", ")}]`);
    });
  }

  console.log(`\nUntouched, no matching pattern found (${untouchedFiles.length}):`);
  untouchedFiles.forEach((f) => console.log(`  · ${f}`));

  console.log(`\nTotal .html files scanned: ${files.length}`);

  if (DRY_RUN) {
    console.log("\nRe-run without --dry-run to write these changes.");
  }
}

main();
