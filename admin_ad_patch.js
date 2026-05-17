// ============================================================
// ====== DEPRECATED — This file is NOT loaded by admin.html ======
// ============================================================
// The canonical ad manager lives INLINE in admin.html (search for
// "window.adMgr = {"). This file is kept for reference only.
// Do NOT add a <script src="admin_ad_patch.js"> to admin.html —
// it would overwrite the inline adMgr and lose A/B testing,
// revenue estimator, and per-page override methods.
// ============================================================
// ====== AD MANAGER — COMPLETE REWRITE (replaces old version)
// ============================================================

// ─── Master slot groups (matches shared.js AD_SLOT_REGISTRY) ───────────────
var AD_SLOT_GROUPS = [
  {
    group: '🌐 Global — All Pages',
    desc: 'These slots appear on every public page of the site.',
    slots: [
      { key:'top',        label:'Top Banner',                  where:'After hero, before main content',   pages:'All public pages',              size:'728×90 or Responsive', system:'shared.js',          priority:'high',     tip:'Best for leaderboard (728×90) or responsive. Shown before any scrolling.' },
      { key:'top_banner', label:'Top Banner (ads.js)',         where:'After hero — ads.js injection',     pages:'All public pages',              size:'Responsive',           system:'ads.js',             priority:'high',     tip:'Same placement for the ads.js injection system. Paste the same AdSense code in both top slots.' },
      { key:'footer',     label:'Pre-Footer Banner',           where:'Just above the footer',             pages:'All public pages',              size:'336×280 or Responsive', system:'shared.js',         priority:'medium',   tip:'High viewability — users see this just before navigating away.' },
      { key:'pre_footer', label:'Pre-Footer Banner (ads.js)',  where:'Above footer — ads.js injection',   pages:'All public pages',              size:'Responsive',           system:'ads.js',             priority:'medium',   tip:'Same placement for ads.js. Paste the same code as the Pre-Footer slot.' },
    ]
  },
  {
    group: '📰 In-Content Breaks',
    desc: 'Injected inside page content between sections. Great for in-article format ads.',
    slots: [
      { key:'inline',           label:'Inline Break (shared.js)',    where:'Between content sections in main',  pages:'All public pages',         size:'In-article / Responsive', system:'shared.js',   priority:'high',   tip:'Injected between 2nd and 3rd content blocks. Best for in-article or native format.' },
      { key:'inline_1',         label:'Inline Break 1 (ads.js)',     where:'First natural content break',       pages:'All public pages',         size:'In-article / Responsive', system:'ads.js',      priority:'high',   tip:'First in-article placement from the ads.js system.' },
      { key:'inline_2',         label:'Inline Break 2 (ads.js)',     where:'Second content break',              pages:'Pages with 4+ sections',   size:'In-article / Responsive', system:'ads.js',      priority:'medium', tip:'Shown on longer pages only. Use compact format.' },
      { key:'inline_3',         label:'Inline Break 3 (ads.js)',     where:'Third content break',               pages:'Pages with 6+ sections',   size:'In-article / Responsive', system:'ads.js',      priority:'medium', tip:'Only appears on very long listing pages.' },
      { key:'between',          label:'Between Sections (shared.js)',where:'After 2nd .class-section block',    pages:'Class & listing pages',    size:'Native / In-feed',        system:'shared.js',   priority:'medium', tip:'Best for native or in-feed ads that blend with the content grid.' },
      { key:'between_sections', label:'Between Sections (ads.js)',   where:'Between class/chapter blocks',      pages:'Class & listing pages',    size:'Native / In-feed',        system:'ads.js',      priority:'medium', tip:'Same placement for ads.js system.' },
    ]
  },
  {
    group: '🎯 High-Intent Pages',
    desc: 'Slots on quiz, solution, and results pages — highest student purchase intent.',
    slots: [
      { key:'results',        label:'Results / Post-Article',      where:'After quiz results or article end',  pages:'quiz.html, solution-post.html', size:'Responsive',              system:'shared.js', priority:'veryhigh', tip:'Peak intent placement — students just finished studying. Use coaching, books, or mock-test ads.' },
      { key:'results_banner', label:'Results Banner (ads.js)',     where:'After quiz result card',             pages:'quiz.html, solution-post.html', size:'Responsive',              system:'ads.js',    priority:'veryhigh', tip:'Same high-intent placement for ads.js. Use the same code.' },
      { key:'solution_mid',   label:'Mid-Article (ads.js)',        where:'Halfway through solution article',   pages:'solution-post.html',            size:'In-article / Native',     system:'ads.js',    priority:'high',     tip:'Inserted mid-read when engagement is highest.' },
      { key:'quiz_sidebar',   label:'Quiz Sidebar (ads.js)',       where:'Inside quiz page side panel',        pages:'quiz.html',                     size:'160×600 or Responsive',   system:'ads.js',    priority:'high',     tip:'Shown while a student is actively taking a quiz.' },
      { key:'pdf_viewer',     label:'PDF Viewer Banner',           where:'Between the PDF toolbar and viewer', pages:'pdf-viewer.html',               size:'Responsive',              system:'shared.js', priority:'high',     tip:'Dedicated monetisation slot for PDF previews without breaking the viewer layout.' },
    ]
  },
  {
    group: '📌 Sticky / Persistent',
    desc: 'Fixed placements that follow the user as they scroll — highest CPM.',
    slots: [
      { key:'sticky',        label:'Sticky Sidebar (shared.js)',  where:'Fixed right sidebar, appears after 2s', pages:'Desktop ≥1280px only', size:'160×600 skyscraper',  system:'shared.js',          priority:'veryhigh', tip:'Highest desktop revenue. Use a 160×600 skyscraper unit. Dismissable by user.' },
      { key:'sidebar_sticky',label:'Sticky Sidebar (ads.js)',     where:'Fixed right sidebar — ads.js',          pages:'Desktop ≥1280px only', size:'160×600 skyscraper',  system:'ads.js',             priority:'veryhigh', tip:'Same slot for ads.js. Paste the same code as Sticky Sidebar above.' },
      { key:'mobile_bottom', label:'Mobile Sticky Bottom Bar',    where:'Fixed bottom bar, slides up after 3s',  pages:'Mobile ≤768px only',   size:'320×50 or 320×100',   system:'shared.js + ads.js', priority:'veryhigh', tip:'Highest CTR on mobile. Both systems share this key. Very easy to monetise.' },
    ]
  },
];

