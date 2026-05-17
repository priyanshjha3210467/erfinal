/* ============================================================
   unified-chrome.js — ExamReady Unified Header + Banner
   Add to every page AFTER shared.js:
     <script src="unified-chrome.js"></script>

   What it does:
   1. Replaces any existing <header> with the unified dark header
   2. Provides  buildBanner({…})  to create consistent page banners
   3. Patches toggleMenu() for the mobile hamburger
   ============================================================ */
(function () {
  'use strict';

  /* ─── 1. BUILD UNIFIED HEADER ─────────────────────────── */
  function buildHeader() {
    const current   = resolveCurrentNavTarget ? resolveCurrentNavTarget() : (window.location.pathname.split('/').pop() || 'index.html');
    const navItems  = typeof getNavItems === 'function' ? getNavItems() : DEFAULT_NAV_ITEMS_FALLBACK;

    const navHtml = navItems.map(item => {
      const isActive = item.url === current;
      const safeUrl = typeof sanitizeNavigationUrl === 'function' ? sanitizeNavigationUrl(item.url, 'index.html') : item.url;
      return `<a href="${escapeHtml(safeUrl)}"${isActive ? ' class="active"' : ''}>${escapeHtml(item.label)}</a>`;
    }).join('');

    return `
      <!-- Logo -->
      <a class="er-logo" href="index.html">
        <div class="er-logo-mark">ER</div>
        <span class="er-logo-text">Exam<em>Ready</em></span>
      </a>

      <!-- Desktop Nav -->
      <nav class="er-nav" id="mainNav">${navHtml}</nav>

      <!-- Right actions -->
      <div class="er-header-right">
        <button class="er-btn er-btn-sm"
          style="background:rgba(232,33,26,.14);color:var(--red);border:1px solid rgba(232,33,26,.28);padding:6px 13px;"
          onclick="window.location.href='admin.html'">⚙ Admin</button>
        <button class="er-hamburger" id="erHamburger" onclick="erToggleMenu()"
          aria-label="Open menu"
          style="display:none;flex-direction:column;gap:5px;cursor:pointer;padding:7px;background:none;border:none;">
          <span style="width:22px;height:2px;background:#fff;border-radius:2px;display:block;transition:.28s"></span>
          <span style="width:22px;height:2px;background:#fff;border-radius:2px;display:block;transition:.28s"></span>
          <span style="width:22px;height:2px;background:#fff;border-radius:2px;display:block;transition:.28s"></span>
        </button>
      </div>`;
  }

  /* ─── 2. INJECT HEADER ─────────────────────────────────── */
  function injectHeader() {
    const header = document.querySelector('header');
    if (!header) return;

    // Add unified class if missing
    if (!header.classList.contains('er-header')) {
      header.classList.add('er-header');
    }

    header.innerHTML = buildHeader();

    // Show hamburger on small screens
    const hamburger = document.getElementById('erHamburger');
    if (hamburger) {
      const mq = window.matchMedia('(max-width: 768px)');
      const syncHamburger = () => {
        hamburger.style.display = mq.matches ? 'flex' : 'none';
      };
      syncHamburger();
      mq.addEventListener('change', syncHamburger);
    }

    // Mobile menu styles (injected once)
    if (!document.getElementById('er-mobile-nav-style')) {
      const style = document.createElement('style');
      style.id = 'er-mobile-nav-style';
      style.textContent = `
        @media (max-width: 768px) {
          .er-header .er-nav { display: none !important; }
          .er-header .er-nav.er-open {
            display: flex !important;
            flex-direction: column;
            position: absolute;
            top: 100%;
            left: 0; right: 0;
            background: rgba(13,13,13,.97);
            border-bottom: 1px solid rgba(255,255,255,.07);
            padding: 10px 16px 16px;
            gap: 2px;
            z-index: 999;
          }
          .er-header .er-nav.er-open a {
            width: 100%;
            padding: 9px 14px;
            border-radius: 8px;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /* ─── 3. MOBILE TOGGLE ─────────────────────────────────── */
  window.erToggleMenu = function () {
    const nav = document.getElementById('mainNav');
    if (nav) nav.classList.toggle('er-open');
  };

  // Backwards compat
  window.toggleMenu = window.erToggleMenu;

  /* ─── 4. BUILD BANNER HELPER ───────────────────────────── */
  /**
   * buildBanner(opts) — returns HTML string for the unified .er-banner
   *
   * opts = {
   *   crumbs   : [{label, href|onclick}]  // breadcrumb trail
   *   chips    : [{label, accent?}]        // small pill tags
   *   title    : string                    // <h1> text (HTML allowed)
   *   subtitle : string                    // grey subtext
   *   stats    : [{num, label}]            // bottom stat pills
   *   backHref : string                    // if set, shows ← back button
   *   backLabel: string
   * }
   */
  window.buildBanner = function (opts = {}) {
    const { crumbs = [], chips = [], title = '', subtitle = '', stats = [], backHref, backLabel } = opts;

    const safe = typeof escapeHtml === 'function' ? escapeHtml : (v => String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'));
    const safeNav = typeof sanitizeAnnouncementUrl === 'function'
      ? (href, fallback = '#') => sanitizeAnnouncementUrl(href, fallback)
      : (href, fallback = '#') => href || fallback;

    const crumbsHtml = crumbs.map((c, i) => `
      ${i > 0 ? '<span class="er-crumb-sep">›</span>' : ''}
      ${c.href ? `<a class="er-crumb" href="${safe(safeNav(c.href, '#'))}">${safe(c.label)}</a>` : `<span class="er-crumb" ${c.onclick ? `onclick="${c.onclick}"` : ''}>${safe(c.label)}</span>`}
    `).join('');

    const chipsHtml = chips.map(c =>
      `<span class="er-chip ${c.accent ? 'er-chip-accent' : 'er-chip-dim'}">${safe(c.label)}</span>`
    ).join('');

    const statsHtml = stats.map(s =>
      `<div class="er-stat-pill"><strong>${safe(String(s.num))}</strong><span>${safe(s.label)}</span></div>`
    ).join('');

    return `
      <section class="er-banner">
        <div class="er-banner-glow"></div>
        <div class="er-banner-inner">
          ${crumbs.length ? `<div class="er-crumbs">${crumbsHtml}</div>` : ''}
          ${backHref ? `<a class="er-back-btn" href="${safe(safeNav(backHref, '#'))}">← ${safe(backLabel || 'Back')}</a>` : ''}
          ${chips.length ? `<div class="er-banner-chips">${chipsHtml}</div>` : ''}
          <h1>${title}</h1>
          ${subtitle ? `<p class="er-banner-sub">${safe(subtitle)}</p>` : ''}
          ${stats.length ? `<div class="er-banner-stats">${statsHtml}</div>` : ''}
        </div>
      </section>`;
  };

  /* ─── 5. ATTACH BANNER TO EXISTING HEROES ──────────────── */
  /**
   * If the page already has a .page-hero or .hero element, this wraps it
   * in .er-banner styling. Existing hero-inner content is preserved inside
   * the new banner-inner div.
   */
  function upgradeExistingHero() {
    const oldHero = document.querySelector('.page-hero, .hero');
    if (!oldHero || oldHero.dataset.erUpgraded) return;
    oldHero.dataset.erUpgraded = '1';

    // Add canonical class
    if (!oldHero.classList.contains('er-banner')) {
      oldHero.classList.add('er-banner');
    }

    // Wrap inner content if not already wrapped
    let inner = oldHero.querySelector('.page-hero-inner, .hero-inner, .hero-content');
    if (inner && !inner.classList.contains('er-banner-inner')) {
      inner.classList.add('er-banner-inner');
    }

    // Inject glow if missing
    if (!oldHero.querySelector('.er-banner-glow')) {
      const glow = document.createElement('div');
      glow.className = 'er-banner-glow';
      oldHero.insertBefore(glow, oldHero.firstChild);
    }
  }

  /* ─── 6. FALLBACK NAV ──────────────────────────────────── */
  const DEFAULT_NAV_ITEMS_FALLBACK = [
    { label: 'Home',      url: 'index.html' },
    { label: 'Class 9',   url: 'class9.html' },
    { label: 'Class 10',  url: 'class10.html' },
    { label: 'Class 11',  url: 'class11.html' },
    { label: 'Class 12',  url: 'class12.html' },
    { label: 'Solutions', url: 'solutions.html' },
    { label: 'Notes',     url: 'notes.html' },
    { label: 'PYQs',      url: 'pyq.html' },
    { label: 'Quizzes',   url: 'quizzes.html' },
  ];

  /* ─── 7. BOOT ──────────────────────────────────────────── */
  function boot() {
    injectHeader();
    upgradeExistingHero();

    // Re-sync body top padding with actual header height
    const header = document.querySelector('header.er-header');
    if (header) {
      const sync = () => {
        document.body.style.setProperty('--header-height', header.offsetHeight + 'px');
      };
      sync();
      window.addEventListener('resize', sync, { passive: true });
    }

    // Close mobile menu on link click
    document.addEventListener('click', e => {
      const nav = document.getElementById('mainNav');
      if (!nav) return;
      if (e.target.closest('#mainNav a')) nav.classList.remove('er-open');
      if (!e.target.closest('header')) nav.classList.remove('er-open');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
