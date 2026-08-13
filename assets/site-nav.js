document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;

  // -----------------------------------------------------------------------
  // Header is position:sticky (see partials/header.html), so it already
  // occupies real space in normal document flow — no page-content push
  // needed. --header-height is still tracked live via ResizeObserver
  // purely to size the mobile menu overlay and desktop dropdown-panel
  // max-height caps in theme.css (both height varies with breakpoint,
  // since mobile wraps the search bar onto its own row).
  // -----------------------------------------------------------------------
  const siteHeader = document.querySelector(".site-header");
  // Cached header height in px, kept in sync by setHeaderOffset() below.
  // onScrollFrame() (further down) reads this instead of calling
  // siteHeader.offsetHeight directly on every scroll frame — that direct
  // read was showing up in PageSpeed/DevTools as a "forced reflow"
  // (siteHeader.offsetHeight forces a synchronous layout whenever layout
  // is dirty, and on a high-frequency scroll handler that adds up).
  // Reading this cached number instead touches zero DOM geometry, so it
  // can never force a reflow.
  let headerHeight = 80;
  if (siteHeader) {
    // Wrapped in requestAnimationFrame so the offsetHeight read (which
    // forces a synchronous layout if it runs right after a DOM/style
    // change) happens on the next paint frame instead of forcing an
    // immediate reflow mid-script. Avoids the "forced reflow" pattern
    // Chrome DevTools flags for reading a geometric property right after
    // invalidating layout, without changing the measured value itself.
    const setHeaderOffset = () => {
      requestAnimationFrame(() => {
        headerHeight = siteHeader.offsetHeight || headerHeight;
        document.documentElement.style.setProperty("--header-height", headerHeight + "px");
      });
    };
    setHeaderOffset();
    if (window.ResizeObserver) {
      new ResizeObserver(setHeaderOffset).observe(siteHeader);
    } else {
      window.addEventListener("resize", setHeaderOffset);
    }
  }

  // ---------------------------------------------------------------------
  // Hero Lottie animation — centralized so every page just needs a
  // <div id="hero-lottie"></div> in its hero section. Loads the
  // lottie-web library once (only when a hero-lottie element is
  // actually present on the page), then plays the shared animation
  // JSON inside it. Adding the animation to a new page is now a
  // one-line HTML change — no per-page <script> block needed.
  // ---------------------------------------------------------------------
  const heroLottieEl = document.getElementById("hero-lottie");
  if (heroLottieEl) {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const playHeroLottie = () => {
      // Clear the static SVG poster right before Lottie takes over the
      // container, so there's no double-render flash.
      heroLottieEl.innerHTML = "";
      lottie.loadAnimation({
        container: heroLottieEl,
        renderer: "svg",
        loop: true,
        autoplay: !prefersReducedMotion,
        path: "/assets/electromechcalc-hero.json"
      });
    };

    const loadLottieScript = () => {
      if (typeof lottie !== "undefined") {
        playHeroLottie();
        return;
      }
      const lottieScript = document.createElement("script");
      // lottie_light: SVG-renderer-only build (no expressions/interactivity
      // support we don't use for a simple looping hero animation) — much
      // smaller download than the full lottie.min.js bundle. Self-hosted
      // under /assets so the site doesn't depend on cdnjs.cloudflare.com
      // (also lets the CSP script-src drop that origin entirely).
      lottieScript.src = "/assets/lottie-light.min.js";
      lottieScript.onload = playHeroLottie;
      document.head.appendChild(lottieScript);
    };

    // A static SVG poster is already painted inside #hero-lottie by the
    // server-rendered HTML, so it's safe to push the real animation off
    // the critical path entirely — start it once the browser is idle
    // (falls back to window "load" on browsers without
    // requestIdleCallback, e.g. Safari) instead of on DOMContentLoaded.
    // This stops the CDN script fetch + JSON fetch chain from competing
    // with LCP-critical resources on first paint.
    if (window.requestIdleCallback) {
      requestIdleCallback(loadLottieScript, { timeout: 3000 });
    } else {
      window.addEventListener("load", loadLottieScript);
    }
  }

  // ---------------------------------------------------------------------
  // Header hide-on-scroll-down / show-on-scroll-up / show-near-top
  //
  // - At the top (hero section in view) -> always shown
  // - Scrolling up                      -> shown
  // - Scrolling down past the top       -> hidden
  // .site-header stays position:sticky (theme.css) — this only toggles a
  // transform via the .site-header-hidden class, so the "stuck to top"
  // behavior itself is untouched.
  // ---------------------------------------------------------------------

  // ---------------------------------------------------------------------
  // Floating buttons — separate up-arrow, down-arrow, and feedback icon.
  // Independent of the header:
  //   - Scrolling down -> down-arrow + feedback show
  //   - Scrolling up    -> up-arrow + feedback show
  //   - Idle ~700ms after scrolling stops -> all hide
  // Both header and floating-button logic run off one shared scroll
  // listener (rAF-throttled) to avoid adding extra scroll handlers.
  // ---------------------------------------------------------------------
  const fabContainer = document.createElement("div");
  fabContainer.className = "scroll-fab-container";
  fabContainer.innerHTML = `
    <button type="button" class="scroll-fab scroll-fab-up" aria-label="Scroll to top">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 19V5M5 12l7-7 7 7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <a href="mailto:support@electromechcalc.com" class="scroll-fab scroll-fab-message" aria-label="Send feedback">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </a>
    <button type="button" class="scroll-fab scroll-fab-down" aria-label="Scroll down">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12l7 7 7-7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  `;
  document.body.appendChild(fabContainer);

  fabContainer.querySelector(".scroll-fab-up").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  fabContainer.querySelector(".scroll-fab-down").addEventListener("click", () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  });

  // Header reveal threshold: the real bottom of the hero section (not
  // just headerHeight) — pages with a tall hero (e.g. homepage) were
  // scrolling past headerHeight (~80px) almost immediately while still
  // visually inside the hero, so an idle stop in that zone left the
  // header hidden even though the page was still "in the hero". Falls
  // back to headerHeight on pages without a hero (most calculator
  // pages), keeping their existing near-top-reveal behavior.
  let heroBottom = headerHeight;
  const heroSection = heroLottieEl ? heroLottieEl.closest("section") : null;
  const updateHeroBottom = () => {
    heroBottom = heroSection
      ? heroSection.getBoundingClientRect().bottom + window.scrollY
      : headerHeight;
  };
  updateHeroBottom();
  window.addEventListener("resize", updateHeroBottom);

  if (siteHeader || fabContainer) {
    const HIDE_DELAY_MOBILE = 1000;   // ms of no scroll before floating buttons hide (mobile)
    const HIDE_DELAY_DESKTOP = 2500;  // ms of no scroll before floating buttons hide (desktop)
    const isDesktop = () => window.matchMedia("(min-width: 768px)").matches;
    const SCROLL_DELTA = 2;   // ignore only true jitter — low enough that slow/gentle scrolls still register
    let lastScrollY = window.scrollY;
    let scrollTicking = false;
    let idleTimer = null;

    const hideFabs = () => {
      fabContainer.classList.remove("is-visible", "dir-up", "dir-down");
    };
    hideFabs();

    const onScrollFrame = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;
      const mobileMenuOpen = mobileNav && !mobileNav.classList.contains("hidden");

      if (!mobileMenuOpen) {
        // Header: cached headerHeight/heroBottom (kept fresh by the
        // ResizeObserver/resize listener above) instead of a live
        // offsetHeight/getBoundingClientRect read here, so this never
        // forces a reflow on a high-frequency scroll handler.
        if (siteHeader) {
          if (currentScrollY <= heroBottom) {
            siteHeader.classList.remove("site-header-hidden");
          } else if (delta > SCROLL_DELTA) {
            siteHeader.classList.add("site-header-hidden");
          } else if (delta < -SCROLL_DELTA) {
            siteHeader.classList.remove("site-header-hidden");
          }
        }

        // Floating down/up/feedback buttons.
        if (delta > SCROLL_DELTA) {
          fabContainer.classList.add("is-visible", "dir-down");
          fabContainer.classList.remove("dir-up");
          clearTimeout(idleTimer);
          idleTimer = setTimeout(hideFabs, isDesktop() ? HIDE_DELAY_DESKTOP : HIDE_DELAY_MOBILE);
        } else if (delta < -SCROLL_DELTA) {
          fabContainer.classList.add("is-visible", "dir-up");
          fabContainer.classList.remove("dir-down");
          clearTimeout(idleTimer);
          idleTimer = setTimeout(hideFabs, isDesktop() ? HIDE_DELAY_DESKTOP : HIDE_DELAY_MOBILE);
        }
      }

      lastScrollY = currentScrollY;
      scrollTicking = false;
    };

    window.addEventListener("scroll", () => {
      if (!scrollTicking) {
        requestAnimationFrame(onScrollFrame);
        scrollTicking = true;
      }
    }, { passive: true });
  }

  // Desktop + Mobile toggles
  const toggles = document.querySelectorAll(".themeToggle");
  const labels = document.querySelectorAll(".themeLabel");
  const moonIcons = document.querySelectorAll(".themeIconMoon");
  const sunIcons = document.querySelectorAll(".themeIconSun");

  function applyTheme(theme) {
    document.documentElement.classList.remove("dark-theme", "light-theme");
    body.classList.remove("dark-theme", "light-theme");
    document.documentElement.classList.add(theme);
    body.classList.add(theme);

    const dark = theme === "dark-theme";

    // Update labels
    labels.forEach(label => {
      label.textContent = dark ? "Light Mode" : "Dark Mode";
    });

    // Update icons
    moonIcons.forEach(icon => {
      icon.classList.toggle("hidden", !dark);
    });

    sunIcons.forEach(icon => {
      icon.classList.toggle("hidden", dark);
    });

    // Let screen readers know the current on/off state of the toggle.
    toggles.forEach(toggle => {
      toggle.setAttribute("aria-pressed", dark ? "true" : "false");
    });

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute("content", dark ? "#0B1220" : "#ffffff");
    }

    localStorage.setItem("emc-theme", theme);
  }

  // Load saved theme
  let savedTheme = localStorage.getItem("emc-theme");
  if (savedTheme !== "dark-theme" && savedTheme !== "light-theme") {
    savedTheme = null;
  }
  const theme = savedTheme ??
    (window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark-theme"
      : "light-theme");

  applyTheme(theme);

  // Toggle from any button
  toggles.forEach(toggle => {
    toggle.addEventListener("click", () => {
      const nextTheme = body.classList.contains("dark-theme")
        ? "light-theme"
        : "dark-theme";

      applyTheme(nextTheme);
    });
  });

  // ---------------------------------------------------------------------
  // Scroll reveal — any element with class="reveal-on-scroll" (see
  // theme.css) fades/slides in once it enters the viewport. Uses
  // IntersectionObserver so it costs nothing until elements are near
  // the viewport, and unobserves after reveal (one-shot, no re-hide
  // on scroll back up).
  // ---------------------------------------------------------------------
  const revealEls = document.querySelectorAll(".reveal-on-scroll");
  if (revealEls.length) {
    if (window.IntersectionObserver) {
      const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

      revealEls.forEach(el => revealObserver.observe(el));
    } else {
      // No IntersectionObserver support — just show everything.
      revealEls.forEach(el => el.classList.add("active"));
    }
  }

  // Mobile menu
  const menuToggle = document.getElementById("menuToggle");
  const mobileNav = document.getElementById("mobileNav");

  if (menuToggle && mobileNav) {
    menuToggle.addEventListener("click", () => {
      mobileNav.classList.toggle("hidden");
      const isOpen = !mobileNav.classList.contains("hidden");
      menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      document.body.style.overflow = isOpen ? "hidden" : "";
    });
  }

  // ---------------------------------------------------------------------
  // Active link highlighting (all top-level + dropdown + mobile nav links)
  //
  // Normalizes "/" and "/index.html" to the same value so the Home link
  // (which lives outside the dropdown markup) is matched too, not just
  // .nav-dropdown-link / .mobile-sublink items.
  // ---------------------------------------------------------------------
  const normalizePath = path => {
    let trimmed = (path.replace(/\/+$/, "") || "/").replace(/\.html$/i, "");
    if (trimmed === "" || trimmed === "/index") trimmed = "/";
    return trimmed;
  };
  const currentPath = normalizePath(location.pathname);

  document
    .querySelectorAll(".nav-link, .nav-dropdown-link, .mobile-link, .mobile-sublink")
    .forEach(link => {
      const href = link.getAttribute("href");
      // Skip empty/hash/external/protocol-relative links — only compare
      // same-site page paths.
      if (!href || href.startsWith("#") || /^([a-z]+:)?\/\//i.test(href)) return;

      if (normalizePath(href) === currentPath) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      }
    });

  // ---------------------------------------------------------------------
  // Desktop nav dropdowns (Electrical / Mechanical / Financial)
  //
  // Hover-driven with a short close delay so moving the cursor from
  // the trigger button down into the panel doesn't close it early.
  // Click also toggles (keyboard/touch friendly), and clicking
  // outside any dropdown closes all of them.
  // ---------------------------------------------------------------------
  const navDropdowns = document.querySelectorAll(".nav-dropdown");

  function setDropdownState(dropdown, open) {
    dropdown.classList.toggle("nav-dropdown-open", open);
    const trigger = dropdown.querySelector("[aria-expanded]");
    if (trigger) trigger.setAttribute("aria-expanded", open ? "true" : "false");
  }

  navDropdowns.forEach(dropdown => {
    let closeTimer = null;

    dropdown.addEventListener("mouseenter", () => {
      clearTimeout(closeTimer);
      navDropdowns.forEach(d => { if (d !== dropdown) setDropdownState(d, false); });
      setDropdownState(dropdown, true);
    });

    dropdown.addEventListener("mouseleave", () => {
      closeTimer = setTimeout(() => setDropdownState(dropdown, false), 200);
    });

    const trigger = dropdown.querySelector("[aria-expanded]");
    if (trigger) {
      trigger.addEventListener("click", () => {
        const isOpen = dropdown.classList.contains("nav-dropdown-open");
        navDropdowns.forEach(d => setDropdownState(d, false));
        setDropdownState(dropdown, !isOpen);
      });
    }
  });

  document.addEventListener("click", e => {
    navDropdowns.forEach(dropdown => {
      if (!dropdown.contains(e.target)) setDropdownState(dropdown, false);
    });
  });

  // Keyboard: Escape closes any open dropdown (returning focus to its
  // trigger) or, if none are open, closes the mobile menu overlay.
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;

    const openDropdown = Array.from(navDropdowns).find(d =>
      d.classList.contains("nav-dropdown-open")
    );
    if (openDropdown) {
      setDropdownState(openDropdown, false);
      const trigger = openDropdown.querySelector("[aria-expanded]");
      if (trigger) trigger.focus();
      return;
    }

    if (menuToggle && mobileNav && !mobileNav.classList.contains("hidden")) {
      mobileNav.classList.add("hidden");
      menuToggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      menuToggle.focus();
    }
  });

  // ---------------------------------------------------------------------
  // Search
  //
  // Page list is loaded from /search-index.json (generated by
  // build-search-index.js at build time) instead of being hardcoded
  // here. Fetched once per page load and cached, so every keystroke
  // just filters the in-memory array.
  // ---------------------------------------------------------------------
  const searchInput = document.getElementById("siteSearch");
  const searchResults = document.getElementById("searchResults");

  if (searchInput && searchResults) {
    let searchIndexPromise = null;

    function getSearchIndex() {
      if (!searchIndexPromise) {
        searchIndexPromise = fetch("/search-index.json")
          .then(res => {
            if (!res.ok) throw new Error(`search-index.json ${res.status}`);
            return res.json();
          })
          .catch(err => {
            console.error("Search index failed to load:", err);
            // Don't leave a failed fetch cached forever — clear the
            // promise so the NEXT search attempt retries the fetch
            // instead of getting stuck on an empty [] result for the
            // rest of the page's lifetime.
            searchIndexPromise = null;
            return [];
          });
      }
      return searchIndexPromise;
    }

    // Warm the cache as soon as the page loads, so the first
    // keystroke doesn't have to wait on the network.
    getSearchIndex();

    function escapeHTML(str) {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    searchInput.addEventListener("input", () => {
      const q = searchInput.value.trim().toLowerCase();

      if (!q) {
        searchResults.innerHTML = "";
        searchResults.classList.add("hidden");
        return;
      }

      getSearchIndex().then(pages => {
        // Still the latest query? (guards against slow/out-of-order fetches)
        if (searchInput.value.trim().toLowerCase() !== q) return;

        const matches = pages
          .filter(p =>
            p.title.toLowerCase().includes(q) ||
            (p.category && p.category.toLowerCase().includes(q)) ||
            (p.keywords && p.keywords.toLowerCase().includes(q))
          )
          // Rank so a direct title match (e.g. "Transformer Size
          // Calculator" for query "transformer") always outranks a
          // page that only matches via its keywords list (e.g. "CT
          // Ratio Calculator" mentioning "transformer" once in its
          // keywords) — otherwise relevant results could get pushed
          // past the display cap by less-relevant keyword-only hits
          // that simply appear earlier in search-index.json.
          .map(p => {
            const title = p.title.toLowerCase();
            let rank = 2; // keyword/category-only match
            if (title.startsWith(q)) rank = 0;
            else if (title.includes(q)) rank = 1;
            return { p, rank };
          })
          .sort((a, b) => a.rank - b.rank)
          .map(m => m.p);

        if (!matches.length) {
          searchResults.innerHTML = '<div class="search-empty">No results found</div>';
        } else {
          searchResults.innerHTML = matches
            .slice(0, 20)
            .map(p => `<a href="${escapeHTML(p.url)}">${escapeHTML(p.title)}</a>`)
            .join("");
        }

        searchResults.classList.remove("hidden");
      });
    });

    document.addEventListener("click", e => {
      if (!searchResults.contains(e.target) && e.target !== searchInput) {
        searchResults.classList.add("hidden");
      }
    });
  }
});