// Flat array of all slots
var ALL_AD_SLOTS = (function() {
  var all = [];
  AD_SLOT_GROUPS.forEach(function(g) { g.slots.forEach(function(s) { all.push(s); }); });
  return all;
})();

var AD_SLOT_LINKS = [
  ['top', 'top_banner'],
  ['footer', 'pre_footer'],
  ['between', 'between_sections'],
  ['sticky', 'sidebar_sticky']
];

function normalizeAdSlots(input) {
  var raw = (input && typeof input === 'object' && !Array.isArray(input)) ? input : {};
  var out = {};
  ALL_AD_SLOTS.forEach(function(s) {
    out[s.key] = Object.assign({ enabled: true, adCode: '' }, raw[s.key] || {});
  });
  Object.keys(raw).forEach(function(k) {
    if (!out[k]) out[k] = Object.assign({ enabled: true, adCode: '' }, raw[k]);
  });
  AD_SLOT_LINKS.forEach(function(pair) {
    var primary = out[pair[0]] || { enabled: true, adCode: '' };
    var alias = out[pair[1]] || { enabled: true, adCode: '' };
    var primaryCode = (primary.adCode || '').trim();
    var aliasCode = (alias.adCode || '').trim();
    var source = primaryCode ? primary : aliasCode ? alias : (primary.enabled === false && alias.enabled !== false ? alias : primary);
    var synced = {
      enabled: source.enabled !== false,
      adCode: source.adCode || ''
    };
    out[pair[0]] = Object.assign({}, out[pair[0]] || {}, synced);
    out[pair[1]] = Object.assign({}, out[pair[1]] || {}, synced);
  });
  return out;
}

