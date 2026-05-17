/* ================================================================
   ExamReady - AdSense placement injector
   ---------------------------------------------------------------
   Admin controls every slot via localStorage key: er_ad_slots.
   This file only injects real ad code. Empty slots stay blank.
   ================================================================ */

(function () {
  'use strict';

  const PAGE = window.location.pathname.split('/').pop() || 'index.html';
  if (PAGE === 'admin.html') return;
  if (document.body.dataset.erAdsV3 === '1') return;
  document.body.dataset.erAdsV3 = '1';

  function getSlot(key) {
    try {
      const slots = JSON.parse(localStorage.getItem('er_ad_slots') || '{}');
      var slot = slots[key] || {};
      // ── Page override merge ──
      try {
        var overrides = JSON.parse(localStorage.getItem('er_ad_slots_overrides') || '{}');
        var pageOvr = overrides[PAGE] || {};
        if (pageOvr[key]) { slot = Object.assign({}, slot, pageOvr[key]); }
      } catch(e) {}
      return slot;
    } catch (e) {
      return {};
    }
  }

  function isEnabled(key) {
    return getSlot(key).enabled !== false;
  }

  function getCode(key) {
    var slot = getSlot(key);
    var code = (slot.adCode || '').trim();
    // ── A/B logic ──
    if (slot.abEnabled && (slot.adCodeB || '').trim()) {
      if (!sessionStorage.getItem('er_ab_group')) {
        sessionStorage.setItem('er_ab_group', Math.random() > 0.5 ? 'A' : 'B');
      }
      code = sessionStorage.getItem('er_ab_group') === 'B' ? (slot.adCodeB || '').trim() : code;
    }
    return code;
  }

  function hasLiveCode(key) {
    return isEnabled(key) && !!getCode(key);
  }

  function ensureCSS() {
    if (document.getElementById('er-ads-css-v3')) return;
    const link = document.createElement('link');
    link.id = 'er-ads-css-v3';
    link.rel = 'stylesheet';
    link.href = 'ads.css';
    document.head.appendChild(link);
  }

  function activateScripts(el) {
    el.querySelectorAll('script').forEach(old => {
      const script = document.createElement('script');
      Array.from(old.attributes).forEach(attr => script.setAttribute(attr.name, attr.value));
      script.textContent = old.textContent;
      old.replaceWith(script);
    });
  }

  function buildSlot(key, wrapClass) {
    if (!hasLiveCode(key)) return null;
    const wrap = document.createElement('div');
    wrap.dataset.adSlot = key;
    wrap.className = wrapClass || 'er-ad-wrap';
    wrap.innerHTML = getCode(key);
    activateScripts(wrap);
    return wrap;
  }

  function insertAfter(ref, el) {
    if (ref && ref.parentNode && el) ref.insertAdjacentElement('afterend', el);
  }

  function insertBefore(ref, el) {
    if (ref && ref.parentNode && el) ref.insertAdjacentElement('beforebegin', el);
  }

  function appendTo(parent, el) {
    if (parent && el) parent.appendChild(el);
  }

  function alreadyInjected(key) {
    return !!document.querySelector(`[data-ad-slot="${key}"]`);
  }

  function sharedPlacementExists(key) {
    return !!document.querySelector(`[data-er-ad-slot="${key}"], [data-native-slot="${key}"]`);
  }

  function injectTopBanner() {
    if (PAGE === 'pdf-viewer.html') return;
    if (alreadyInjected('top_banner') || sharedPlacementExists('top')) return;
    const hero = document.querySelector('.page-hero, .hero, section.hero');
    const main = document.querySelector('main');
    const header = document.querySelector('header');
    const el = buildSlot('top_banner', 'er-ad-wrap er-ad-wrap--top');
    if (hero) insertAfter(hero, el);
    else if (main && el) main.insertAdjacentElement('afterbegin', el);
    else if (header) insertAfter(header, el);
  }

  function injectInlineBreaks() {
    const main = document.querySelector('main');
    if (!main) return;

    const kids = Array.from(main.children).filter(
      el => !el.dataset.adSlot && !el.dataset.erAdSlot && !el.matches('script,style')
    );

    const positions = [
      { key: 'inline_1', idx: 1, sharedKey: 'inline' },
      { key: 'inline_2', idx: 3 },
      { key: 'inline_3', idx: 5 }
    ];

    positions.forEach(({ key, idx, sharedKey }) => {
      if (alreadyInjected(key)) return;
      if (sharedKey && sharedPlacementExists(sharedKey)) return;
      // Skip if page doesn't have enough sections for this position.
      // Previously used Math.min() which collapsed all three breaks to the
      // same last-child anchor when the page had fewer sections than expected.
      if (idx >= kids.length) return;
      const anchor = kids[idx];
      if (!anchor) return;
      const el = buildSlot(key, 'er-ad-wrap er-ad-wrap--inline');
      if (el) insertBefore(anchor, el);
    });
  }

  function injectBetweenSections() {
    if (alreadyInjected('between_sections') || sharedPlacementExists('between')) return;
    const sections = document.querySelectorAll('.class-section, .stream-section, .subject-group');
    if (sections.length < 2) return;

    const first = buildSlot('between_sections', 'er-ad-wrap er-ad-wrap--between');
    if (first) insertAfter(sections[Math.min(1, sections.length - 1)], first);

    if (sections.length >= 4 && !alreadyInjected('between_sections_2')) {
      const second = buildSlot('between_sections', 'er-ad-wrap er-ad-wrap--between');
      if (second) {
        second.dataset.adSlot = 'between_sections_2';
        insertAfter(sections[Math.min(3, sections.length - 1)], second);
      }
    }
  }

  function injectPreFooter() {
    if (alreadyInjected('pre_footer') || sharedPlacementExists('footer')) return;
    const footer = document.querySelector('footer');
    const el = buildSlot('pre_footer', 'er-ad-wrap er-ad-wrap--pre-footer');
    if (footer) insertBefore(footer, el);
  }

  function injectResultsBanner() {
    if (alreadyInjected('results_banner') || sharedPlacementExists('results')) return;
    const resultCard = document.querySelector('.result-card');
    if (resultCard) {
      const el = buildSlot('results_banner', 'er-ad-wrap er-ad-wrap--results');
      if (el) insertAfter(resultCard, el);
      return;
    }

    const articleFoot = document.querySelector('.article-foot');
    if (!articleFoot) return;
    const parent = articleFoot.closest('.article-card');
    const el = buildSlot('results_banner', 'er-ad-wrap er-ad-wrap--results');
    if (parent && el) insertAfter(parent, el);
  }

  function injectSolutionMid() {
    if (PAGE !== 'solution-post.html' || alreadyInjected('solution_mid')) return;
    const body = document.querySelector('.article-body');
    if (!body) return;

    const paras = body.querySelectorAll('p');
    const midPara = paras[Math.floor(paras.length / 2)];
    if (!midPara) return;

    const el = buildSlot('solution_mid', 'er-ad-wrap er-ad-wrap--solution-mid');
    if (el) insertBefore(midPara, el);
  }

  function injectQuizSidebar() {
    if (PAGE !== 'quiz.html' || alreadyInjected('quiz_sidebar') || !hasLiveCode('quiz_sidebar')) return;

    const mount = document.getElementById('quizMount') || document.body;
    const tryInject = () => {
      const sideStack = document.querySelector('.side-stack');
      if (!sideStack || alreadyInjected('quiz_sidebar')) return;
      const el = buildSlot('quiz_sidebar', 'er-ad-wrap er-ad-wrap--quiz-side');
      if (el) {
        appendTo(sideStack, el);
        observer.disconnect();
      }
    };

    const observer = new MutationObserver(tryInject);
    observer.observe(mount, { childList: true, subtree: true });
    tryInject();
  }

  function injectPdfViewerBanner() {
    if (PAGE !== 'pdf-viewer.html' || alreadyInjected('pdf_viewer') || sharedPlacementExists('pdf_viewer')) return;
    const viewer = document.getElementById('pdfViewerArea') || document.getElementById('fallbackWrap');
    if (!viewer) return;
    const el = buildSlot('pdf_viewer', 'er-ad-wrap er-ad-wrap--pdf-viewer er-pdf-ad-slot');
    if (!el) return;
    insertBefore(viewer, el);
    if (typeof window.resizeViewer === 'function') {
      setTimeout(() => window.resizeViewer(), 0);
    }
  }

  function injectStickyDesktop() {
    if (window.innerWidth < 1280) return;
    if (!hasLiveCode('sidebar_sticky')) return;
    if (document.getElementById('er-sticky-sidebar-v3') || document.getElementById('er-sticky-sidebar')) return;
    if (sessionStorage.getItem('er_sticky_v3_dismissed') === '1') return;

    const wrap = document.createElement('div');
    wrap.id = 'er-sticky-sidebar-v3';
    wrap.dataset.adSlot = 'sidebar_sticky';
    wrap.setAttribute('aria-label', 'Sponsored');

    const closeBtn = document.createElement('button');
    closeBtn.className = 'er-sticky-close';
    closeBtn.textContent = 'x';
    closeBtn.setAttribute('aria-label', 'Close ad');
    closeBtn.onclick = () => {
      wrap.classList.remove('er-sticky-visible');
      sessionStorage.setItem('er_sticky_v3_dismissed', '1');
      setTimeout(() => wrap.remove(), 420);
    };
    wrap.appendChild(closeBtn);

    const inner = document.createElement('div');
    inner.style.padding = '10px';
    inner.innerHTML = getCode('sidebar_sticky');
    wrap.appendChild(inner);
    activateScripts(inner);

    document.body.appendChild(wrap);
    setTimeout(() => {
      if (window.scrollY > 150) wrap.classList.add('er-sticky-visible');
    }, 2500);
    window.addEventListener('scroll', () => {
      if (sessionStorage.getItem('er_sticky_v3_dismissed') === '1') return;
      if (window.scrollY > 300) wrap.classList.add('er-sticky-visible');
      else wrap.classList.remove('er-sticky-visible');
    }, { passive: true });
  }

  function injectMobileBottom() {
    if (window.innerWidth > 768) return;
    if (!hasLiveCode('mobile_bottom')) return;
    if (document.getElementById('er-mobile-bottom-v3') || document.getElementById('er-mobile-bottom') || document.getElementById('native-mba')) return;
    if (sessionStorage.getItem('er_mba_v3_dismissed') === '1') return;

    const bar = document.createElement('div');
    bar.id = 'er-mobile-bottom-v3';
    bar.dataset.adSlot = 'mobile_bottom';
    bar.setAttribute('aria-label', 'Sponsored');
    bar.innerHTML = `<div style="padding:8px 14px">${getCode('mobile_bottom')}</div>`;
    activateScripts(bar);
    document.body.appendChild(bar);

    setTimeout(() => {
      bar.classList.add('er-mba-visible');
      document.body.classList.add('er-has-mba');
    }, 3500);
  }

  function run() {
    ensureCSS();
    injectTopBanner();
    injectPreFooter();
    injectResultsBanner();
    injectSolutionMid();
    injectQuizSidebar();
    injectPdfViewerBanner();
    injectStickyDesktop();
    injectMobileBottom();

    const tryDynamic = () => {
      injectInlineBreaks();
      injectBetweenSections();
      injectResultsBanner();
    };

    tryDynamic();
    setTimeout(tryDynamic, 800);
    setTimeout(tryDynamic, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  const quizMount = document.getElementById('quizMount');
  if (quizMount) {
    const observer = new MutationObserver(() => injectResultsBanner());
    observer.observe(quizMount, { childList: true, subtree: false });
  }
})();
