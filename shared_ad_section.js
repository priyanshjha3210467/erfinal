// ===== AD SYSTEM — FIXED VERSION =====
// Replaces the entire "AD SYSTEM" block in shared.js
// All 17 admin slots are registered; injection key aliases are resolved.

const AD_SLOT_REGISTRY = {
  // ── Global — All Pages ──
  top:              { label:'Top Banner (shared.js)',          enabled:true, adCode:'' },
  top_banner:       { label:'Top Banner (ads.js)',             enabled:true, adCode:'' },
  footer:           { label:'Pre-Footer Banner (shared.js)',   enabled:true, adCode:'' },
  pre_footer:       { label:'Pre-Footer Banner (ads.js)',      enabled:true, adCode:'' },

  // ── In-Content Breaks ──
  inline:           { label:'Inline Break (shared.js)',        enabled:true, adCode:'' },
  inline_1:         { label:'Inline Break 1 (ads.js)',         enabled:true, adCode:'' },
  inline_2:         { label:'Inline Break 2 (ads.js)',         enabled:true, adCode:'' },
  inline_3:         { label:'Inline Break 3 (ads.js)',         enabled:true, adCode:'' },
  between:          { label:'Between Sections (shared.js)',    enabled:true, adCode:'' },
  between_sections: { label:'Between Sections (ads.js)',       enabled:true, adCode:'' },

  // ── High-Intent Pages ──
  results:          { label:'Results / Post-Article (shared)', enabled:true, adCode:'' },
  results_banner:   { label:'Results Banner (ads.js)',         enabled:true, adCode:'' },
  solution_mid:     { label:'Mid-Article (ads.js)',            enabled:true, adCode:'' },
  quiz_sidebar:     { label:'Quiz Sidebar (ads.js)',           enabled:true, adCode:'' },

  // ── Sticky / Persistent ──
  sticky:           { label:'Sticky Sidebar (shared.js)',      enabled:true, adCode:'' },
  sidebar_sticky:   { label:'Sticky Sidebar (ads.js)',         enabled:true, adCode:'' },
  mobile_bottom:    { label:'Mobile Sticky Bottom Bar',        enabled:true, adCode:'' },
};

function getAdSlots() {
  try {
    const saved = JSON.parse(localStorage.getItem('er_ad_slots') || '{}');
    const merged = {};
    Object.entries(AD_SLOT_REGISTRY).forEach(([k, defaults]) => {
      merged[k] = { ...defaults, ...(saved[k] || {}) };
    });
    // Include any extra slots admin may have added
    Object.entries(saved).forEach(([k, v]) => {
      if (!merged[k]) merged[k] = { enabled: true, adCode: '', label: k, ...v };
    });
    return merged;
  } catch(e) {
    return JSON.parse(JSON.stringify(AD_SLOT_REGISTRY));
  }
}

function saveAdSlots(slots) {
  localStorage.setItem('er_ad_slots', JSON.stringify(slots));
}

function _slotEnabled(slots, key) {
  return slots[key]?.enabled !== false;
}

function _slotCode(slots, key) {
  return (slots[key]?.adCode || '').trim();
}

function _buildAdElement(slots, key, wrapperClass) {
  if (!_slotEnabled(slots, key)) return null;
  const code = _slotCode(slots, key);
  if (!code) return null;

  const wrap = document.createElement('div');
  wrap.dataset.erAdSlot = key;
  wrap.className = wrapperClass || 'er-ad-shell';
  wrap.innerHTML = code;
  wrap.querySelectorAll('script').forEach(old => {
    const s = document.createElement('script');
    Array.from(old.attributes).forEach(a => s.setAttribute(a.name, a.value));
    s.textContent = old.textContent;
    old.parentNode.replaceChild(s, old);
  });
  return wrap;
}

function getManagedAdSlotHtml(key) {
  const slots = getAdSlots();
  if (!_slotEnabled(slots, key)) return '';
  const code = _slotCode(slots, key);
  if (!code) return '';
  return `<div data-er-ad-slot="${escapeHtml(key)}" class="er-ad-shell">${code}</div>`;
}

