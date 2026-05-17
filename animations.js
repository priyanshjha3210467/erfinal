/* =============================================
   EXAMREADY — ANIMATIONS ENGINE v2
   Include after shared.js on every page:
   <script src="animations.js"></script>
   ============================================= */

(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ─── 1. LOADING SCREEN ──────────────────── */
  function createLoader() {
    const overlay = document.createElement('div');
    overlay.id = 'er-loader';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="er-loader-bg-grid"></div>
      <div class="er-loader-bg-glow"></div>
      <div class="er-loader-content">
        <div class="er-loader-brand">
          <span class="er-brand-chunk">EX</span><span class="er-brand-chunk">A</span><span class="er-brand-chunk">M</span><span class="er-brand-chunk er-space">&nbsp;</span><span class="er-brand-chunk">READY</span>
        </div>
        <div class="er-loader-divider"></div>
        <div class="er-loader-tagline">Your CBSE Study Companion</div>
        <div class="er-loader-bar-wrap">
          <div class="er-loader-bar"></div>
        </div>
        <div class="er-loader-dots">
          <div class="er-loader-dot"></div>
          <div class="er-loader-dot"></div>
          <div class="er-loader-dot"></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function dismissLoader(overlay) {
    if (!overlay || overlay.dataset.dismissed === '1') return;
    overlay.dataset.dismissed = '1';
    overlay.classList.add('er-loader--exit');
    setTimeout(() => {
      if (overlay.isConnected) overlay.remove();
      document.body.style.overflow = '';
    }, 800);
  }

  // Skip loader entirely if body opts out via data-no-loader
  const skipLoader = document.body.hasAttribute('data-no-loader');

  if (!skipLoader) {
    document.body.style.overflow = 'hidden';
  }
  const loaderEl = skipLoader ? null : createLoader();
  const dismissDelay = reduceMotion ? 0 : 1600;

  if (!skipLoader) {
    if (document.readyState === 'complete') {
      setTimeout(() => dismissLoader(loaderEl), dismissDelay);
    } else {
      window.addEventListener('load', function () {
        setTimeout(() => dismissLoader(loaderEl), dismissDelay);
      });
      setTimeout(() => dismissLoader(loaderEl), 3000);
    }
  }


  /* ─── 2. SCROLL PROGRESS BAR ─────────────── */
  function createScrollBar() {
    const bar = document.createElement('div');
    bar.id = 'er-scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        bar.style.width = pct + '%';
        ticking = false;
      });
    }, { passive: true });
  }

  createScrollBar();


  /* ─── 3. HEADER SCROLL EFFECT ────────────── */
  function initHeaderScroll() {
    const header = document.querySelector('header');
    if (!header) return;
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
      const currentScroll = window.scrollY;
      if (currentScroll > 20) {
        header.classList.add('er-scrolled');
      } else {
        header.classList.remove('er-scrolled');
      }
      lastScroll = currentScroll;
    }, { passive: true });
  }

  initHeaderScroll();


  /* ─── 4. INTERSECTION OBSERVER — SCROLL ANIMATIONS ─── */
  let _scrollObserver = null;

  function initScrollAnimations() {
    const targets = document.querySelectorAll(
      '.subject-card, .class-card, .quiz-card, .sol-card, .feature-card, ' +
      '.pdf-item, .qb-card, .post-card, .related-item, .resource-item, ' +
      '.legal-card section, .stat-card, .insight-card, .table-card, .settings-card, ' +
      '.hero-stats .stat, .section-label, .section-divider, .stream-section, ' +
      '.solution-tips-card, .recent-card, .nav-builder-item, .note-card'
    );

    _scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('er-animate', 'er-visible');
          _scrollObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.06,
      rootMargin: '0px 0px -28px 0px'
    });

    targets.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.88) {
        el.classList.add('er-animate', 'er-visible');
        return;
      }
      el.classList.add('er-animate');
      el.style.transitionDelay = '0ms';
      _scrollObserver.observe(el);
    });

    /* Stagger grid siblings */
    document.querySelectorAll(
      '.subject-grid, .class-grid, .quiz-grid, .solutions-grid, ' +
      '.features-grid, .stat-grid, .post-grid, .qb-grid, .stream-grid, .notes-grid'
    ).forEach(grid => {
      grid.classList.add('er-stagger');
      Array.from(grid.children).forEach((child, idx) => {
        child.style.transitionDelay = Math.min(idx * 58, 520) + 'ms';
      });
    });
  }

  /**
   * Re-observe dynamically added cards after DOM updates.
   * Call this after innerHTML re-renders that add new .er-animate elements.
   */
  window.erReobserveAnimations = function(container) {
    if (!_scrollObserver) return;
    const root = container || document;
    root.querySelectorAll('.er-animate:not(.er-visible)').forEach((el, idx) => {
      el.style.transitionDelay = Math.min(idx * 50, 400) + 'ms';
      _scrollObserver.observe(el);
    });
  };


  /* ─── 6. STAT NUMBER COUNTER ─────────────── */
  function countUp(el) {
    const raw = el.textContent.trim();
    const hasPlus = raw.endsWith('+');
    const numStr = raw.replace(/\D/g, '');
    const target = parseInt(numStr, 10);
    if (isNaN(target) || target === 0) return;

    const duration = 1300;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      el.textContent = current.toLocaleString() + (hasPlus ? '+' : '');
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  function initCounters() {
    const statNums = document.querySelectorAll('.stat-num, .mini-stat strong, .stat-card .stat-num');
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          countUp(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    statNums.forEach(el => counterObserver.observe(el));
  }


  /* ─── 7. MAGNETIC + TILT CARD EFFECT ─────── */
  function initMagneticCards() {
    if (reduceMotion) return;

    document.querySelectorAll('.subject-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty('--mx', x + '%');
        card.style.setProperty('--my', y + '%');
      });
    });

    /* Subtle 3D tilt on class cards */
    document.querySelectorAll('.class-card, .quiz-card, .feature-card, .post-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / rect.width;
        const dy = (e.clientY - cy) / rect.height;
        card.style.transform = `translateY(-5px) rotateY(${dx * 4}deg) rotateX(${-dy * 3}deg)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        card.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
        setTimeout(() => { card.style.transition = ''; }, 500);
      });
    });
  }


  /* ─── 8. CLICK RIPPLE EFFECT ─────────────── */
  function initRipple() {
    const rippleTargets = '.btn-primary, .btn-dl, .quiz-btn, .btn-red, .post-link, .resource-link, .filter-btn, .res-tab, .tab-btn, .nav-btn, .auth-btn, .btn';

    document.addEventListener('click', (e) => {
      const btn = e.target.closest(rippleTargets);
      if (!btn) return;

      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height) * 2;

      ripple.style.cssText = `
        position:absolute;
        width:${size}px;
        height:${size}px;
        left:${e.clientX - rect.left}px;
        top:${e.clientY - rect.top}px;
        background:rgba(255,255,255,0.25);
        border-radius:50%;
        transform:translate(-50%,-50%) scale(0);
        animation:er-ripple 0.55s ease-out forwards;
        pointer-events:none;
        z-index:10;
      `;

      const prevPosition = getComputedStyle(btn).position;
      if (prevPosition === 'static') btn.style.position = 'relative';
      btn.style.overflow = 'hidden';
      btn.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });
  }

  initRipple();


  /* ─── 9. SMOOTH ANCHOR LINKS ─────────────── */
  function initSmoothScrollLinks() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  initSmoothScrollLinks();


  /* ─── 10. HAMBURGER ANIMATION ────────────── */
  function initHamburger() {
    document.querySelectorAll('.hamburger span').forEach(span => {
      span.style.transition = 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.22s ease';
    });

    document.querySelectorAll('.hamburger').forEach(hb => {
      hb.addEventListener('click', () => {
        hb.classList.toggle('open');
        const spans = hb.querySelectorAll('span');
        if (hb.classList.contains('open')) {
          spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
          spans[1].style.opacity = '0';
          spans[1].style.transform = 'scaleX(0)';
          spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
        } else {
          spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
        }
      });
    });
  }

  initHamburger();


  /* ─── 11. HERO PARALLAX ──────────────────── */
  function initHeroParallax() {
    if (reduceMotion) return;

    document.querySelectorAll('.hero:not(.hero-static), .page-hero:not(.hero-static)').forEach(hero => {
      hero.addEventListener('mousemove', (e) => {
        const rect = hero.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) - 0.5;
        const y = ((e.clientY - rect.top) / rect.height) - 0.5;
        hero.style.setProperty('--hero-shift-x', `${x * 20}px`);
        hero.style.setProperty('--hero-shift-y', `${y * 16}px`);
      });

      hero.addEventListener('mouseleave', () => {
        hero.style.setProperty('--hero-shift-x', '0px');
        hero.style.setProperty('--hero-shift-y', '0px');
      });
    });
  }

  initHeroParallax();


  /* ─── 12. TYPING EFFECT ──────────────────── */
  function initHeroTyping() {
    const headings = document.querySelectorAll('.hero:not(.hero-static) h1, .page-hero:not(.hero-static) h1');
    if (!headings.length) return;

    function escHtml(v) {
      return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }

    function getOpenTag(el) {
      const attrs = Array.from(el.attributes).map(a => ` ${a.name}="${escHtml(a.value)}"`).join('');
      return `<${el.tagName.toLowerCase()}${attrs}>`;
    }

    function collectTokens(node, wrappers, out) {
      if (node.nodeType === Node.TEXT_NODE) {
        const parts = (node.textContent || '').match(/\S+\s*|\s+/g) || [];
        parts.forEach(part => {
          if (!part) return;
          let html = escHtml(part);
          wrappers.forEach(w => { html = w.open + html + w.close; });
          out.push(html);
        });
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (node.tagName === 'BR') { out.push('<br>'); return; }
      const next = [...wrappers, { open: getOpenTag(node), close: `</${node.tagName.toLowerCase()}>` }];
      Array.from(node.childNodes).forEach(child => collectTokens(child, next, out));
    }

    headings.forEach((heading, index) => {
      if (heading.dataset.erTyped === '1') return;
      heading.dataset.erTyped = '1';
      heading.classList.add('er-typed-heading');
      if (reduceMotion) return;

      const tokens = [];
      Array.from(heading.childNodes).forEach(node => collectTokens(node, [], tokens));
      if (!tokens.length) return;

      let current = 0;
      heading.innerHTML = '<span class="er-typing-caret" aria-hidden="true"></span>';

      const startDelay = 440 + index * 80;
      const stepDelay = Math.max(50, Math.min(110, 900 / tokens.length));

      setTimeout(() => {
        const timer = setInterval(() => {
          current++;
          const done = current >= tokens.length;
          heading.innerHTML = tokens.slice(0, current).join('') + (done ? '' : '<span class="er-typing-caret" aria-hidden="true"></span>');
          if (done) clearInterval(timer);
        }, stepDelay);
      }, startDelay);
    });
  }


  /* ─── 13. QUIZ OPTION FEEDBACK ───────────── */
  function initQuizFeedback() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.opt-btn');
      if (!btn) return;
      btn.style.transform = 'scale(0.96)';
      setTimeout(() => { btn.style.transform = ''; }, 130);
    });
  }

  initQuizFeedback();


  /* ─── 14. QUESTION PALETTE HOVER ─────────── */
  function initPaletteHover() {
    document.addEventListener('mouseover', (e) => {
      const dot = e.target.closest('.question-dot');
      if (!dot) return;
      dot.style.transform = 'scale(1.15)';
    });
    document.addEventListener('mouseout', (e) => {
      const dot = e.target.closest('.question-dot');
      if (!dot) return;
      dot.style.transform = '';
    });
  }

  initPaletteHover();


  /* ─── 15. BACK TO TOP BUTTON ─────────────── */
  function createBackToTop() {
    const btn = document.createElement('button');
    btn.id = 'er-back-top';
    btn.innerHTML = '↑';
    btn.setAttribute('aria-label', 'Back to top');
    btn.style.cssText = `
      position: fixed; bottom: 28px; right: 28px; z-index: 1000;
      width: 46px; height: 46px; border-radius: 50%;
      background: var(--red, #e8211a); color: #fff;
      border: none; cursor: pointer;
      font-size: 20px; font-weight: 900;
      box-shadow: 0 6px 24px rgba(232,33,26,0.4);
      opacity: 0; transform: translateY(16px) scale(0.8);
      transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1), background 0.2s ease, box-shadow 0.2s ease;
      pointer-events: none;
    `;

    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#c41a14';
      btn.style.transform = 'translateY(-3px) scale(1.12)';
      btn.style.boxShadow = '0 10px 32px rgba(232,33,26,0.5)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'var(--red, #e8211a)';
      btn.style.transform = 'translateY(0) scale(1)';
      btn.style.boxShadow = '0 6px 24px rgba(232,33,26,0.4)';
    });

    document.body.appendChild(btn);

    window.addEventListener('scroll', () => {
      if (window.scrollY > 380) {
        btn.style.opacity = '1';
        btn.style.transform = 'translateY(0) scale(1)';
        btn.style.pointerEvents = 'auto';
      } else {
        btn.style.opacity = '0';
        btn.style.transform = 'translateY(16px) scale(0.8)';
        btn.style.pointerEvents = 'none';
      }
    }, { passive: true });
  }


  /* ─── 16. TOAST ENHANCEMENT ─────────────── */
  function patchToast() {
    const originalShowToast = window.showToast;
    if (typeof originalShowToast !== 'function') return;
    window.showToast = function (msg, type = 'success') {
      originalShowToast(msg, type);
      const toast = document.getElementById('toast');
      if (toast) {
        toast.style.transform = 'translateY(0) scale(1.03)';
        setTimeout(() => { toast.style.transform = 'translateY(0) scale(1)'; }, 200);
      }
    };
  }


  /* ─── 17. SMOOTH PANEL OPEN (class pages) ── */
  function initPanelObserver() {
    const wrap = document.getElementById('resourcePanelWrap');
    if (!wrap) return;

    const orig = wrap.className;
    const observer = new MutationObserver(() => {
      if (wrap.classList.contains('open')) {
        wrap.style.transition = 'max-height 0.45s cubic-bezier(0.22, 1, 0.36, 1)';
      }
    });
    observer.observe(wrap, { attributes: true, attributeFilter: ['class'] });
  }


  /* ─── 18. PAGE LINK FADE-OUT ─────────────── */
  function initPageTransitions() {
    // Restore opacity immediately on any new page load (catches cases where
    // syncSharedSiteChrome() runs after the fade-out transition completes).
    document.addEventListener('DOMContentLoaded', () => {
      document.body.style.opacity = '';
      document.body.style.transition = '';
    });
    // Also restore on bfcache restores (back/forward navigation).
    window.addEventListener('pageshow', () => {
      document.body.style.opacity = '';
      document.body.style.transition = '';
    });

    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript') || href.startsWith('http') || link.target === '_blank') return;

      link.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        document.body.style.transition = 'opacity 0.22s ease';
        document.body.style.opacity = '0';
        setTimeout(() => { window.location.href = href; }, 220);
      });
    });
  }

  initPageTransitions();


  /* ─── INIT ALL ───────────────────────────── */
  function init() {
    initScrollAnimations();
    initCounters();
    initMagneticCards();
    initHeroParallax();
    initHeroTyping();
    initSmoothScrollLinks();
    initPaletteHover();
    initPanelObserver();
    createBackToTop();
    patchToast();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