function loadAdSlots() {
  try {
    var saved = JSON.parse(localStorage.getItem('er_ad_slots') || '{}');
    return normalizeAdSlots(saved);
  } catch(e) { return normalizeAdSlots({}); }
}

function persistAdSlots(slots) {
  localStorage.setItem('er_ad_slots', JSON.stringify(normalizeAdSlots(slots)));
}

function renderAdManager() {
  var container  = document.getElementById('adSlotsContainer');
  var statsInner = document.getElementById('adStatsInner');
  if (!container) return;

  var slots       = loadAdSlots();
  var activeCount = ALL_AD_SLOTS.filter(function(s) { return slots[s.key] && slots[s.key].enabled !== false; }).length;
  var codedCount  = ALL_AD_SLOTS.filter(function(s) { return slots[s.key] && (slots[s.key].adCode || '').trim(); }).length;

  if (statsInner) {
    statsInner.innerHTML =
      '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center">' +
        '<span style="font-size:14px;font-weight:800;color:#fff">' +
          '<span style="color:#7fff9a">' + activeCount + '</span>' +
          '<span style="color:#aaa"> / ' + ALL_AD_SLOTS.length + ' slots enabled</span>' +
        '</span>' +
        '<span style="font-size:14px;font-weight:800;color:#fff">' +
          '<span style="color:' + (codedCount > 0 ? '#7fff9a' : '#ff9a9a') + '">' + codedCount + '</span>' +
          '<span style="color:#aaa"> have real ad code</span>' +
        '</span>' +
        (codedCount === 0
          ? '<span style="font-size:11px;font-weight:800;color:#ffdd88;background:rgba(255,200,0,.12);padding:4px 12px;border-radius:20px;border:1px solid rgba(255,200,0,.25)">⚠ No AdSense code live yet - empty slots stay hidden</span>'
          : '<span style="font-size:11px;font-weight:800;color:#7fff9a;background:rgba(100,255,100,.1);padding:4px 12px;border-radius:20px;border:1px solid rgba(100,255,100,.2)">✅ Live AdSense code active on ' + codedCount + ' slot' + (codedCount !== 1 ? 's' : '') + '</span>') +
      '</div>';
  }

  var html = '';
  AD_SLOT_GROUPS.forEach(function(group) {
    html += '<div style="margin-bottom:28px">';
    html += '<div class="ad-group-title">' + group.group + '</div>';
    html += '<p class="ad-group-desc">' + safeHtml(group.desc) + '</p>';
    html += '<div style="display:flex;flex-direction:column;gap:10px">';
    group.slots.forEach(function(s) {
      html += buildAdSlotCard(s, slots[s.key] || {});
    });
    html += '</div></div>';
  });
  container.innerHTML = html;
}

