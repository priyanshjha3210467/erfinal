/**
 * ExamReady — Unified Ad Manager v4  |  ad-manager.js
 * =====================================================
 * Controls EVERY ad slot across:
 *   • shared.js  (getManagedAdSlotHtml / insertSmartAds)
 *   • ads.js     (injectTopBanner, injectInlineBreaks, etc.)
 *
 * All slots read from localStorage key: er_ad_slots
 *
 * Include in admin.html AFTER shared.js:
 *   <script src="ad-manager.js"></script>
 *
 * The script auto-patches:
 *   • Adds "Ad Manager" to the sidebar nav
 *   • Injects the #sec-ads section into .admin-content
 *   • Wraps showSection() to render the UI on navigation
 */
(function () {
  'use strict';

  const PAGE = window.location.pathname.split('/').pop() || '';
  if (!PAGE.includes('admin')) return;

  /* ================================================================
     UNIFIED SLOT DEFINITIONS
     Every key that shared.js OR ads.js reads from er_ad_slots.
     ================================================================ */
  const SLOT_GROUPS = [
    {
      group: '🌐 Global — All Pages',
      desc: 'These slots appear on every public page of the site.',
      slots: [
        {
          key: 'top',
          label: 'Top Banner',
          where: 'After hero section, before main content',
          pages: 'All public pages',
          size: '728×90 leaderboard or Responsive',
          system: 'shared.js',
          priority: 'high',
          tip: 'Best for leaderboard (728×90) or a responsive ad unit. Gets seen before any content.',
        },
        {
          key: 'top_banner',
          label: 'Top Banner (ads.js)',
          where: 'After hero section — ads.js injection',
          pages: 'All public pages',
          size: 'Responsive',
          system: 'ads.js',
          priority: 'high',
          tip: 'Mirrored ads.js placement. Admin keeps this placement pair in sync automatically.',
        },
        {
          key: 'footer',
          label: 'Pre-Footer Banner',
          where: 'Just above the footer',
          pages: 'All public pages',
          size: '336×280 rectangle or Responsive',
          system: 'shared.js',
          priority: 'medium',
          tip: 'High viewability — users reach the footer before navigating away.',
        },
        {
          key: 'pre_footer',
          label: 'Pre-Footer Banner (ads.js)',
          where: 'Just above the footer — ads.js injection',
          pages: 'All public pages',
          size: 'Responsive',
          system: 'ads.js',
          priority: 'medium',
          tip: 'Same placement as above for the ads.js system. Use the same code for both.',
        },
      ],
    },
    {
      group: '📰 In-Content Breaks',
      desc: 'Injected inside page content between sections or articles.',
      slots: [
        {
          key: 'inline',
          label: 'Inline Break (shared.js)',
          where: 'Between content sections inside <main>',
          pages: 'All public pages',
          size: 'In-article / Responsive',
          system: 'shared.js',
          priority: 'high',
          tip: 'Injected dynamically between the 2nd and 3rd content blocks. Great for in-article format.',
        },
        {
          key: 'inline_1',
          label: 'Inline Break 1 (ads.js)',
          where: 'First natural content break in <main>',
          pages: 'All public pages',
          size: 'In-article / Responsive',
          system: 'ads.js',
          priority: 'high',
          tip: 'First in-article placement from the ads.js system.',
        },
        {
          key: 'inline_2',
          label: 'Inline Break 2 (ads.js)',
          where: 'Second content break in <main>',
          pages: 'Pages with 4+ sections',
          size: 'In-article / Responsive',
          system: 'ads.js',
          priority: 'medium',
          tip: 'Shown on longer pages. Compact format.',
        },
        {
          key: 'inline_3',
          label: 'Inline Break 3 (ads.js)',
          where: 'Third content break in <main>',
          pages: 'Pages with 6+ sections',
          size: 'In-article / Responsive',
          system: 'ads.js',
          priority: 'medium',
          tip: 'Only appears on very long listing pages.',
        },
        {
          key: 'between',
          label: 'Between Sections (shared.js)',
          where: 'Between 2nd and 3rd class/chapter blocks',
          pages: 'Class & listing pages',
          size: 'Native / In-feed',
          system: 'shared.js',
          priority: 'medium',
          tip: 'Best for native or in-feed ads that blend with the content grid.',
        },
        {
          key: 'between_sections',
          label: 'Between Sections (ads.js)',
          where: 'Between class/chapter blocks — ads.js injection',
          pages: 'Class & listing pages',
          size: 'Native / In-feed',
          system: 'ads.js',
          priority: 'medium',
          tip: 'Same as above for ads.js system.',
        },
      ],
    },
    {
      group: '🎯 High-Intent Pages',
      desc: 'Slots on quiz, solution, and results pages — highest purchase intent.',
      slots: [
        {
          key: 'results',
          label: 'Results / Post-Article (shared.js)',
          where: 'After quiz results or end of solution article',
          pages: 'quiz.html, solution-post.html',
          size: 'Responsive',
          system: 'shared.js',
          priority: 'veryhigh',
          tip: 'Students just finished studying — peak intent. Use coaching, book, or mock-test ads.',
        },
        {
          key: 'results_banner',
          label: 'Results Banner (ads.js)',
          where: 'After quiz result card and article footer',
          pages: 'quiz.html, solution-post.html',
          size: 'Responsive',
          system: 'ads.js',
          priority: 'veryhigh',
          tip: 'Mirrored high-intent placement kept in sync automatically from admin.',
        },
        {
          key: 'solution_mid',
          label: 'Mid-Article Ad (ads.js)',
          where: 'Halfway through solution article body',
          pages: 'solution-post.html',
          size: 'In-article / Native',
          system: 'ads.js',
          priority: 'high',
          tip: 'Inserted mid-read when engagement is highest.',
        },
        {
          key: 'quiz_sidebar',
          label: 'Quiz Sidebar (ads.js)',
          where: 'Inside quiz page side panel',
          pages: 'quiz.html',
          size: '160×600 or Responsive',
          system: 'ads.js',
          priority: 'high',
          tip: 'Shown while student is actively taking a quiz.',
        },
        {
          key: 'pdf_viewer',
          label: 'PDF Viewer Banner',
          where: 'Between the PDF toolbar and viewer',
          pages: 'pdf-viewer.html',
          size: 'Responsive',
          system: 'shared.js',
          priority: 'high',
          tip: 'Dedicated monetisation slot for PDF previews without breaking the viewer layout.',
        },
      ],
    },
    {
      group: '📌 Persistent / Sticky Placements',
      desc: 'Fixed placements that follow the user as they scroll.',
      slots: [
        {
          key: 'sticky',
          label: 'Sticky Sidebar (shared.js)',
          where: 'Fixed right sidebar, appears after 2s scroll',
          pages: 'Desktop ≥ 1280px only',
          size: '160×600 skyscraper',
          system: 'shared.js',
          priority: 'veryhigh',
          tip: 'Highest revenue per session on desktop. Use a 160×600 skyscraper. Dismissable by user.',
        },
        {
          key: 'sidebar_sticky',
          label: 'Sticky Sidebar (ads.js)',
          where: 'Fixed right sidebar — ads.js injection',
          pages: 'Desktop ≥ 1280px only',
          size: '160×600 skyscraper',
          system: 'ads.js',
          priority: 'veryhigh',
          tip: 'Mirrored sticky placement kept in sync automatically from admin.',
        },
        {
          key: 'mobile_bottom',
          label: 'Mobile Sticky Bottom Bar',
          where: 'Fixed bottom bar, slides up after 3s',
          pages: 'Mobile ≤ 768px only',
          size: '320×50 or 320×100',
          system: 'shared.js + ads.js',
          priority: 'veryhigh',
          tip: 'Highest CTR on mobile. Dismissable. Both systems share this key.',
        },
      ],
    },
  ];

  /* ── All slot keys (flat) ── */
  const ALL_SLOTS = SLOT_GROUPS.flatMap(g => g.slots);
  const SLOT_LINKS = [
    ['top', 'top_banner'],
    ['footer', 'pre_footer'],
    ['between', 'between_sections'],
    ['sticky', 'sidebar_sticky'],
  ];

  /* ================================================================
     STORAGE HELPERS
     ================================================================ */
  function normalizeSlots(input) {
    const raw = (input && typeof input === 'object' && !Array.isArray(input)) ? input : {};
    const out = {};
    ALL_SLOTS.forEach(s => {
      out[s.key] = { enabled: true, adCode: '', ...(raw[s.key] || {}) };
    });
    Object.keys(raw).forEach(key => {
      if (!out[key]) out[key] = { enabled: true, adCode: '', ...(raw[key] || {}) };
    });
    SLOT_LINKS.forEach(([primaryKey, aliasKey]) => {
      const primary = out[primaryKey] || { enabled: true, adCode: '' };
      const alias = out[aliasKey] || { enabled: true, adCode: '' };
      const primaryCode = (primary.adCode || '').trim();
      const aliasCode = (alias.adCode || '').trim();
      const source = primaryCode
        ? primary
        : aliasCode
        ? alias
        : (primary.enabled === false && alias.enabled !== false ? alias : primary);
      const synced = {
        enabled: source.enabled !== false,
        adCode: source.adCode || '',
      };
      out[primaryKey] = { ...(out[primaryKey] || {}), ...synced };
      out[aliasKey] = { ...(out[aliasKey] || {}), ...synced };
    });
    return out;
  }

  function loadSlots() {
    try {
      const saved = JSON.parse(localStorage.getItem('er_ad_slots') || '{}');
      return normalizeSlots(saved);
    } catch (e) { return normalizeSlots({}); }
  }

  function persistSlots(slots) {
    localStorage.setItem('er_ad_slots', JSON.stringify(normalizeSlots(slots)));
  }

  /* ================================================================
     UTILITIES
     ================================================================ */
  function esc(v) {
    return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function toast(msg, type) {
    if (typeof window.showToast === 'function') window.showToast(msg, type || 'success');
    else alert(msg);
  }

  /* ── Priority badge helper ── */
  function priorityBadge(p) {
    const map = {
      veryhigh: { cls:'badge-red',    label:'⭐⭐ Very High' },
      high:     { cls:'badge-orange', label:'⭐ High' },
      medium:   { cls:'badge-blue',   label:'Medium' },
    };
    const m = map[p] || map.medium;
    return `<span class="badge ${m.cls}">${m.label}</span>`;
  }

  /* ── System badge ── */
  function systemBadge(s) {
    const isShared = s.includes('shared');
    const isAds    = s.includes('ads');
    const both     = isShared && isAds;
    const style = both
      ? 'background:#e6ffed;color:#2f9e44'
      : isShared
      ? 'background:#f0f4ff;color:#3b5bdb'
      : 'background:#f3f0ff;color:#6741d9';
    const label = both ? 'Both systems' : isShared ? 'shared.js' : 'ads.js';
    return `<span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px;${style}">${label}</span>`;
  }

  /* ================================================================
     RENDER AD MANAGER
     ================================================================ */
  window.renderAdManager = function () {
    const container  = document.getElementById('adSlotsContainer');
    const statsInner = document.getElementById('adStatsInner');
    if (!container) return;

    const slots = loadSlots();
    const activeCount = ALL_SLOTS.filter(s => slots[s.key]?.enabled !== false).length;
    const codedCount  = ALL_SLOTS.filter(s => (slots[s.key]?.adCode || '').trim()).length;

    if (statsInner) {
      statsInner.innerHTML = `
        <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center">
          <span style="font-size:13px;font-weight:800;color:#fff">
            <span style="color:#7fff9a">${activeCount}</span><span style="color:#aaa"> / ${ALL_SLOTS.length} slots enabled</span>
          </span>
          <span style="font-size:13px;font-weight:800;color:#fff">
            <span style="color:${codedCount > 0 ? '#7fff9a' : '#ff9a9a'}">${codedCount}</span><span style="color:#aaa"> have real ad code</span>
          </span>
          ${codedCount === 0
            ? `<span style="font-size:11px;font-weight:800;color:#ffdd88;background:rgba(255,200,0,.12);padding:4px 12px;border-radius:20px;border:1px solid rgba(255,200,0,.25)">
                ⚠ No AdSense code live yet - empty slots stay hidden
               </span>`
            : `<span style="font-size:11px;font-weight:800;color:#7fff9a;background:rgba(100,255,100,.1);padding:4px 12px;border-radius:20px;border:1px solid rgba(100,255,100,.2)">
                ✅ Live AdSense code active on ${codedCount} slot${codedCount !== 1 ? 's' : ''}
               </span>`}
        </div>`;
    }

    /* Build group HTML */
    let html = '';
    SLOT_GROUPS.forEach(group => {
      const groupHtml = group.slots.map(s => buildSlotCard(s, slots[s.key] || {})).join('');
      html += `
        <div style="margin-bottom:28px">
          <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:6px">
            <h3 style="font-size:16px;font-weight:900">${group.group}</h3>
          </div>
          <p style="font-size:12.5px;color:var(--muted);font-weight:600;margin-bottom:14px">${esc(group.desc)}</p>
          <div style="display:flex;flex-direction:column;gap:10px">${groupHtml}</div>
        </div>`;
    });

    container.innerHTML = html;
  };

  function buildSlotCard(slotDef, cfg) {
    const { key, label, where, pages, size, system, priority, tip } = slotDef;
    const enabled = cfg.enabled !== false;
    const adCode  = cfg.adCode || '';
    const hasCode = !!adCode.trim();
    const borderColor = hasCode && enabled
      ? 'rgba(47,158,68,.4)'
      : enabled
      ? 'var(--gray2)'
      : 'rgba(200,0,0,.2)';
    const statusLabel = hasCode && enabled ? '✅ Live' : enabled ? '⭕ No code' : '🔴 Off';
    const statusStyle = hasCode && enabled
      ? 'background:#e6ffed;color:#2f9e44'
      : enabled
      ? 'background:#f4f4f4;color:#888'
      : 'background:#fff0f0;color:#e8211a';

    return `
      <div id="adcard-${esc(key)}" style="background:#fff;border:2px solid ${borderColor};border-radius:14px;padding:18px 20px;transition:border-color .2s">
        <!-- Header row -->
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap">
              <strong style="font-size:14px">${esc(label)}</strong>
              <span style="font-size:11px;font-weight:900;padding:3px 10px;border-radius:20px;${statusStyle}">${statusLabel}</span>
              ${priorityBadge(priority)}
              ${systemBadge(system)}
            </div>
            <div style="font-size:11.5px;color:var(--muted);font-weight:700;line-height:1.65">
              📍 <strong style="color:var(--text)">Where:</strong> ${esc(where)}<br>
              📄 <strong style="color:var(--text)">Pages:</strong> ${esc(pages)}<br>
              📐 <strong style="color:var(--text)">Size:</strong> ${esc(size)}
            </div>
            <div style="margin-top:8px;padding:8px 12px;background:#fffbf0;border:1px solid #ffe8a0;border-radius:8px;font-size:11.5px;font-weight:700;color:#7a5800">
              💡 ${esc(tip)}
            </div>
          </div>
          <!-- Enable toggle -->
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0">
            <span style="font-size:10px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Enable</span>
            <button class="toggle ${enabled ? 'on' : ''}" id="adtoggle-${esc(key)}"
              onclick="this.classList.toggle('on')" title="Toggle this slot"></button>
          </div>
        </div>

        <!-- Code editor -->
        <div style="margin-bottom:10px">
          <label style="display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:5px">
            <span>Ad Code</span>
            <span style="color:${hasCode ? 'var(--green)' : 'var(--muted)'}">
              ${hasCode ? `✓ ${adCode.trim().length} chars — live AdSense code set` : 'Empty - slot stays hidden'}
            </span>
          </label>
          <textarea id="adcode-${esc(key)}" rows="3"
            style="font-family:monospace;font-size:11.5px;background:#fafafa;border:2px solid ${hasCode ? 'var(--green)' : 'var(--gray2)'};border-radius:8px;width:100%;padding:10px;resize:vertical;outline:none;transition:border-color .2s"
            placeholder="Paste your Google AdSense, Media.net, or any &lt;script&gt; / &lt;ins&gt; code here..."
            onfocus="this.style.borderColor='var(--red)'"
            onblur="this.style.borderColor=(this.value.trim() ? 'var(--green)' : 'var(--gray2)')"
          >${esc(adCode)}</textarea>
        </div>

        <!-- Action row -->
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <button class="btn btn-red" onclick="erAdMgr.saveSlot('${esc(key)}')">💾 Save Slot</button>
          ${hasCode ? `<button class="btn btn-danger" onclick="erAdMgr.clearSlot('${esc(key)}')">✕ Clear Code</button>` : ''}
          <code style="margin-left:auto;background:#f4f4f4;padding:3px 9px;border-radius:6px;font-size:11px;color:var(--muted)">${esc(key)}</code>
        </div>
      </div>`;
  }

  /* ================================================================
     PUBLIC API (window.erAdMgr)
     ================================================================ */
  window.erAdMgr = {

    saveSlot(key) {
      const slots    = loadSlots();
      const codeEl   = document.getElementById('adcode-' + key);
      const toggleEl = document.getElementById('adtoggle-' + key);
      if (!codeEl) return;
      slots[key] = {
        enabled: toggleEl ? toggleEl.classList.contains('on') : true,
        adCode:  codeEl.value,
      };
      persistSlots(slots);
      toast(`"${key}" saved!`);
      renderAdManager();
    },

    clearSlot(key) {
      if (!confirm(`Clear ad code for "${key}"?\nThis placement will stay hidden until new AdSense code is saved.`)) return;
      const slots = loadSlots();
      if (slots[key]) { slots[key].adCode = ''; slots[key].enabled = true; }
      persistSlots(slots);
      toast('Slot cleared.', 'warn');
      renderAdManager();
    },

    saveAll() {
      const slots = loadSlots();
      ALL_SLOTS.forEach(s => {
        const codeEl   = document.getElementById('adcode-' + s.key);
        const toggleEl = document.getElementById('adtoggle-' + s.key);
        if (!codeEl) return;
        slots[s.key] = {
          enabled: toggleEl ? toggleEl.classList.contains('on') : true,
          adCode:  codeEl.value,
        };
      });
      persistSlots(slots);
      toast('All ' + ALL_SLOTS.length + ' slots saved!');
      renderAdManager();
    },

    enableAll() {
      const slots = loadSlots();
      ALL_SLOTS.forEach(s => { if (slots[s.key]) slots[s.key].enabled = true; });
      persistSlots(slots);
      toast('All slots enabled.');
      renderAdManager();
    },

    disableAll() {
      if (!confirm('Disable all ad slots? The site will show no ads (not even placeholders).')) return;
      const slots = loadSlots();
      ALL_SLOTS.forEach(s => { if (slots[s.key]) slots[s.key].enabled = false; });
      persistSlots(slots);
      toast('All slots disabled.', 'warn');
      renderAdManager();
    },

    clearAll() {
      if (!confirm('Clear ALL ad code from every slot?\nAll placements without code will stay hidden.')) return;
      const slots = loadSlots();
      ALL_SLOTS.forEach(s => { if (slots[s.key]) slots[s.key].adCode = ''; });
      persistSlots(slots);
      toast('All ad code cleared.', 'warn');
      renderAdManager();
    },

    exportConfig() {
      const cfg  = loadSlots();
      const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = 'examready-ads-' + new Date().toISOString().slice(0,10) + '.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      toast('Ad config exported!');
    },

    importConfig(input) {
      const f = input.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = JSON.parse(e.target.result);
          if (typeof data !== 'object' || Array.isArray(data)) {
            toast('Invalid format.', 'error'); return;
          }
          localStorage.setItem('er_ad_slots', JSON.stringify(data));
          toast('Ad config imported!');
          renderAdManager();
        } catch (err) { toast('Could not parse JSON.', 'error'); }
      };
      reader.readAsText(f);
      input.value = '';
    },
  };

  /* ================================================================
     BUILD SEC-ADS HTML
     ================================================================ */
  function buildSectionHTML() {
    return `
      <div class="page-title">💰 Ad Manager</div>
      <div class="page-subtitle">Control every AdSense placement across the entire site. Paste your AdSense code here and admin controls it site-wide. Empty slots stay hidden until code is added.</div>

      <!-- Stats bar -->
      <div id="adStatsBar" style="background:linear-gradient(135deg,#0d0d0d,#1a0505);border-radius:14px;padding:16px 22px;margin-bottom:20px;color:#fff;position:relative;overflow:hidden">
        <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#e8211a,#ff7a50,#ffb347)"></div>
        <div id="adStatsInner" style="font-size:13px;font-weight:700;color:#aaa">Loading…</div>
      </div>

      <!-- Toolbar -->
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:20px;padding:14px 18px;background:#fff;border:1px solid var(--gray2);border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,.04)">
        <button class="btn btn-red btn-lg" onclick="erAdMgr.saveAll()">💾 Save All Slots</button>
        <button class="btn btn-green" onclick="erAdMgr.enableAll()">✅ Enable All</button>
        <button class="btn btn-danger" onclick="erAdMgr.disableAll()">🔴 Disable All</button>
        <button class="btn btn-gray" onclick="erAdMgr.clearAll()">🧹 Clear All Code</button>
        <div style="margin-left:auto;display:flex;gap:8px">
          <button class="btn btn-gray" onclick="erAdMgr.exportConfig()">⬇ Export Config</button>
          <button class="btn btn-edit" onclick="document.getElementById('adImportInput').click()">⬆ Import Config</button>
          <input type="file" id="adImportInput" accept=".json" style="display:none" onchange="erAdMgr.importConfig(this)">
        </div>
      </div>

      <!-- How it works banner -->
      <div style="background:#f0f4ff;border:1px solid #c5d5ff;border-radius:12px;padding:14px 18px;margin-bottom:20px;font-size:13px;line-height:1.8;color:#1a2a6a;font-weight:600">
        <strong>How it works:</strong>
        Each slot below maps to a placement on the live site.
        Paste your AdSense <code style="background:rgba(0,0,0,.07);padding:1px 6px;border-radius:4px">&lt;script&gt;</code> and
        <code style="background:rgba(0,0,0,.07);padding:1px 6px;border-radius:4px">&lt;ins&gt;</code>
        code into the slot, click <strong>Save Slot</strong>, and it goes live immediately.
        Slots with no code stay empty, so only the AdSense ads you add from admin are shown.
        Mirrored <strong>ads.js</strong> and <strong>shared.js</strong> placements are synced automatically from admin.
      </div>

      <!-- Slot groups -->
      <div id="adSlotsContainer">
        <div style="text-align:center;padding:40px;color:var(--muted);font-weight:700">Loading slots…</div>
      </div>

      <!-- Setup guide -->
      <div style="margin-top:24px;background:#fff;border:1px solid var(--gray2);border-radius:16px;padding:22px;box-shadow:0 2px 8px rgba(0,0,0,.04)">
        <h4 style="font-size:15px;font-weight:900;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid var(--gray2);display:flex;align-items:center;gap:8px">
          📖 AdSense Quick-Start Guide
        </h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;font-size:13px;font-weight:600;color:var(--muted);line-height:1.8">
          <div style="padding:14px;background:#fafafa;border-radius:10px;border:1px solid var(--gray2)">
            <strong style="color:var(--text);display:block;margin-bottom:6px">1. Create an ad unit</strong>
            Go to <em>Google AdSense → Ads → By ad unit → Display ad</em>.
            Set size to <strong>Responsive</strong> for best cross-device results.
          </div>
          <div style="padding:14px;background:#fafafa;border-radius:10px;border:1px solid var(--gray2)">
            <strong style="color:var(--text);display:block;margin-bottom:6px">2. Copy the code</strong>
            Copy the full <code style="background:#f0f0f0;padding:1px 5px;border-radius:3px">&lt;script&gt;…&lt;/script&gt;</code> snippet that Google provides after creating the unit.
          </div>
          <div style="padding:14px;background:#fafafa;border-radius:10px;border:1px solid var(--gray2)">
            <strong style="color:var(--text);display:block;margin-bottom:6px">3. Paste and save</strong>
            Paste into the matching slot above and click <strong>Save Slot</strong>.
            Changes are live on all pages instantly — no code edits needed.
          </div>
          <div style="padding:14px;background:#fff8f8;border-radius:10px;border:1px solid #ffd0ce">
            <strong style="color:var(--red);display:block;margin-bottom:6px">💡 Pro tip — Auto Ads</strong>
            Paste the AdSense <em>Auto Ads</em> global script tag into the
            <strong>Top Banner (shared.js)</strong> slot. Google will automatically
            place ads everywhere on the site with no further configuration.
          </div>
        </div>
      </div>
    `;
  }

  /* ================================================================
     ADMIN PANEL PATCHING
     ================================================================ */
  function patchSidebar() {
    if (document.querySelector('[data-nav-ads-v4]')) return;
    /* Find the "Site" sidebar section and add Monetisation above it */
    const siteSection = Array.from(document.querySelectorAll('.sidebar-section'))
      .find(el => /site/i.test(el.textContent.trim()));
    if (!siteSection) return;

    const heading = document.createElement('div');
    heading.className = 'sidebar-section';
    heading.textContent = 'Monetisation';

    const navBtn = document.createElement('button');
    navBtn.className = 'nav-item';
    navBtn.dataset.navAdsV4 = '1';
    navBtn.innerHTML = '<span class="nav-icon">💰</span> Ad Manager';
    navBtn.onclick = () => window.showSection && window.showSection('ads');

    siteSection.parentNode.insertBefore(heading, siteSection);
    siteSection.parentNode.insertBefore(navBtn, siteSection);
  }

  function injectSection() {
    if (document.getElementById('sec-ads')) return;
    const adminContent = document.querySelector('.admin-content');
    if (!adminContent) return;
    const section = document.createElement('div');
    section.className = 'admin-section';
    section.id = 'sec-ads';
    section.innerHTML = buildSectionHTML();
    adminContent.appendChild(section);
  }

  function patchShowSection() {
    const orig = window.showSection;
    if (typeof orig !== 'function' || orig._adV4Patched) return;

    window.showSection = function (id) {
      orig(id);
      /* Make sure sec-ads is shown when selected */
      if (id === 'ads') {
        document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
        const sec = document.getElementById('sec-ads');
        if (sec) sec.classList.add('active');
        document.querySelectorAll('.nav-item').forEach(n => {
          n.classList.toggle('active', !!(n.dataset.navAdsV4 && id === 'ads'));
        });
        /* Update topbar title */
        const tb = document.getElementById('topbarTitle');
        if (tb) tb.textContent = 'Ad Manager';
        renderAdManager();
      }
    };
    window.showSection._adV4Patched = true;
  }

  /* ================================================================
     BOOT
     ================================================================ */
  function boot() {
    const timer = setInterval(() => {
      if (document.querySelector('.admin-layout') && document.querySelector('.sidebar-section')) {
        clearInterval(timer);
        patchSidebar();
        injectSection();
        patchShowSection();
      }
    }, 150);
    /* Hard timeout */
    setTimeout(() => {
      clearInterval(timer);
      patchSidebar();
      injectSection();
      patchShowSection();
    }, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
