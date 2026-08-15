var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/pages-oWFl8Z/functionsWorker-0.24242882345773975.mjs
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var InjectHTML = class {
  static {
    __name(this, "InjectHTML");
  }
  static {
    __name2(this, "InjectHTML");
  }
  constructor(html) {
    this.html = html;
  }
  element(element) {
    element.setInnerContent(this.html, { html: true });
  }
};
var ReplaceWithHTML = class {
  static {
    __name(this, "ReplaceWithHTML");
  }
  static {
    __name2(this, "ReplaceWithHTML");
  }
  constructor(html) {
    this.html = html;
  }
  element(element) {
    element.replace(this.html, { html: true });
  }
};
var InsertBefore = class {
  static {
    __name(this, "InsertBefore");
  }
  static {
    __name2(this, "InsertBefore");
  }
  constructor(html) {
    this.html = html;
  }
  element(element) {
    if (this.html) {
      element.before(this.html, { html: true });
    }
  }
};
var InsertAfter = class {
  static {
    __name(this, "InsertAfter");
  }
  static {
    __name2(this, "InsertAfter");
  }
  constructor(html) {
    this.html = html;
  }
  element(element) {
    if (this.html) {
      element.after(this.html, { html: true });
    }
  }
};
var EARLY_THEME_SCRIPT = `<script>(function(){try{var t=localStorage.getItem("emc-theme")||(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark-theme":"light-theme");var r=document.documentElement;r.classList.remove("dark-theme","light-theme");r.classList.add(t);}catch(e){}})();<\/script>`;
var PrependToHead = class {
  static {
    __name(this, "PrependToHead");
  }
  static {
    __name2(this, "PrependToHead");
  }
  element(element) {
    element.prepend(EARLY_THEME_SCRIPT, { html: true });
  }
};
var COMMON_JS_TAG = '<script src="/assets/common.js" defer><\/script>';
var AppendCommonScriptToHead = class {
  static {
    __name(this, "AppendCommonScriptToHead");
  }
  static {
    __name2(this, "AppendCommonScriptToHead");
  }
  element(element) {
    element.append(COMMON_JS_TAG, { html: true });
  }
};
var AddCalcInputPanelClass = class {
  static {
    __name(this, "AddCalcInputPanelClass");
  }
  static {
    __name2(this, "AddCalcInputPanelClass");
  }
  element(element) {
    const cls = element.getAttribute("class") || "";
    if (!cls.includes("calc-input-panel")) {
      element.setAttribute("class", `${cls} calc-input-panel`.trim());
    }
  }
};
var AddResultPanelId = class {
  static {
    __name(this, "AddResultPanelId");
  }
  static {
    __name2(this, "AddResultPanelId");
  }
  element(element) {
    if (!element.getAttribute("id")) {
      element.setAttribute("id", "resultPanel");
    }
  }
};
var AddScrollToResultOnClick = class {
  static {
    __name(this, "AddScrollToResultOnClick");
  }
  static {
    __name2(this, "AddScrollToResultOnClick");
  }
  element(element) {
    const onclick = element.getAttribute("onclick") || "";
    if (onclick && !onclick.includes("scrollToResult")) {
      element.setAttribute("onclick", `${onclick.trim().replace(/;\s*$/, "")}; scrollToResult();`);
    }
  }
};
var RewriteShareButtonOnClick = class {
  static {
    __name(this, "RewriteShareButtonOnClick");
  }
  static {
    __name2(this, "RewriteShareButtonOnClick");
  }
  element(element) {
    const onclick = element.getAttribute("onclick") || "";
    if (onclick.includes("openShareModal")) {
      element.setAttribute("onclick", onclick.replace(/openShareModal\(\)/g, "loadShareModal()"));
    }
  }
};
function normalizePath(p) {
  let s = "/" + String(p).replace(/^\/+/, "").replace(/\/+$/, "");
  s = s.replace(/\.html$/i, "");
  if (s === "" || s === "/index") s = "/";
  return s;
}
__name(normalizePath, "normalizePath");
__name2(normalizePath, "normalizePath");
function escapeHTML(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
__name(escapeHTML, "escapeHTML");
__name2(escapeHTML, "escapeHTML");
function buildRelatedCalculatorsHTML(pathname, index) {
  if (!Array.isArray(index) || !index.length) return "";
  const currentPath = normalizePath(pathname);
  const current = index.find((entry) => normalizePath(entry.url) === currentPath);
  if (!current) return "";
  const MAX_ITEMS = 4;
  const sameCategory = index.filter(
    (e) => e !== current && e.category === current.category
  );
  const others = index.filter(
    (e) => e !== current && e.category !== current.category
  );
  const picks = [...sameCategory, ...others].slice(0, MAX_ITEMS);
  if (!picks.length) return "";
  const cards = picks.map(
    (e) => `
      <a href="${escapeHTML(e.url)}" class="calc-card related-calc-card rounded-xl shadow-sm p-5 flex flex-col gap-2">
        <h3 class="font-display font-semibold text-sm related-calc-title">${escapeHTML(e.title)}</h3>
        <span class="text-xs related-calc-category">${escapeHTML(e.category || "")}</span>
      </a>`
  ).join("");
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
__name(buildRelatedCalculatorsHTML, "buildRelatedCalculatorsHTML");
__name2(buildRelatedCalculatorsHTML, "buildRelatedCalculatorsHTML");
function buildBreadcrumbHTML(pathname, index) {
  if (!Array.isArray(index) || !index.length) return "";
  const currentPath = normalizePath(pathname);
  if (currentPath === "/") return "";
  const current = index.find((entry) => normalizePath(entry.url) === currentPath);
  if (!current) return "";
  const crumbs = [`<a href="/" class="breadcrumb-home">Home</a>`];
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
__name(buildBreadcrumbHTML, "buildBreadcrumbHTML");
__name2(buildBreadcrumbHTML, "buildBreadcrumbHTML");
var PRO_STAR_SVG = `<svg class="pro-star-icon" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="display:inline;vertical-align:-1px;margin-right:2px"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.2 21 12 17.4 5.8 21 7 14.14l-5-4.87 7.1-1.01L12 2z"/></svg>`;
function orderedEntriesForCategory(categoryName, index, navOrder) {
  const cfg = navOrder && navOrder[categoryName] || { order: [], featured: null };
  const entries = index.filter((e) => e.category === categoryName && e.url !== cfg.featured);
  const byUrl = new Map(entries.map((e) => [e.url, e]));
  const orderedUrls = cfg.order.filter((u) => byUrl.has(u));
  const extraUrls = [...byUrl.keys()].filter((u) => !orderedUrls.includes(u)).sort((a, b) => byUrl.get(a).title.localeCompare(byUrl.get(b).title));
  const mainEntries = [...orderedUrls, ...extraUrls].map((u) => byUrl.get(u));
  const featuredEntry = cfg.featured ? index.find((e) => e.url === cfg.featured && e.category === categoryName) : null;
  return { mainEntries, featuredEntry };
}
__name(orderedEntriesForCategory, "orderedEntriesForCategory");
__name2(orderedEntriesForCategory, "orderedEntriesForCategory");
function buildDesktopNavLinksHTML(categoryName, index, navOrder) {
  if (!Array.isArray(index) || !index.length) return "";
  const { mainEntries, featuredEntry } = orderedEntriesForCategory(categoryName, index, navOrder);
  let html = mainEntries.map((e, i) => `<a href="${escapeHTML(e.url)}" class="nav-dropdown-link">${i + 1}. ${escapeHTML(e.title)}</a>`).join("");
  if (featuredEntry) {
    const n = mainEntries.length + 1;
    html += `<div class="border-t border-[var(--border)] mt-1 pt-1"><a href="${escapeHTML(featuredEntry.url)}" class="nav-dropdown-link text-amber-500 font-semibold">${PRO_STAR_SVG} ${n}. ${escapeHTML(featuredEntry.title)}</a></div>`;
  }
  return html;
}
__name(buildDesktopNavLinksHTML, "buildDesktopNavLinksHTML");
__name2(buildDesktopNavLinksHTML, "buildDesktopNavLinksHTML");
function buildMobileNavLinksHTML(categoryName, index, navOrder) {
  if (!Array.isArray(index) || !index.length) return "";
  const { mainEntries, featuredEntry } = orderedEntriesForCategory(categoryName, index, navOrder);
  let html = mainEntries.map((e, i) => `<a href="${escapeHTML(e.url)}" class="mobile-sublink">${i + 1}. ${escapeHTML(e.title)}</a>`).join("");
  if (featuredEntry) {
    const n = mainEntries.length + 1;
    html += `<a href="${escapeHTML(featuredEntry.url)}" class="mobile-sublink text-amber-400 font-semibold">${PRO_STAR_SVG} ${n}. ${escapeHTML(featuredEntry.title)}</a>`;
  }
  return html;
}
__name(buildMobileNavLinksHTML, "buildMobileNavLinksHTML");
__name2(buildMobileNavLinksHTML, "buildMobileNavLinksHTML");
async function getCachedJSON(context, origin, assetPath, ttlSeconds) {
  const assetURL = new URL(assetPath, origin);
  const fetchFresh = /* @__PURE__ */ __name2(() => context.env.ASSETS.fetch(new Request(assetURL.toString())), "fetchFresh");
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
__name(getCachedJSON, "getCachedJSON");
__name2(getCachedJSON, "getCachedJSON");
var NAV_ORDER_CACHE_TTL_SECONDS = 300;
var SEARCH_INDEX_CACHE_TTL_SECONDS = 300;
function getSearchIndexResponse(context, origin) {
  return getCachedJSON(context, origin, "/search-index.json", SEARCH_INDEX_CACHE_TTL_SECONDS);
}
__name(getSearchIndexResponse, "getSearchIndexResponse");
__name2(getSearchIndexResponse, "getSearchIndexResponse");
async function onRequest(context) {
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
    getCachedJSON(context, url.origin, "/nav-order.json", NAV_ORDER_CACHE_TTL_SECONDS)
  ]);
  let [headerHTML, footerHTML] = await Promise.all([
    headerRes.ok ? headerRes.text() : Promise.resolve(""),
    footerRes.ok ? footerRes.text() : Promise.resolve("")
  ]);
  let searchIndex = [];
  try {
    if (searchIndexRes.ok) {
      searchIndex = await searchIndexRes.json();
    }
  } catch (err) {
    searchIndex = [];
  }
  let navOrder = {};
  try {
    if (navOrderRes.ok) {
      navOrder = await navOrderRes.json();
    }
  } catch (err) {
    navOrder = {};
  }
  if (headerHTML) {
    const navFills = [
      ["nav-links-electrical", buildDesktopNavLinksHTML("Electrical", searchIndex, navOrder)],
      ["nav-links-mechanical", buildDesktopNavLinksHTML("Mechanical", searchIndex, navOrder)],
      ["nav-links-finance", buildDesktopNavLinksHTML("Financial", searchIndex, navOrder)],
      ["mobile-links-electrical", buildMobileNavLinksHTML("Electrical", searchIndex, navOrder)],
      ["mobile-links-mechanical", buildMobileNavLinksHTML("Mechanical", searchIndex, navOrder)],
      ["mobile-links-finance", buildMobileNavLinksHTML("Financial", searchIndex, navOrder)]
    ];
    for (const [id, html] of navFills) {
      headerHTML = headerHTML.replace(`id="${id}"></div>`, `id="${id}">${html}</div>`);
    }
  }
  const relatedHTML = buildRelatedCalculatorsHTML(url.pathname, searchIndex);
  const breadcrumbHTML = buildBreadcrumbHTML(url.pathname, searchIndex);
  return new HTMLRewriter().on("head", new PrependToHead()).on("head", new AppendCommonScriptToHead()).on('div[class*="lg:col-span-3"][class*="border-gray-100"]', new AddCalcInputPanelClass()).on('div[class*="lg:col-span-2"][class*="flex-col"][class*="gap-4"]', new AddResultPanelId()).on('button[onclick^="calculate"]', new AddScrollToResultOnClick()).on('button.share-result-btn[onclick*="openShareModal"]', new RewriteShareButtonOnClick()).on("#site-header", new ReplaceWithHTML(headerHTML)).on("#site-header", new InsertAfter('<main id="main-content">')).on("#breadcrumb", new InjectHTML(breadcrumbHTML)).on("#site-footer", new InsertBefore(relatedHTML)).on("#site-footer", new InsertBefore("</main>")).on("#site-footer", new InjectHTML(footerHTML)).transform(response);
}
__name(onRequest, "onRequest");
__name2(onRequest, "onRequest");
var routes = [
  {
    routePath: "/",
    mountPath: "/",
    method: "",
    middlewares: [onRequest],
    modules: []
  }
];
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
__name2(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name2(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name2(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name2(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name2(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name2(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
__name2(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
__name2(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name2(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
__name2(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
__name2(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
__name2(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
__name2(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
__name2(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
__name2(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
__name2(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");
__name2(pathToRegexp, "pathToRegexp");
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
__name2(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name2(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name2(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name2((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
var drainBody = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  static {
    __name(this, "___Facade_ScheduledController__");
  }
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name2(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name2((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name2((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// ../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// ../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError2(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-JHGvNh/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = middleware_loader_entry_default;

// ../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-JHGvNh/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class ___Facade_ScheduledController__2 {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler2(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
//# sourceMappingURL=functionsWorker-0.24242882345773975.js.map