function buildAdSlotCard(s, cfg) {
  var enabled  = cfg.enabled !== false;
  var adCode   = cfg.adCode || '';
  var hasCode  = !!adCode.trim();
  var borderColor = hasCode && enabled ? 'rgba(47,158,68,.4)' : enabled ? 'var(--gray2)' : 'rgba(200,0,0,.2)';
  var statusHtml  = hasCode && enabled
    ? '<span class="ad-status-live">✅ Live</span>'
    : enabled
    ? '<span class="ad-status-empty">⭕ No code</span>'
    : '<span class="ad-status-off">🔴 Off</span>';

  var priorityMap   = { veryhigh:'badge-red', high:'badge-orange', medium:'badge-blue' };
  var priorityLabel = { veryhigh:'⭐⭐ Very High', high:'⭐ High', medium:'Medium' };
  var sysStr = String(s.system || '');
  var systemColor = (sysStr.indexOf('shared') !== -1 && sysStr.indexOf('ads') !== -1)
    ? 'background:#e6ffed;color:#2f9e44'
    : sysStr.indexOf('shared') !== -1
    ? 'background:#f0f4ff;color:#3b5bdb'
    : 'background:#f3f0ff;color:#6741d9';

  // Use data-key attribute instead of inline JS string interpolation for onclick handlers
  // to avoid HTML-escaping issues with single quotes in the key names.
  var cardId = 'adcard-' + safeHtml(s.key);
  var toggleId = 'adtoggle-' + safeHtml(s.key);
  var codeId   = 'adcode-'   + safeHtml(s.key);

  return '<div class="ad-slot-card ' + (hasCode && enabled ? 'has-code' : '') + ' ' + (!enabled ? 'disabled' : '') + '" id="' + cardId + '" style="border:2px solid ' + borderColor + ';background:#fff;border-radius:14px;padding:18px 20px;transition:border-color .2s">' +
    // Header row
    '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px">' +
      '<div style="flex:1;min-width:0">' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">' +
          '<strong style="font-size:14px">' + safeHtml(s.label) + '</strong>' +
          statusHtml +
          '<span class="badge ' + (priorityMap[s.priority] || 'badge-blue') + '">' + (priorityLabel[s.priority] || s.priority) + '</span>' +
          '<span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px;' + systemColor + '">' + safeHtml(s.system) + '</span>' +
        '</div>' +
        '<div style="font-size:11.5px;color:var(--muted);font-weight:700;line-height:1.7">' +
          '📍 <strong style="color:var(--text)">Where:</strong> ' + safeHtml(s.where) + ' &nbsp;|&nbsp; ' +
          '📄 <strong style="color:var(--text)">Pages:</strong> ' + safeHtml(s.pages) + ' &nbsp;|&nbsp; ' +
          '📐 <strong style="color:var(--text)">Size:</strong> ' + safeHtml(s.size) +
        '</div>' +
        '<div style="margin-top:8px;padding:8px 12px;background:#fffbf0;border:1px solid #ffe8a0;border-radius:8px;font-size:11.5px;font-weight:700;color:#7a5800">💡 ' + safeHtml(s.tip) + '</div>' +
      '</div>' +
      // Toggle
      '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0">' +
        '<span style="font-size:10px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Enable</span>' +
        '<button class="toggle ' + (enabled ? 'on' : '') + '" id="' + toggleId + '" onclick="this.classList.toggle(\'on\')" title="Toggle slot"></button>' +
      '</div>' +
    '</div>' +
    // Code textarea
    '<div style="margin-bottom:10px">' +
      '<label style="display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:5px">' +
        '<span>Ad Code</span>' +
        '<span style="color:' + (hasCode ? 'var(--green)' : 'var(--muted)') + '">' + (hasCode ? '✓ ' + adCode.trim().length + ' chars — live AdSense code set' : 'Empty - slot stays hidden') + '</span>' +
      '</label>' +
      '<textarea id="' + codeId + '" rows="3" ' +
        'style="font-family:monospace;font-size:11.5px;background:#fafafa;border:2px solid ' + (hasCode ? 'var(--green)' : 'var(--gray2)') + ';border-radius:8px;width:100%;padding:10px;resize:vertical;outline:none;transition:border-color .2s" ' +
        'placeholder="Paste your Google AdSense, Media.net, or any &lt;script&gt; / &lt;ins&gt; code here…" ' +
        'onfocus="this.style.borderColor=\'var(--red)\'" ' +
        'onblur="this.style.borderColor=(this.value.trim()?\'var(--green)\':\'var(--gray2)\')"' +
      '>' + safeHtml(adCode) + '</textarea>' +
    '</div>' +
    // Actions row — use data attributes on buttons so we don't embed key in inline JS
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
      '<button class="btn btn-red" data-ad-key="' + safeHtml(s.key) + '" onclick="window.adMgr.saveSlot(this.dataset.adKey)">💾 Save Slot</button>' +
      (hasCode ? '<button class="btn btn-danger" data-ad-key="' + safeHtml(s.key) + '" onclick="window.adMgr.clearSlot(this.dataset.adKey)">✕ Clear Code</button>' : '') +
      '<code style="margin-left:auto;background:#f4f4f4;padding:3px 9px;border-radius:6px;font-size:11px;color:var(--muted)">' + safeHtml(s.key) + '</code>' +
    '</div>' +
  '</div>';
}