function _injectStickySidebar(slots) {
  // Try shared key 'sticky' first, fall back to ads.js alias 'sidebar_sticky'
  const key = _slotCode(slots, 'sticky') ? 'sticky' : 'sidebar_sticky';
  if (!_slotEnabled(slots, key)) return;
  const code = _slotCode(slots, key);
  if (!code) return;
  if (document.getElementById('er-sticky-sidebar')) return;
  if (sessionStorage.getItem('er_sticky_dismissed') === '1') return;
  if (window.innerWidth < 1280) return;

  const wrap = document.createElement('div');
  wrap.id = 'er-sticky-sidebar';
  wrap.dataset.erAdSlot = key;
  wrap.style.cssText = 'position:fixed;right:18px;top:50%;transform:translateY(-50%);width:160px;z-index:900;background:#fff;border:1px solid #e8e8ea;border-radius:18px;box-shadow:0 12px 40px rgba(0,0,0,0.12);overflow:hidden;opacity:0;pointer-events:none;transition:opacity .4s ease;';

  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = 'position:absolute;top:6px;right:6px;width:20px;height:20px;background:rgba(0,0,0,0.07);border:none;border-radius:50%;cursor:pointer;font-size:10px;color:#888;display:flex;align-items:center;justify-content:center;z-index:2;';
  closeBtn.textContent = '✕';
  closeBtn.setAttribute('aria-label', 'Close ad');
  closeBtn.onclick = () => {
    wrap.style.opacity = '0'; wrap.style.pointerEvents = 'none';
    sessionStorage.setItem('er_sticky_dismissed', '1');
    setTimeout(() => wrap.remove(), 420);
  };
  wrap.appendChild(closeBtn);

  const inner = document.createElement('div');
  inner.style.padding = '10px';
  inner.innerHTML = code;
  wrap.appendChild(inner);
  inner.querySelectorAll('script').forEach(old => {
    const s = document.createElement('script');
    Array.from(old.attributes).forEach(a => s.setAttribute(a.name, a.value));
    s.textContent = old.textContent;
    old.parentNode.replaceChild(s, old);
  });

  document.body.appendChild(wrap);
  setTimeout(() => { wrap.style.opacity = '1'; wrap.style.pointerEvents = 'auto'; }, 2000);
  window.addEventListener('scroll', () => {
    if (sessionStorage.getItem('er_sticky_dismissed') === '1') return;
    if (window.scrollY > 300) { wrap.style.opacity = '1'; wrap.style.pointerEvents = 'auto'; }
  }, { passive: true });
}

function _injectMobileBottom(slots) {
  const key = 'mobile_bottom';
  if (!_slotEnabled(slots, key)) return;
  const code = _slotCode(slots, key);
  if (!code) return;
  if (document.getElementById('er-mobile-bottom')) return;
  if (sessionStorage.getItem('er_mba_dismissed') === '1') return;
  if (window.innerWidth > 768) return;

  const bar = document.createElement('div');
  bar.id = 'er-mobile-bottom';
  bar.dataset.erAdSlot = key;
  bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:1300;background:#fff;border-top:1px solid #e8e8ea;box-shadow:0 -4px 24px rgba(0,0,0,0.12);transform:translateY(100%);transition:transform .4s cubic-bezier(.22,1,.36,1);pointer-events:none;';

  const inner = document.createElement('div');
  inner.style.cssText = 'display:flex;align-items:center;padding:8px 12px;gap:10px;min-height:56px;';
  const lbl = document.createElement('div');
  lbl.style.cssText = 'font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#bbb;';
  lbl.textContent = 'Sponsored';
  const adWrap = document.createElement('div');
  adWrap.style.flex = '1';
  adWrap.innerHTML = code;
  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = 'flex-shrink:0;width:26px;height:26px;border-radius:50%;background:#f0f0f0;border:none;cursor:pointer;font-size:12px;color:#666;';
  closeBtn.textContent = '✕';
  closeBtn.onclick = () => {
    bar.style.transform = 'translateY(100%)';
    document.body.style.paddingBottom = '';
    sessionStorage.setItem('er_mba_dismissed', '1');
    setTimeout(() => bar.remove(), 420);
  };
  inner.appendChild(lbl); inner.appendChild(adWrap); inner.appendChild(closeBtn);
  bar.appendChild(inner);
  document.body.appendChild(bar);

  adWrap.querySelectorAll('script').forEach(old => {
    const s = document.createElement('script');
    Array.from(old.attributes).forEach(a => s.setAttribute(a.name, a.value));
    s.textContent = old.textContent;
    old.parentNode.replaceChild(s, old);
  });

  setTimeout(() => { bar.style.transform = 'translateY(0)'; bar.style.pointerEvents = 'auto'; document.body.style.paddingBottom = '66px'; }, 3000);
}

