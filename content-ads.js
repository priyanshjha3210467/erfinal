/**
 * content-ads.js — ExamReady In-Content Ad Engine v1
 * ====================================================
 * Handles intelligent ad injection inside note posts and
 * solution posts, with full admin control.
 *
 * Settings stored in: localStorage  key: er_content_ads
 * Ad codes use the standard er_ad_slots registry.
 *
 * Include on note-post.html and solution-post.html AFTER ads.js:
 *   <script src="content-ads.js"></script>
 */

(function () {
  'use strict';

  const PAGE = window.location.pathname.split('/').pop() || '';
  const IS_NOTE     = PAGE === 'note-post.html';
  const IS_SOLUTION = PAGE === 'solution-post.html';
  if (!IS_NOTE && !IS_SOLUTION) return;
  if (document.body.dataset.erContentAds === '1') return;
  document.body.dataset.erContentAds = '1';

  /* ================================================================
     DEFAULT SETTINGS
     ================================================================ */
  const DEFAULT_SETTINGS = {
    // Master toggles
    notesEnabled:     true,
    solutionsEnabled: true,

    // Per-position toggles
    notes: {
      beforeSummary:  false,
      afterSummary:   true,
      midContent:     true,
      afterContent:   true,
      beforeMore:     false,
    },
    solutions: {
      beforeSummary:  false,
      afterSummary:   true,
      midContent:     true,
      afterContent:   true,
      beforeMore:     false,
    },

    // Ad density: 1 = light (max 1), 2 = normal (max 2), 3 = heavy (max 3)
    notesDensity:     2,
    solutionsDensity: 2,

    // Min words between ads (prevents two ads too close together)
    minWordsBetween:  80,

    // Slot keys to use per position (maps to er_ad_slots)
    slots: {
      afterSummary:  'note_after_summary',
      midContent:    'note_mid_content',
      afterContent:  'note_after_content',
      beforeMore:    'note_before_more',
      // Solutions use dedicated keys
      sol_afterSummary: 'solution_after_summary',
      sol_midContent:   'solution_mid',       // re-uses existing key
      sol_afterContent: 'solution_after_content',
      sol_beforeMore:   'solution_before_more',
    }
  };

  /* ================================================================
     STORAGE
     ================================================================ */
  function getSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem('er_content_ads') || '{}');
      return deepMerge(DEFAULT_SETTINGS, saved);
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  }

  function deepMerge(base, override) {
    const out = Object.assign({}, base);
    Object.keys(override).forEach(k => {
      if (override[k] && typeof override[k] === 'object' && !Array.isArray(override[k])) {
        out[k] = deepMerge(base[k] || {}, override[k]);
      } else {
        out[k] = override[k];
      }
    });
    return out;
  }

  function getAdSlot(key) {
    try {
      const slots = JSON.parse(localStorage.getItem('er_ad_slots') || '{}');
      return slots[key] || {};
    } catch (e) { return {}; }
  }

  function slotEnabled(key) {
    return getAdSlot(key).enabled !== false;
  }

  function getSlotCode(key) {
    return (getAdSlot(key).adCode || '').trim();
  }

  function hasLiveCode(key) {
    return slotEnabled(key) && !!getSlotCode(key);
  }

  /* ================================================================
     HTML BUILDERS
     ================================================================ */
  function activateScripts(el) {
    el.querySelectorAll('script').forEach(old => {
      const s = document.createElement('script');
      Array.from(old.attributes).forEach(a => s.setAttribute(a.name, a.value));
      s.textContent = old.textContent;
      old.replaceWith(s);
    });
  }

  /**
   * Build a styled in-content ad wrapper around real AdSense code.
   * Falls back to a native-style placeholder if no real code.
   */
  function buildAdUnit(slotKey, position, opts = {}) {
    const code = getSlotCode(slotKey);
    const enabled = slotEnabled(slotKey);
    if (!enabled) return null;

    const wrap = document.createElement('div');
    wrap.dataset.contentAdSlot = slotKey;
    wrap.dataset.contentAdPos  = position;
    wrap.className = 'er-content-ad er-content-ad--' + position;

    if (code) {
      // Real AdSense code
      wrap.innerHTML = `
        <div class="er-content-ad__inner">
          <span class="er-content-ad__label">Sponsored</span>
          <div class="er-content-ad__code">${code}</div>
        </div>`;
      activateScripts(wrap);
    } else if (opts.showPlaceholder !== false) {
      // Native placeholder — only shown when no real code
      wrap.innerHTML = buildNativePlaceholder(slotKey, position, opts);
    } else {
      return null; // Nothing to show
    }

    return wrap;
  }

  function buildNativePlaceholder(slotKey, position, opts = {}) {
    const placeholders = {
      afterSummary: {
        icon: '🎯', tag: 'Sponsored',
        title: 'Boost your board exam score',
        desc: 'Chapter-wise MCQ quizzes with instant results. Practice smarter.',
        cta: 'Try Free Quiz →', href: 'quizzes.html'
      },
      midContent: {
        icon: '📄', tag: 'Sponsored',
        title: 'Download PYQ papers for free',
        desc: 'All previous year question papers — Class 9–12, all subjects.',
        cta: 'Get PYQs →', href: 'pyq.html'
      },
      afterContent: {
        icon: '📚', tag: 'Sponsored',
        title: 'Question banks for every chapter',
        desc: 'Structured practice that covers every CBSE exam pattern.',
        cta: 'Explore →', href: 'questionbank.html'
      },
      beforeMore: {
        icon: '🏆', tag: 'Sponsored',
        title: 'Ready to test yourself?',
        desc: 'Take a timed chapter quiz and see your score instantly.',
        cta: 'Start Quiz →', href: 'quizzes.html'
      },
    };

    const d = placeholders[position] || placeholders.midContent;
    return `
      <div class="er-content-ad__inner er-content-ad__inner--native">
        <span class="er-content-ad__label">Sponsored</span>
        <a class="er-native-inline er-content-ad__native" href="${d.href}" style="text-decoration:none;display:flex;align-items:center;gap:16px">
          <div style="width:50px;height:50px;border-radius:14px;flex-shrink:0;background:linear-gradient(135deg,#fff0ec,#ffd5ce);display:flex;align-items:center;justify-content:center;font-size:24px">${d.icon}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:9.5px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:rgba(232,33,26,.7);margin-bottom:3px">${d.tag}</div>
            <div style="font-size:14.5px;font-weight:900;color:#1a1a1a;line-height:1.35;margin-bottom:3px">${d.title}</div>
            <div style="font-size:12px;color:#777;font-weight:700;line-height:1.55">${d.desc}</div>
          </div>
          <div style="flex-shrink:0;background:#e8211a;color:#fff;padding:9px 16px;border-radius:10px;font-size:12.5px;font-weight:900;white-space:nowrap">${d.cta}</div>
        </a>
      </div>`;
  }

  /* ================================================================
     CSS INJECTION (once)
     ================================================================ */
  function injectStyles() {
    if (document.getElementById('er-content-ads-css')) return;
    const style = document.createElement('style');
    style.id = 'er-content-ads-css';
    style.textContent = `
      /* ── In-Content Ad Wrapper ── */
      .er-content-ad {
        width: 100%;
        margin: 24px 0;
        clear: both;
        font-family: 'Nunito', sans-serif;
      }

      .er-content-ad__inner {
        position: relative;
        overflow: hidden;
        border-radius: 18px;
        border: 1.5px solid rgba(232,33,26,.12);
        background: linear-gradient(140deg, #fffcfc, #fff5f3);
        padding: 16px 18px;
      }

      .er-content-ad__inner::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 3px;
        background: linear-gradient(90deg, #e8211a, #ff7a50, #ffb347);
      }

      .er-content-ad__label {
        position: absolute;
        top: 8px; right: 12px;
        font-size: 8px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        color: rgba(232,33,26,.38);
        font-family: 'Nunito', sans-serif;
      }

      .er-content-ad__code {
        min-height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .er-content-ad__inner--native {
        transition: border-color .2s, box-shadow .2s;
      }

      .er-content-ad__inner--native:hover {
        border-color: rgba(232,33,26,.28);
        box-shadow: 0 8px 28px rgba(232,33,26,.08);
      }

      /* Position-specific tweaks */
      .er-content-ad--afterSummary .er-content-ad__inner {
        background: linear-gradient(140deg, #fffbf0, #fff7e8);
        border-color: rgba(232,33,26,.1);
      }

      .er-content-ad--afterContent .er-content-ad__inner {
        background: linear-gradient(135deg, #0d0d0d, #1a0505);
        border-color: rgba(232,33,26,.3);
      }

      .er-content-ad--afterContent .er-content-ad__label {
        color: rgba(255,255,255,.3);
      }

      .er-content-ad--afterContent .er-native-inline {
        color: #fff !important;
      }

      /* Mobile */
      @media (max-width: 768px) {
        .er-content-ad__inner--native .er-native-inline {
          flex-wrap: wrap;
          gap: 12px;
        }
        .er-content-ad__inner--native .er-native-inline > div:last-of-type {
          width: 100%;
          text-align: center;
        }
      }

      /* Reduce motion */
      @media (prefers-reduced-motion: reduce) {
        .er-content-ad__inner--native { transition: none !important; }
      }
    `;
    document.head.appendChild(style);
  }

  /* ================================================================
     INJECTION HELPERS
     ================================================================ */
  function insertAfterEl(ref, newEl) {
    if (ref && ref.parentNode && newEl) {
      ref.insertAdjacentElement('afterend', newEl);
    }
  }

  function insertBeforeEl(ref, newEl) {
    if (ref && ref.parentNode && newEl) {
      ref.insertAdjacentElement('beforebegin', newEl);
    }
  }

  function appendToEl(parent, newEl) {
    if (parent && newEl) parent.appendChild(newEl);
  }

  // Module-level set tracks injected positions so re-renders that remove
  // DOM elements don't fool alreadyInjected() into stacking a second copy.
  const _injectedPositions = new Set();

  function alreadyInjected(pos) {
    return _injectedPositions.has(pos) ||
           !!document.querySelector(`[data-content-ad-pos="${pos}"]`);
  }

  function markInjected(pos) {
    _injectedPositions.add(pos);
  }

  /* ================================================================
     NOTE POST INJECTOR
     ================================================================ */
  function injectNoteAds() {
    const settings = getSettings();
    if (!settings.notesEnabled) return;

    const positions = settings.notes;
    const slotMap   = settings.slots;
    let injected    = 0;
    const maxAds    = settings.notesDensity || 2;

    // Helper to inject if under density limit
    const tryInject = (pos, slotKey, targetEl, where = 'after') => {
      if (!positions[pos]) return;
      if (injected >= maxAds) return;
      if (alreadyInjected(pos)) return;
      const unit = buildAdUnit(slotKey, pos, { showPlaceholder: true });
      if (!unit) return;
      if (where === 'after') insertAfterEl(targetEl, unit);
      else if (where === 'before') insertBeforeEl(targetEl, unit);
      else if (where === 'append') appendToEl(targetEl, unit);
      markInjected(pos);
      injected++;
    };

    // 1. After summary card
    if (positions.afterSummary) {
      const summary = document.getElementById('summary') ||
                      document.querySelector('.summary-card');
      if (summary) {
        tryInject('afterSummary', slotMap.afterSummary || 'note_after_summary', summary, 'after');
      }
    }

    // 2. Mid content — find the article body, split at ~50%
    if (positions.midContent && injected < maxAds) {
      const body = document.querySelector('.article-body');
      if (body) {
        const paras = Array.from(body.querySelectorAll('p, ul, ol, div.note-callout'));
        const midIdx = Math.floor(paras.length / 2);
        const midEl  = paras[midIdx];
        if (midEl && !alreadyInjected('midContent')) {
          const unit = buildAdUnit(slotMap.midContent || 'note_mid_content', 'midContent', { showPlaceholder: true });
          if (unit) { insertBeforeEl(midEl, unit); markInjected('midContent'); injected++; }
        }
      }
    }

    // 3. After content (after article card)
    if (positions.afterContent && injected < maxAds) {
      const article = document.querySelector('.article-card') ||
                      document.getElementById('note-body');
      if (article) {
        tryInject('afterContent', slotMap.afterContent || 'note_after_content', article, 'after');
      }
    }

    // 4. Before "more notes" section
    if (positions.beforeMore && injected < maxAds) {
      const more = document.getElementById('more-notes') ||
                   document.querySelector('.more-section');
      if (more) {
        tryInject('beforeMore', slotMap.beforeMore || 'note_before_more', more, 'before');
      }
    }
  }

  /* ================================================================
     SOLUTION POST INJECTOR
     ================================================================ */
  function injectSolutionAds() {
    const settings = getSettings();
    if (!settings.solutionsEnabled) return;

    const positions = settings.solutions;
    const slotMap   = settings.slots;
    let injected    = 0;
    const maxAds    = settings.solutionsDensity || 2;

    const tryInject = (pos, slotKey, targetEl, where = 'after') => {
      if (!positions[pos]) return;
      if (injected >= maxAds) return;
      if (alreadyInjected(pos)) return;
      const unit = buildAdUnit(slotKey, pos, { showPlaceholder: true });
      if (!unit) return;
      if (where === 'after') insertAfterEl(targetEl, unit);
      else if (where === 'before') insertBeforeEl(targetEl, unit);
      else if (where === 'append') appendToEl(targetEl, unit);
      markInjected(pos);
      injected++;
    };

    // 1. After summary card
    if (positions.afterSummary) {
      const summary = document.getElementById('summary') ||
                      document.querySelector('.summary-card');
      if (summary) {
        tryInject('afterSummary', slotMap.sol_afterSummary || 'solution_after_summary', summary, 'after');
      }
    }

    // 2. Mid content
    if (positions.midContent && injected < maxAds) {
      const body = document.querySelector('.article-body');
      if (body) {
        const paras = Array.from(body.querySelectorAll('p, ul, ol'));
        const midIdx = Math.floor(paras.length / 2);
        const midEl  = paras[midIdx];
        if (midEl && !alreadyInjected('midContent')) {
          const unit = buildAdUnit(slotMap.sol_midContent || 'solution_mid', 'midContent', { showPlaceholder: true });
          if (unit) { insertBeforeEl(midEl, unit); markInjected('midContent'); injected++; }
        }
      }
    }

    // 3. After content
    if (positions.afterContent && injected < maxAds) {
      const article = document.querySelector('.article-card') ||
                      document.getElementById('solution');
      if (article) {
        tryInject('afterContent', slotMap.sol_afterContent || 'solution_after_content', article, 'after');
      }
    }

    // 4. Before more articles
    if (positions.beforeMore && injected < maxAds) {
      const more = document.getElementById('more-articles') ||
                   document.querySelector('.more-section');
      if (more) {
        tryInject('beforeMore', slotMap.sol_beforeMore || 'solution_before_more', more, 'before');
      }
    }
  }

  /* ================================================================
     MAIN RUNNER
     ================================================================ */
  function run() {
    injectStyles();
    if (IS_NOTE)     injectNoteAds();
    if (IS_SOLUTION) injectSolutionAds();
  }

  // Run after DOM + any dynamic content renders
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(run, 100));
  } else {
    setTimeout(run, 100);
  }

  // Also watch for dynamic re-renders (article body injected asynchronously).
  // Uses a _running lock so concurrent debounced calls can't inject the same
  // position twice when the observer fires multiple times in quick succession.
  let _running = false;
  const targetNode = document.getElementById('pageBody') || document.body;
  let debounceTimer = null;
  new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (_running) return;
      // Only re-run if article body exists AND no positions have been injected
      // yet (checking both DOM and the persistent Set).
      const hasArticle = !!document.querySelector('.article-body');
      const hasAnyInjected = _injectedPositions.size > 0 ||
                             !!document.querySelector('[data-content-ad-pos]');
      if (hasArticle && !hasAnyInjected) {
        _running = true;
        run();
        _running = false;
      }
    }, 350);
  }).observe(targetNode, { childList: true, subtree: true });

  // Re-run if admin changes settings in another tab
  window.addEventListener('storage', e => {
    if (e.key === 'er_content_ads' || e.key === 'er_ad_slots') {
      document.querySelectorAll('[data-content-ad-pos]').forEach(el => el.remove());
      setTimeout(run, 200);
    }
  });

  // Expose for admin preview
  window.erContentAds = { run, getSettings };

})();
