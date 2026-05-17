/**
 * ExamReady — Native Ad Placeholders  |  native-ads.js
 * =====================================================
 * WHAT THIS DOES
 *   • Shows tasteful, site-themed native ad cards while you wait for
 *     AdSense approval or when a slot has no real ad code yet.
 *   • The moment you paste real AdSense <script>/<ins> code into any
 *     slot in Admin → Ad Manager, that slot switches to the real ad
 *     automatically — no code changes needed.
 *   • Every slot respects the enable/disable toggle in the admin panel.
 *   • Zero popups. Zero overlays. Inline only.
 *
 * HOW TO ADD TO YOUR SITE
 *   Add ONE line to every public page after animations.js:
 *     <script src="native-ads.js"></script>
 *
 *   Or use the patch-ads.sh script — it already injects this for you.
 *
 * SLOT BEHAVIOUR
 *   Slot enabled + real AdSense code  → show real ad  (ads.js handles)
 *   Slot enabled + no code            → show native placeholder (this file)
 *   Slot disabled                     → show nothing
 *
 * ADMIN CONTROL
 *   Admin → Ad Manager → toggle or paste code → Save Slot
 *   All changes are instant site-wide (localStorage).
 */

(function () {
  'use strict';

  /* ── Skip admin page ── */
  const PAGE = (window.location.pathname.split('/').pop() || 'index.html');
  if (PAGE === 'admin.html') return;
  if (document.body.dataset.erNativeAds === '1') return;
  document.body.dataset.erNativeAds = '1';

  /* ================================================================
     1. STORAGE HELPERS
     ================================================================ */
  function getSlot(key) {
    try {
      return JSON.parse(localStorage.getItem('er_ad_slots') || '{}')[key] || {};
    } catch (e) { return {}; }
  }

  function slotEnabled(key) {
    return getSlot(key).enabled !== false;
  }

  function hasRealCode(key) {
    return !!((getSlot(key).adCode || '').trim());
  }

  /* Show native placeholder only when: enabled AND no real code set */
  function shouldShowNative(key) {
    return slotEnabled(key) && !hasRealCode(key);
  }

  /* ================================================================
     2. INJECT SHARED STYLES (once)
     ================================================================ */
  function injectStyles() {
    if (document.getElementById('er-native-styles')) return;
    const s = document.createElement('style');
    s.id = 'er-native-styles';
    s.textContent = `
      /* ── Base wrapper ── */
      .er-native {
        font-family: 'Nunito', sans-serif;
        width: 100%;
        box-sizing: border-box;
      }

      /* ── Strip (top / pre-footer) ── */
      .er-native-strip {
        background: linear-gradient(140deg, #fff8f7, #fff2f0);
        border: 1.5px solid rgba(232,33,26,.12);
        border-radius: 20px;
        padding: 16px 20px;
        position: relative;
        overflow: hidden;
        transition: border-color .25s ease, box-shadow .25s ease;
      }
      .er-native-strip:hover {
        border-color: rgba(232,33,26,.25);
        box-shadow: 0 6px 24px rgba(232,33,26,.07);
      }
      .er-native-strip::before {
        content: '';
        position: absolute; top: 0; left: 0; right: 0; height: 3px;
        background: linear-gradient(90deg, #e8211a, #ff7a50, #ffb347);
      }
      .er-native-strip-label {
        font-size: 9px; font-weight: 900; text-transform: uppercase;
        letter-spacing: 2px; color: rgba(232,33,26,.5);
        margin-bottom: 12px; display: flex; align-items: center; gap: 6px;
      }
      .er-native-strip-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }
      .er-native-strip-card {
        background: #fff;
        border: 1px solid #f0f0f2;
        border-radius: 14px;
        padding: 14px 12px;
        text-align: center;
        text-decoration: none;
        color: inherit;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 7px;
        cursor: pointer;
        transition: border-color .2s ease, transform .2s ease, box-shadow .2s ease;
      }
      .er-native-strip-card:hover {
        border-color: rgba(232,33,26,.28);
        transform: translateY(-2px);
        box-shadow: 0 5px 16px rgba(232,33,26,.09);
      }
      .er-native-strip-icon { font-size: 22px; line-height: 1; }
      .er-native-strip-title {
        font-size: 11.5px; font-weight: 900; color: #1a1a1a; line-height: 1.35;
      }
      .er-native-strip-sub {
        font-size: 10px; font-weight: 700; color: #888;
      }

      /* ── Inline card ── */
      .er-native-inline {
        background: linear-gradient(140deg, #fafafa, #f4f4f6);
        border: 1.5px solid #e8e8ea;
        border-radius: 18px;
        padding: 18px 22px;
        display: flex;
        align-items: center;
        gap: 16px;
        position: relative;
        overflow: hidden;
        transition: border-color .25s, box-shadow .25s;
      }
      .er-native-inline:hover {
        border-color: rgba(232,33,26,.25);
        box-shadow: 0 7px 24px rgba(232,33,26,.08);
      }
      .er-native-inline::before {
        content: '';
        position: absolute; top: 0; left: 0; right: 0; height: 3px;
        background: linear-gradient(90deg, #e8211a, #ff8d66);
      }
      .er-native-inline-spon {
        position: absolute; top: 9px; right: 13px;
        font-size: 8px; font-weight: 900; text-transform: uppercase;
        letter-spacing: 1.5px; color: rgba(232,33,26,.4);
      }
      .er-native-inline-icon {
        width: 54px; height: 54px; border-radius: 15px; flex-shrink: 0;
        background: linear-gradient(135deg, #fff0ec, #ffd5ce);
        display: flex; align-items: center; justify-content: center;
        font-size: 26px;
        box-shadow: 0 4px 14px rgba(232,33,26,.13);
      }
      .er-native-inline-body { flex: 1; min-width: 0; }
      .er-native-inline-tag {
        font-size: 9.5px; font-weight: 900; text-transform: uppercase;
        letter-spacing: 1.5px; color: rgba(232,33,26,.7); margin-bottom: 4px;
      }
      .er-native-inline-title {
        font-size: 15px; font-weight: 900; color: #1a1a1a;
        line-height: 1.35; margin-bottom: 4px;
      }
      .er-native-inline-desc {
        font-size: 12.5px; color: #777; font-weight: 700; line-height: 1.55;
      }
      .er-native-inline-cta {
        flex-shrink: 0;
        background: #e8211a; color: #fff;
        padding: 10px 18px; border-radius: 11px;
        font-size: 12.5px; font-weight: 900;
        text-decoration: none; white-space: nowrap; cursor: pointer;
        border: none; font-family: inherit;
        transition: background .2s, transform .2s, box-shadow .2s;
      }
      .er-native-inline-cta:hover {
        background: #c41a14;
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(232,33,26,.3);
      }

      /* ── Banner (dark, results / pre-footer) ── */
      .er-native-banner {
        background: linear-gradient(135deg, #0d0d0d 0%, #1a0505 55%, #2a0a0a 100%);
        border-radius: 22px;
        padding: 28px 34px;
        display: flex; align-items: center;
        justify-content: space-between;
        gap: 24px; flex-wrap: wrap;
        position: relative; overflow: hidden;
        box-shadow: 0 18px 50px rgba(0,0,0,.14);
      }
      .er-native-banner::before {
        content: '';
        position: absolute; top: 0; left: 0; right: 0; height: 3px;
        background: linear-gradient(90deg, #e8211a, #ff8d66, #ffb347);
      }
      .er-native-banner::after {
        content: '';
        position: absolute; right: -60px; top: -60px;
        width: 240px; height: 240px; border-radius: 50%;
        background: radial-gradient(circle, rgba(232,33,26,.16), transparent 68%);
        pointer-events: none;
      }
      .er-native-banner-spon {
        font-size: 9px; font-weight: 900; text-transform: uppercase;
        letter-spacing: 2px; color: rgba(232,33,26,.45); margin-bottom: 8px;
      }
      .er-native-banner-title {
        font-size: clamp(17px, 3vw, 22px);
        font-weight: 900; color: #fff; margin-bottom: 8px; line-height: 1.2;
      }
      .er-native-banner-desc {
        font-size: 13px; color: rgba(255,255,255,.5);
        font-weight: 600; line-height: 1.7; max-width: 560px;
      }
      .er-native-banner-cta {
        flex-shrink: 0; background: #e8211a; color: #fff;
        padding: 14px 26px; border-radius: 12px;
        font-size: 13.5px; font-weight: 900;
        text-decoration: none; white-space: nowrap;
        position: relative; z-index: 1; cursor: pointer; border: none;
        font-family: inherit;
        box-shadow: 0 6px 22px rgba(232,33,26,.38);
        transition: background .2s, transform .2s, box-shadow .2s;
      }
      .er-native-banner-cta:hover {
        background: #c41a14;
        transform: translateY(-3px);
        box-shadow: 0 14px 36px rgba(232,33,26,.44);
      }

      /* ── Mini (between sections) ── */
      .er-native-mini {
        background: #fff;
        border: 1px solid #e8e8ea;
        border-radius: 14px;
        padding: 13px 18px;
        display: flex; align-items: center; gap: 12px;
        position: relative; overflow: hidden;
        transition: border-color .2s, box-shadow .2s;
      }
      .er-native-mini:hover {
        border-color: rgba(232,33,26,.22);
        box-shadow: 0 5px 16px rgba(232,33,26,.07);
      }
      .er-native-mini::before {
        content: '';
        position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
        background: linear-gradient(180deg, #e8211a, #ff8d66);
      }
      .er-native-mini-icon { font-size: 22px; flex-shrink: 0; }
      .er-native-mini-body { flex: 1; min-width: 0; }
      .er-native-mini-title {
        font-size: 13px; font-weight: 900; color: #1a1a1a;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .er-native-mini-sub {
        font-size: 11px; color: #888; font-weight: 700;
      }
      .er-native-mini-cta {
        flex-shrink: 0;
        background: #fff0f0; color: #e8211a;
        padding: 7px 14px; border-radius: 8px;
        font-size: 11.5px; font-weight: 900;
        text-decoration: none; white-space: nowrap; cursor: pointer;
        border: none; font-family: inherit;
        transition: background .2s;
      }
      .er-native-mini-cta:hover { background: #ffe0de; }
      .er-native-mini-spon {
        position: absolute; top: 6px; right: 9px;
        font-size: 8px; font-weight: 900; text-transform: uppercase;
        letter-spacing: 1.5px; color: rgba(0,0,0,.2);
      }

      /* ── Sidebar sticky ── */
      #er-native-sticky {
        position: fixed; right: 20px; top: 50%;
        transform: translateY(-50%);
        width: 170px; z-index: 900;
        background: #fff;
        border: 1px solid #e4e4e7;
        border-radius: 20px;
        box-shadow: 0 16px 48px rgba(0,0,0,.14);
        overflow: hidden;
        opacity: 0; pointer-events: none;
        transition: opacity .4s ease;
      }
      #er-native-sticky.er-visible {
        opacity: 1; pointer-events: auto;
      }
      .er-native-sticky-close {
        position: absolute; top: 7px; right: 7px;
        width: 22px; height: 22px;
        background: rgba(0,0,0,.07); border: none; border-radius: 50%;
        cursor: pointer; font-size: 10px; color: #888; z-index: 2;
        display: flex; align-items: center; justify-content: center;
        transition: background .2s;
      }
      .er-native-sticky-close:hover {
        background: rgba(232,33,26,.12); color: #e8211a;
      }
      .er-native-sticky-cover {
        height: 74px; display: flex; align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #0d0d0d, #1a0505);
        font-size: 28px;
      }
      .er-native-sticky-body { padding: 13px 14px 16px; }
      .er-native-sticky-tag {
        font-size: 9px; font-weight: 900; text-transform: uppercase;
        letter-spacing: 1.5px; color: #e8211a; margin-bottom: 5px;
      }
      .er-native-sticky-title {
        font-size: 13px; font-weight: 900; color: #1a1a1a;
        line-height: 1.38; margin-bottom: 5px;
      }
      .er-native-sticky-desc {
        font-size: 11px; color: #888; font-weight: 700;
        line-height: 1.55; margin-bottom: 12px;
      }
      .er-native-sticky-cta {
        display: block; width: 100%;
        background: #e8211a; color: #fff; text-align: center;
        padding: 9px; border-radius: 9px;
        font-size: 12px; font-weight: 900;
        text-decoration: none; cursor: pointer; border: none;
        font-family: inherit;
        transition: background .2s;
      }
      .er-native-sticky-cta:hover { background: #c41a14; }

      /* ── Mobile bottom bar ── */
      #er-native-mba {
        position: fixed; bottom: 0; left: 0; right: 0;
        z-index: 1300;
        background: #fff;
        border-top: 1px solid #e8e8ea;
        box-shadow: 0 -5px 28px rgba(0,0,0,.11);
        transform: translateY(100%);
        transition: transform .4s cubic-bezier(.22,1,.36,1);
        pointer-events: none;
      }
      #er-native-mba.er-visible {
        transform: translateY(0); pointer-events: auto;
      }
      .er-native-mba-inner {
        display: flex; align-items: center;
        gap: 12px; padding: 9px 14px;
        min-height: 56px; max-width: 100%; overflow: hidden;
      }
      .er-native-mba-icon {
        width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
        background: linear-gradient(135deg, #fff0ec, #ffd5ce);
        display: flex; align-items: center; justify-content: center;
        font-size: 20px;
      }
      .er-native-mba-body { flex: 1; min-width: 0; }
      .er-native-mba-spon {
        font-size: 8px; font-weight: 900; text-transform: uppercase;
        letter-spacing: 1.5px; color: rgba(232,33,26,.5); line-height: 1;
      }
      .er-native-mba-title {
        font-size: 12.5px; font-weight: 900; color: #1a1a1a;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .er-native-mba-cta {
        flex-shrink: 0; background: #e8211a; color: #fff;
        padding: 9px 14px; border-radius: 10px;
        font-size: 11.5px; font-weight: 900;
        text-decoration: none; white-space: nowrap; cursor: pointer;
        border: none; font-family: inherit;
        transition: background .2s;
      }
      .er-native-mba-cta:hover { background: #c41a14; }
      .er-native-mba-close {
        flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%;
        background: #f0f0f0; border: none; cursor: pointer;
        font-size: 12px; color: #666;
        display: flex; align-items: center; justify-content: center;
        transition: background .2s;
      }
      .er-native-mba-close:hover { background: #fdd; color: #e8211a; }
      body.er-has-mba-native { padding-bottom: 66px !important; }

      /* ── Wrapper spacing ── */
      .er-native-wrap-top,
      .er-native-wrap-inline,
      .er-native-wrap-results {
        max-width: 1200px; margin: 0 auto;
        padding: 0 24px;
      }
      .er-native-wrap-top    { margin-bottom: 0; padding-top: 12px; }
      .er-native-wrap-inline { margin: 20px auto; }
      .er-native-wrap-between { max-width: 1200px; margin: 0 auto 20px; padding: 0 24px; }
      .er-native-wrap-footer { max-width: 1200px; margin: 16px auto; padding: 0 24px; }
      .er-native-wrap-results { margin: 20px auto; }

      /* ── Responsive ── */
      @media (max-width: 768px) {
        .er-native-wrap-top,
        .er-native-wrap-inline,
        .er-native-wrap-between,
        .er-native-wrap-footer,
        .er-native-wrap-results { padding: 0 16px; }
        .er-native-strip-grid { grid-template-columns: 1fr 1fr; }
        .er-native-strip-grid > *:last-child { display: none; }
        .er-native-inline { flex-wrap: wrap; }
        .er-native-inline-cta { width: 100%; text-align: center; justify-content: center; margin-top: 6px; }
        .er-native-banner { flex-direction: column; text-align: center; padding: 22px 18px; }
        .er-native-banner-cta { width: 100%; text-align: center; }
        #er-native-mba { display: block; }
      }
      @media (min-width: 769px)  { #er-native-mba { display: none !important; } }
      @media (max-width: 1279px) { #er-native-sticky { display: none !important; } }
      @media (prefers-reduced-motion: reduce) {
        #er-native-sticky, #er-native-mba,
        .er-native-strip-card, .er-native-inline-cta,
        .er-native-banner-cta, .er-native-mini-cta {
          transition: none !important;
        }
      }
    `;
    document.head.appendChild(s);
  }

  /* ================================================================
     3. NATIVE AD CONTENT LIBRARY
        Change these to match your actual affiliate partners / sponsors.
        Each card group maps to a slot key.
     ================================================================ */
  const NATIVE_CONTENT = {
    top: {
      type: 'strip',
      cards: [
        { icon: '📄', title: 'PYQ Solver',      sub: 'Solved past papers'   },
        { icon: '🎯', title: 'Mock Tests',       sub: 'Chapter-wise MCQs'   },
        { icon: '📖', title: 'NCERT Solutions',  sub: 'Class 9–12 free PDF' },
      ]
    },
    top_banner: {
      type: 'strip',
      cards: [
        { icon: '🔬', title: 'Science Notes',   sub: 'Quick revision'      },
        { icon: '📐', title: 'Maths Shortcuts', sub: 'Board exam tricks'   },
        { icon: '📝', title: 'Sample Papers',   sub: 'Latest CBSE format'  },
      ]
    },
    inline: {
      type: 'inline',
      icon: '🎯', tag: 'Sponsored',
      title: 'Practice with 500+ CBSE chapter-wise MCQs',
      desc:  'Timed mock tests, instant results, and detailed solutions for every question.',
      cta:   'Try Free Quiz →'
    },
    inline_1: {
      type: 'inline',
      icon: '📄', tag: 'Sponsored',
      title: 'Download free PYQ papers for Class 9–12',
      desc:  'Previous year board papers with answers — all subjects, all classes, free PDF.',
      cta:   'Get Free PDFs →'
    },
    inline_2: {
      type: 'inline',
      icon: '📖', tag: 'Sponsored',
      title: 'NCERT solutions — chapter by chapter',
      desc:  'Detailed, readable solutions for every chapter. Board-ready language.',
      cta:   'Read Solutions →'
    },
    inline_3: {
      type: 'mini',
      icon: '✏️',
      title: 'Chapter-wise question banks — free download',
      sub:   'All subjects · Class 9–12 · PDF & online'
    },
    between: {
      type: 'mini',
      icon: '🎯',
      title: 'Quick 10-question quiz on this topic',
      sub:   'Instant results · No login needed'
    },
    between_sections: {
      type: 'mini',
      icon: '📐',
      title: 'Formula sheet for this chapter — free PDF',
      sub:   'Download in one click · No sign-up'
    },
    results: {
      type: 'banner',
      title: 'You just finished studying — test yourself now',
      desc:  'Take a timed chapter quiz and see exactly where your gaps are before the board exam.',
      cta:   'Start Mock Test →'
    },
    results_banner: {
      type: 'banner',
      title: 'Boost your board exam score with PYQ practice',
      desc:  'Solved previous year questions with detailed explanations — free for all CBSE classes.',
      cta:   'Get Free PYQs →'
    },
    solution_mid: {
      type: 'inline',
      icon: '🧪', tag: 'Sponsored',
      title: 'Struggling with this topic? Try a 5-min quiz',
      desc:  'Instantly check your understanding with chapter-wise MCQs designed for CBSE boards.',
      cta:   'Take Quiz Now →'
    },
    quiz_sidebar: {
      type: 'inline',
      icon: '📚', tag: 'Sponsored',
      title: 'Download the complete question bank',
      desc:  'Chapter-wise PDF — all important questions with detailed answers.',
      cta:   'Get PDF Free →'
    },
    pdf_viewer: {
      type: 'mini',
      icon: '📄',
      title: 'Find more PYQs, notes & solutions for this subject',
      sub:   'Browse Class 9–12 resources — all free'
    },
    footer: {
      type: 'strip',
      cards: [
        { icon: '📚', title: 'Question Banks', sub: 'Chapter-wise · Free'   },
        { icon: '🎯', title: 'Online Quizzes', sub: 'MCQ practice · Free'   },
        { icon: '📖', title: 'CBSE Solutions', sub: 'Readable articles'     },
      ]
    },
    pre_footer: {
      type: 'strip',
      cards: [
        { icon: '📄', title: 'PYQ Papers',   sub: 'All years · All subjects' },
        { icon: '🔬', title: 'Science Notes', sub: 'Board-ready summaries'  },
        { icon: '✏️', title: 'Practice Quiz', sub: 'Instant results'        },
      ]
    },
    /* sticky / mobile use their own dedicated renderer */
    sticky: {
      icon: '🎯', tag: 'Partner Offer',
      title: 'Premium CBSE mock tests & notes',
      desc:  'Structured practice with detailed answers. Thousands of CBSE students already use it.',
      cta:   'Explore Now →'
    },
    sidebar_sticky: {
      icon: '📚', tag: 'Free Download',
      title: 'PYQ papers for all classes & subjects',
      desc:  'All previous year question papers — free PDF, no sign-up.',
      cta:   'Download Free →'
    },
    mobile_bottom: {
      icon: '🎯',
      title: 'Quick chapter quiz — test yourself now',
      cta:   'Take Quiz →'
    }
  };

  /* ================================================================
     4. HTML BUILDERS
     ================================================================ */
  function buildStrip(data) {
    const cardsHtml = (data.cards || []).map(c => `
      <div class="er-native-strip-card" onclick="return false;" role="button" tabindex="0">
        <span class="er-native-strip-icon">${c.icon}</span>
        <span class="er-native-strip-title">${c.title}</span>
        <span class="er-native-strip-sub">${c.sub}</span>
      </div>`).join('');
    return `
      <div class="er-native er-native-strip">
        <div class="er-native-strip-label">Recommended for Students</div>
        <div class="er-native-strip-grid">${cardsHtml}</div>
      </div>`;
  }

  function buildInline(data) {
    return `
      <div class="er-native er-native-inline">
        <div class="er-native-inline-spon">Sponsored</div>
        <div class="er-native-inline-icon">${data.icon || '📚'}</div>
        <div class="er-native-inline-body">
          <div class="er-native-inline-tag">${data.tag || 'Sponsored'}</div>
          <div class="er-native-inline-title">${data.title}</div>
          <div class="er-native-inline-desc">${data.desc}</div>
        </div>
        <button class="er-native-inline-cta" onclick="return false;">${data.cta || 'Learn More →'}</button>
      </div>`;
  }

  function buildBanner(data) {
    return `
      <div class="er-native er-native-banner">
        <div>
          <div class="er-native-banner-spon">Sponsored Placement</div>
          <div class="er-native-banner-title">${data.title}</div>
          <div class="er-native-banner-desc">${data.desc}</div>
        </div>
        <button class="er-native-banner-cta" onclick="return false;">${data.cta || 'Learn More →'}</button>
      </div>`;
  }

  function buildMini(data) {
    return `
      <div class="er-native er-native-mini">
        <div class="er-native-mini-spon">Sponsored</div>
        <div class="er-native-mini-icon">${data.icon || '📚'}</div>
        <div class="er-native-mini-body">
          <div class="er-native-mini-title">${data.title}</div>
          <div class="er-native-mini-sub">${data.sub || ''}</div>
        </div>
        <button class="er-native-mini-cta" onclick="return false;">View →</button>
      </div>`;
  }

  function buildNativeHtml(key) {
    const data = NATIVE_CONTENT[key];
    if (!data) return '';
    switch (data.type) {
      case 'strip':   return buildStrip(data);
      case 'inline':  return buildInline(data);
      case 'banner':  return buildBanner(data);
      case 'mini':    return buildMini(data);
      default:        return '';
    }
  }

  function wrapAndInject(html, wrapClass, dataset) {
    if (!html) return null;
    const div = document.createElement('div');
    div.className = wrapClass;
    if (dataset) div.dataset.erNativeSlot = dataset;
    div.innerHTML = html;
    return div;
  }

  function alreadyPresent(key) {
    return !!(
      document.querySelector(`[data-er-native-slot="${key}"]`) ||
      document.querySelector(`[data-er-ad-slot="${key}"]`) ||
      document.querySelector(`[data-ad-slot="${key}"]`)
    );
  }

  /* ================================================================
     5. PLACEMENT INJECTORS
     ================================================================ */

  /* ── Top Banner ── */
  function injectTop() {
    if (!shouldShowNative('top') || alreadyPresent('top')) return;
    const hero = document.querySelector('.page-hero, .hero, section.hero');
    const main = document.querySelector('main');
    const el = wrapAndInject(buildNativeHtml('top'), 'er-native-wrap-top', 'top');
    if (!el) return;
    if (hero) hero.insertAdjacentElement('afterend', el);
    else if (main) main.insertAdjacentElement('afterbegin', el);
  }

  /* ── Inline mid-content ── */
  function injectInline() {
    const main = document.querySelector('main');
    if (!main) return;
    const kids = Array.from(main.children).filter(
      c => !c.dataset.erNativeSlot && !c.dataset.erAdSlot && !c.matches('script,style')
    );
    if (kids.length < 2) return;

    const slots = [
      { key: 'inline',   idx: 1 },
      { key: 'inline_1', idx: 1 },
      { key: 'inline_2', idx: 3 },
      { key: 'inline_3', idx: 5 },
    ];

    /* Only inject whichever single slot is appropriate */
    for (const s of slots) {
      if (!shouldShowNative(s.key) || alreadyPresent(s.key)) continue;
      const anchor = kids[Math.min(s.idx, kids.length - 1)];
      if (!anchor) continue;
      const el = wrapAndInject(buildNativeHtml(s.key), 'er-native-wrap-inline', s.key);
      if (el) { anchor.insertAdjacentElement('beforebegin', el); break; }
    }
  }

  /* ── Between class/chapter sections ── */
  function injectBetween() {
    const keys = ['between', 'between_sections'];
    for (const key of keys) {
      if (!shouldShowNative(key) || alreadyPresent(key)) continue;
      const sections = document.querySelectorAll('.class-section, .stream-section, .subject-group');
      if (sections.length < 2) break;
      const target = sections[Math.min(1, sections.length - 1)];
      const el = wrapAndInject(buildNativeHtml(key), 'er-native-wrap-between', key);
      if (el) { target.insertAdjacentElement('afterend', el); break; }
    }
  }

  /* ── Pre-footer ── */
  function injectFooter() {
    const footer = document.querySelector('footer');
    if (!footer) return;
    const keys = ['footer', 'pre_footer'];
    for (const key of keys) {
      if (!shouldShowNative(key) || alreadyPresent(key)) continue;
      const el = wrapAndInject(buildNativeHtml(key), 'er-native-wrap-footer', key);
      if (el) { footer.insertAdjacentElement('beforebegin', el); break; }
    }
  }

  /* ── Results / post-article ── */
  function injectResults() {
    const keys = ['results', 'results_banner'];
    for (const key of keys) {
      if (!shouldShowNative(key) || alreadyPresent(key)) continue;
      /* quiz result card */
      const resultCard = document.querySelector('.result-card');
      if (resultCard) {
        const el = wrapAndInject(buildNativeHtml(key), 'er-native-wrap-results', key);
        if (el) { resultCard.insertAdjacentElement('afterend', el); break; }
      }
      /* solution article */
      const articleFoot = document.querySelector('.article-foot, .article-card');
      if (articleFoot) {
        const el = wrapAndInject(buildNativeHtml(key), 'er-native-wrap-results', key);
        if (el) { articleFoot.insertAdjacentElement('afterend', el); break; }
      }
    }
  }

  /* ── Solution mid-article ── */
  function injectSolutionMid() {
    if (!PAGE.includes('solution-post') || !shouldShowNative('solution_mid') || alreadyPresent('solution_mid')) return;
    const body = document.querySelector('.article-body');
    if (!body) return;
    const paras = body.querySelectorAll('p');
    const midPara = paras[Math.floor(paras.length / 2)];
    if (!midPara) return;
    const el = wrapAndInject(buildNativeHtml('solution_mid'), 'er-native-wrap-inline', 'solution_mid');
    if (el) midPara.insertAdjacentElement('beforebegin', el);
  }

  /* ── PDF viewer slot ── */
  function injectPdfViewer() {
    if (!PAGE.includes('pdf-viewer') || !shouldShowNative('pdf_viewer') || alreadyPresent('pdf_viewer')) return;
    const viewer = document.getElementById('pdfViewerArea') || document.getElementById('fallbackWrap');
    if (!viewer) return;
    const el = wrapAndInject(buildNativeHtml('pdf_viewer'), 'er-native-wrap-inline', 'pdf_viewer');
    if (el) {
      viewer.insertAdjacentElement('beforebegin', el);
      if (typeof window.resizeViewer === 'function') setTimeout(window.resizeViewer, 0);
    }
  }

  /* ── Quiz sidebar ── */
  function injectQuizSidebar() {
    if (!PAGE.includes('quiz') || !shouldShowNative('quiz_sidebar') || alreadyPresent('quiz_sidebar')) return;
    const tryInject = () => {
      const sideStack = document.querySelector('.side-stack');
      if (!sideStack || alreadyPresent('quiz_sidebar')) return;
      const el = wrapAndInject(buildNativeHtml('quiz_sidebar'), 'er-native-wrap-inline', 'quiz_sidebar');
      if (el) { sideStack.appendChild(el); obs.disconnect(); }
    };
    const obs = new MutationObserver(tryInject);
    obs.observe(document.getElementById('quizMount') || document.body, { childList: true, subtree: true });
    tryInject();
  }

  /* ── Sticky desktop sidebar ── */
  function injectSticky() {
    if (window.innerWidth < 1280) return;
    const key = shouldShowNative('sticky') ? 'sticky' : shouldShowNative('sidebar_sticky') ? 'sidebar_sticky' : null;
    if (!key) return;
    if (document.getElementById('er-native-sticky') || document.getElementById('er-sticky-sidebar') || document.getElementById('er-sticky-sidebar-v3')) return;
    if (sessionStorage.getItem('er_sticky_native_dismissed') === '1') return;

    const data = NATIVE_CONTENT[key] || {};
    const wrap = document.createElement('div');
    wrap.id = 'er-native-sticky';
    wrap.dataset.erNativeSlot = key;
    wrap.innerHTML = `
      <button class="er-native-sticky-close" aria-label="Close ad" onclick="
        this.closest('#er-native-sticky').classList.remove('er-visible');
        sessionStorage.setItem('er_sticky_native_dismissed','1');
        setTimeout(()=>this.closest('#er-native-sticky').remove(),420);
      ">✕</button>
      <div class="er-native-sticky-cover">${data.icon || '🎯'}</div>
      <div class="er-native-sticky-body">
        <div class="er-native-sticky-tag">${data.tag || 'Sponsor'}</div>
        <div class="er-native-sticky-title">${data.title || 'Study smarter'}</div>
        <div class="er-native-sticky-desc">${data.desc || 'Free resources for CBSE students.'}</div>
        <button class="er-native-sticky-cta" onclick="return false;">${data.cta || 'Explore →'}</button>
      </div>`;
    document.body.appendChild(wrap);

    /* Show after 2s scroll delay */
    setTimeout(() => {
      if (sessionStorage.getItem('er_sticky_native_dismissed') === '1') return;
      if (window.scrollY > 200) wrap.classList.add('er-visible');
    }, 2200);
    window.addEventListener('scroll', () => {
      if (sessionStorage.getItem('er_sticky_native_dismissed') === '1') return;
      wrap.classList.toggle('er-visible', window.scrollY > 300);
    }, { passive: true });
  }

  /* ── Mobile sticky bottom bar ── */
  function injectMobileBottom() {
    if (window.innerWidth > 768) return;
    if (!shouldShowNative('mobile_bottom')) return;
    if (document.getElementById('er-native-mba') || document.getElementById('er-mobile-bottom') || document.getElementById('er-mobile-bottom-v3')) return;
    if (sessionStorage.getItem('er_mba_native_dismissed') === '1') return;

    const data = NATIVE_CONTENT.mobile_bottom || {};
    const bar = document.createElement('div');
    bar.id = 'er-native-mba';
    bar.dataset.erNativeSlot = 'mobile_bottom';
    bar.innerHTML = `
      <div class="er-native-mba-inner">
        <div class="er-native-mba-icon">${data.icon || '🎯'}</div>
        <div class="er-native-mba-body">
          <div class="er-native-mba-spon">Sponsored</div>
          <div class="er-native-mba-title">${data.title || 'Free CBSE resources'}</div>
        </div>
        <button class="er-native-mba-cta" onclick="return false;">${data.cta || 'View →'}</button>
        <button class="er-native-mba-close" onclick="
          this.closest('#er-native-mba').classList.remove('er-visible');
          document.body.classList.remove('er-has-mba-native');
          sessionStorage.setItem('er_mba_native_dismissed','1');
          setTimeout(()=>this.closest('#er-native-mba').remove(),420);
        " aria-label="Close">✕</button>
      </div>`;
    document.body.appendChild(bar);

    setTimeout(() => {
      bar.classList.add('er-visible');
      document.body.classList.add('er-has-mba-native');
    }, 3500);
  }

  /* ================================================================
     6. MAIN RUNNER
     ================================================================ */
  function run() {
    injectStyles();
    injectTop();
    injectInline();
    injectFooter();
    injectResults();
    injectSolutionMid();
    injectPdfViewer();
    injectQuizSidebar();

    /* Deferred — wait for dynamic content to render */
    setTimeout(injectBetween, 300);
    setTimeout(injectSticky,  600);
    setTimeout(injectMobileBottom, 100);

    /* Re-check dynamic pages (quiz result appears after user finishes) */
    const quizMount = document.getElementById('quizMount');
    if (quizMount) {
      new MutationObserver(injectResults).observe(quizMount, { childList: true, subtree: false });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  /* ================================================================
     7. LIVE RELOAD
        If admin updates slots while the page is open, re-run after
        a short debounce so new real-code slots switch instantly.
     ================================================================ */
  let _reloadTimer = null;
  window.addEventListener('storage', e => {
    if (e.key !== 'er_ad_slots') return;
    clearTimeout(_reloadTimer);
    _reloadTimer = setTimeout(() => {
      /* Remove all native placeholders and re-inject */
      document.querySelectorAll('[data-er-native-slot]').forEach(el => el.remove());
      document.getElementById('er-native-sticky')?.remove();
      document.getElementById('er-native-mba')?.remove();
      document.body.classList.remove('er-has-mba-native');
      document.body.dataset.erNativeAds = '0';
      run();
      document.body.dataset.erNativeAds = '1';
    }, 500);
  });

})();
