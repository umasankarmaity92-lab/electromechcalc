document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;

  // -----------------------------------------------------------------------
  // Header is position:fixed (see partials/header.html). Since it's out of
  // normal flow, push page content down by its actual rendered height so
  // nothing sits underneath it. Height varies (search bar wraps to its own
  // row on mobile), so track it live with ResizeObserver instead of a
  // fixed px guess.
  // -----------------------------------------------------------------------
  const siteHeader = document.querySelector(".site-header");
  if (siteHeader) {
    const setHeaderOffset = () => {
      document.documentElement.style.setProperty("--header-height", siteHeader.offsetHeight + "px");
    };
    setHeaderOffset();
    if (window.ResizeObserver) {
      new ResizeObserver(setHeaderOffset).observe(siteHeader);
    } else {
      window.addEventListener("resize", setHeaderOffset);
    }
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
  const savedTheme = localStorage.getItem("emc-theme");
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
    const trimmed = path.replace(/\/+$/, "") || "/";
    return trimmed === "/" ? "/index.html" : trimmed;
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

        const matches = pages.filter(p =>
          p.title.toLowerCase().includes(q) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.keywords && p.keywords.toLowerCase().includes(q))
        );

        if (!matches.length) {
          searchResults.innerHTML = '<div class="search-empty">No results found</div>';
        } else {
          searchResults.innerHTML = matches
            .slice(0, 8)
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