function _injectBetweenSections(slots) {
  // Try shared key 'between' first, fall back to ads.js alias 'between_sections'
  const key = _slotCode(slots, 'between') ? 'between' : 'between_sections';
  if (!_slotEnabled(slots, key)) return;
  const code = _slotCode(slots, key);
  if (!code) return;
  if (document.querySelector('[data-er-ad-slot="between"],[data-er-ad-slot="between_sections"]')) return;

  const sections = document.querySelectorAll('.class-section, .stream-section, .subject-group');
  if (sections.length < 2) return;
  const target = sections[Math.min(1, sections.length - 1)];

  const wrap = document.createElement('div');
  wrap.dataset.erAdSlot = key;
  wrap.style.cssText = 'max-width:1200px;margin:0 auto 24px;padding:0 24px;';
  const lbl = document.createElement('div');
  lbl.style.cssText = 'font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#bbb;text-align:center;margin-bottom:6px;';
  lbl.textContent = 'Sponsored';
  wrap.appendChild(lbl);
  const inner = document.createElement('div');
  inner.innerHTML = code;
  wrap.appendChild(inner);
  inner.querySelectorAll('script').forEach(old => {
    const s = document.createElement('script');
    Array.from(old.attributes).forEach(a => s.setAttribute(a.name, a.value));
    s.textContent = old.textContent;
    old.parentNode.replaceChild(s, old);
  });
  target.insertAdjacentElement('afterend', wrap);
}

function insertSmartAds() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  if (['privacy.html','terms.html','disclaimer.html','admin.html'].includes(currentPage)) return;
  if (document.body?.dataset?.erSmartAds === '1') return;
  document.body.dataset.erSmartAds = '1';

  const slots  = getAdSlots();
  const main   = document.querySelector('main');
  const footer = document.querySelector('footer');
  const hero   = document.querySelector('.page-hero, .hero');

  // 1. TOP BANNER — 'top' key (ads.js handles 'top_banner' independently)
  const topEl = _buildAdElement(slots, 'top', 'er-ad-shell er-ad-shell--top');
  if (topEl) {
    if (hero?.parentNode) hero.insertAdjacentElement('afterend', topEl);
    else if (main) main.insertAdjacentElement('afterbegin', topEl);
  }

  // 2. INLINE MID — 'inline' key (ads.js handles inline_1/2/3)
  const inlineEl = _buildAdElement(slots, 'inline', 'er-ad-shell er-ad-shell--inline');
  if (inlineEl && main) {
    const kids = Array.from(main.children).filter(el => !el.dataset.erAdSlot && !el.matches('script,style'));
    const anchor = kids[Math.min(1, kids.length - 1)];
    if (anchor) anchor.insertAdjacentElement('beforebegin', inlineEl);
  }

  // 3. BETWEEN SECTIONS — deferred so dynamic content has rendered
  setTimeout(() => _injectBetweenSections(slots), 200);

  // 4. PRE-FOOTER — 'footer' key (ads.js handles 'pre_footer')
  const footerEl = _buildAdElement(slots, 'footer', 'er-ad-shell er-ad-shell--footer');
  if (footerEl && footer) footer.insertAdjacentElement('beforebegin', footerEl);

  // 5. STICKY SIDEBAR — desktop only
  setTimeout(() => _injectStickySidebar(slots), 500);

  // 6. MOBILE STICKY BOTTOM
  _injectMobileBottom(slots);
}