// ─── Public API ──────────────────────────────────────────────────────────────
// Using window.adMgr so inline onclick handlers always find it.
window.adMgr = {
  saveSlot: function(key) {
    var slots    = loadAdSlots();
    var codeEl   = document.getElementById('adcode-'   + key);
    var toggleEl = document.getElementById('adtoggle-' + key);
    if (!codeEl) { showToast('Slot "' + key + '" not found.', 'error'); return; }
    slots[key] = {
      enabled: toggleEl ? toggleEl.classList.contains('on') : true,
      adCode:  codeEl.value
    };
    persistAdSlots(slots);
    showToast('"' + key + '" saved!');
    renderAdManager();
    renderDashboard();
  },

  saveAll: function() {
    var slots = loadAdSlots();
    ALL_AD_SLOTS.forEach(function(s) {
      var codeEl   = document.getElementById('adcode-'   + s.key);
      var toggleEl = document.getElementById('adtoggle-' + s.key);
      if (!codeEl) return;
      slots[s.key] = {
        enabled: toggleEl ? toggleEl.classList.contains('on') : true,
        adCode:  codeEl.value
      };
    });
    persistAdSlots(slots);
    showToast('All ' + ALL_AD_SLOTS.length + ' slots saved!');
    renderAdManager();
    renderDashboard();
  },

  clearSlot: function(key) {
    if (!confirm('Clear ad code for "' + key + '"?\nThis placement will stay hidden until new AdSense code is saved.')) return;
    var slots = loadAdSlots();
    if (slots[key]) { slots[key].adCode = ''; slots[key].enabled = true; }
    persistAdSlots(slots);
    showToast('Slot cleared.', 'warn');
    renderAdManager();
    renderDashboard();
  },

  enableAll: function() {
    var slots = loadAdSlots();
    ALL_AD_SLOTS.forEach(function(s) { if (slots[s.key]) slots[s.key].enabled = true; });
    persistAdSlots(slots);
    showToast('All slots enabled.');
    renderAdManager();
    renderDashboard();
  },

  disableAll: function() {
    if (!confirm('Disable all ad slots? The site will show no ads.')) return;
    var slots = loadAdSlots();
    ALL_AD_SLOTS.forEach(function(s) { if (slots[s.key]) slots[s.key].enabled = false; });
    persistAdSlots(slots);
    showToast('All slots disabled.', 'warn');
    renderAdManager();
    renderDashboard();
  },

  clearAll: function() {
    if (!confirm('Clear ALL ad code from every slot?\nAll placements without code will stay hidden.')) return;
    var slots = loadAdSlots();
    ALL_AD_SLOTS.forEach(function(s) { if (slots[s.key]) slots[s.key].adCode = ''; });
    persistAdSlots(slots);
    showToast('All ad code cleared.', 'warn');
    renderAdManager();
    renderDashboard();
  },

  exportConfig: function() {
    var cfg  = loadAdSlots();
    var blob = new Blob([JSON.stringify(cfg, null, 2)], { type:'application/json' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href = url;
    a.download = 'examready-ads-' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    setTimeout(function() { URL.revokeObjectURL(url); }, 3000);
    showToast('Ad config exported!');
  },

  importConfig: function(input) {
    var f = input.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var data = JSON.parse(e.target.result);
        if (typeof data !== 'object' || Array.isArray(data)) { showToast('Invalid format.', 'error'); return; }
        persistAdSlots(data);
        showToast('Ad config imported!');
        renderAdManager();
        renderDashboard();
      } catch(err) { showToast('Could not parse JSON.', 'error'); }
    };
    reader.readAsText(f);
    input.value = '';
  },
};
// Also expose renderAdManager globally so it can be called from showSection
window.renderAdManager = renderAdManager;
