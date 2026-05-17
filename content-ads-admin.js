/**
 * content-ads-admin.js — ExamReady In-Content Ad Settings for Admin
 * ==================================================================
 * Injects a "In-Content Ads" sub-section into Admin → Ad Manager.
 * Provides full control over ad placement in note-post.html and
 * solution-post.html.
 *
 * Add to admin.html after shared.js:
 *   <script src="content-ads-admin.js"></script>
 */

(function () {
  'use strict';

  const PAGE = window.location.pathname.split('/').pop() || '';
  if (!PAGE.includes('admin')) return;

  /* ================================================================
     DEFAULTS (must match content-ads.js)
     ================================================================ */
  const DEFAULTS = {
    notesEnabled:     true,
    solutionsEnabled: true,
    notes: {
      beforeSummary: false,
      afterSummary:  true,
      midContent:    true,
      afterContent:  true,
      beforeMore:    false,
    },
    solutions: {
      beforeSummary: false,
      afterSummary:  true,
      midContent:    true,
      afterContent:  true,
      beforeMore:    false,
    },
    notesDensity:     2,
    solutionsDensity: 2,
    minWordsBetween:  80,
  };

  /* ================================================================
     SLOT DEFINITIONS — these appear in the ad code editor
     ================================================================ */
  const CONTENT_AD_SLOTS = [
    // ── Notes ──
    { key: 'note_after_summary',  label: 'Notes — After Summary',      page: 'note-post.html',     pos: 'afterSummary',
      where: 'Between the summary card and the article',  size: 'Responsive / In-article', tip: 'Highest attention — student just read the summary and is ready to dive in.' },
    { key: 'note_mid_content',    label: 'Notes — Mid-Article',         page: 'note-post.html',     pos: 'midContent',
      where: 'Injected halfway through the note body',    size: 'In-article / Native',     tip: 'Great engagement slot. Students are actively reading at this point.' },
    { key: 'note_after_content',  label: 'Notes — After Article',       page: 'note-post.html',     pos: 'afterContent',
      where: 'After the full note card',                  size: 'Responsive / Banner',     tip: 'High intent — student just finished the note.' },
    { key: 'note_before_more',    label: 'Notes — Before More Notes',   page: 'note-post.html',     pos: 'beforeMore',
      where: 'Between article and "More Notes" grid',     size: 'In-feed / Native',        tip: 'Natural break point. Good for coaching or book ads.' },

    // ── Solutions ──
    { key: 'solution_after_summary', label: 'Solutions — After Summary',    page: 'solution-post.html', pos: 'afterSummary',
      where: 'Between summary card and solution article',  size: 'Responsive / In-article', tip: 'Peak focus — student is about to read the full solution.' },
    { key: 'solution_mid',           label: 'Solutions — Mid-Article',      page: 'solution-post.html', pos: 'midContent',
      where: 'Injected halfway through the solution body', size: 'In-article / Native',     tip: 'Existing shared slot — reused here for in-content injection.' },
    { key: 'solution_after_content', label: 'Solutions — After Article',    page: 'solution-post.html', pos: 'afterContent',
      where: 'After the complete solution card',           size: 'Responsive / Banner',     tip: 'Post-study intent — best for mock test and coaching ads.' },
    { key: 'solution_before_more',   label: 'Solutions — Before More',      page: 'solution-post.html', pos: 'beforeMore',
      where: 'Between article and "More Solutions" grid',  size: 'In-feed / Native',        tip: 'Transition moment — student is looking for what to study next.' },
  ];

  /* ================================================================
     STORAGE
     ================================================================ */
  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem('er_content_ads') || '{}');
      return deepMerge(DEFAULTS, saved);
    } catch (e) { return Object.assign({}, DEFAULTS); }
  }

  function saveSettings(s) {
    localStorage.setItem('er_content_ads', JSON.stringify(s));
  }

  function deepMerge(base, override) {
    const out = Object.assign({}, base);
    Object.keys(override).forEach(k => {
      if (override[k] && typeof override[k] === 'object' && !Array.isArray(override[k])) {
        out[k] = deepMerge(base[k] || {}, override[k]);
      } else { out[k] = override[k]; }
    });
    return out;
  }

  function getAdSlots() {
    try {
      return JSON.parse(localStorage.getItem('er_ad_slots') || '{}');
    } catch (e) { return {}; }
  }

  function saveAdSlots(slots) {
    localStorage.setItem('er_ad_slots', JSON.stringify(slots));
  }

  function hasCode(key) {
    const s = getAdSlots()[key] || {};
    return !!(s.adCode || '').trim();
  }

  function isSlotEnabled(key) {
    return (getAdSlots()[key] || { enabled: true }).enabled !== false;
  }

  /* ================================================================
     UTILS
     ================================================================ */
  function safe(v) {
    return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function toast(msg, type) {
    if (typeof window.showToast === 'function') window.showToast(msg, type || 'success');
    else alert(msg);
  }

  /* ================================================================
     MAIN RENDER FUNCTION
     ================================================================ */
  function renderContentAdsSettings() {
    const container = document.getElementById('contentAdsContainer');
    if (!container) return;

    const cfg     = loadSettings();
    const adSlots = getAdSlots();

    // Stats
    const totalSlots = CONTENT_AD_SLOTS.length;
    const liveSlots  = CONTENT_AD_SLOTS.filter(s => hasCode(s.key)).length;
    const enabledPos = CONTENT_AD_SLOTS.filter(s => isSlotEnabled(s.key)).length;

    container.innerHTML = `
      <!-- Stats bar -->
      <div id="contentAdStats" style="background:linear-gradient(135deg,#0d0d0d,#1a0505);border-radius:14px;padding:16px 22px;margin-bottom:20px;color:#fff;position:relative;overflow:hidden">
        <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#e8211a,#ff7a50,#ffb347)"></div>
        <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:center">
          <span style="font-size:13px;font-weight:800;color:#fff">
            📝 Notes &amp; Solutions In-Content Ads
          </span>
          <span style="font-size:12px;font-weight:800;color:#aaa">
            <span style="color:${liveSlots > 0 ? '#7fff9a' : '#ff9a9a'}">${liveSlots}</span> / ${totalSlots} slots have code
          </span>
          <span style="font-size:11px;font-weight:800;color:${cfg.notesEnabled ? '#7fff9a' : '#ff9a9a'};background:rgba(${cfg.notesEnabled ? '100,255,100' : '255,80,80'},.1);padding:3px 10px;border-radius:20px;border:1px solid rgba(${cfg.notesEnabled ? '100,255,100' : '255,80,80'},.2)">
            📝 Notes: ${cfg.notesEnabled ? 'ON' : 'OFF'}
          </span>
          <span style="font-size:11px;font-weight:800;color:${cfg.solutionsEnabled ? '#7fff9a' : '#ff9a9a'};background:rgba(${cfg.solutionsEnabled ? '100,255,100' : '255,80,80'},.1);padding:3px 10px;border-radius:20px;border:1px solid rgba(${cfg.solutionsEnabled ? '100,255,100' : '255,80,80'},.2)">
            📖 Solutions: ${cfg.solutionsEnabled ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>

      <!-- Master settings row -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
        ${buildMasterPanel('notes', cfg)}
        ${buildMasterPanel('solutions', cfg)}
      </div>

      <!-- How it works -->
      <div style="background:#f0f4ff;border:1px solid #c5d5ff;border-radius:12px;padding:14px 18px;margin-bottom:20px;font-size:13px;line-height:1.75;color:#1a2a6a;font-weight:600">
        <strong>How in-content ads work:</strong> Each slot below maps to a specific position inside the note or solution article. Paste your AdSense <code style="background:rgba(0,0,0,.07);padding:1px 5px;border-radius:4px">&lt;ins&gt;</code> / <code style="background:rgba(0,0,0,.07);padding:1px 5px;border-radius:4px">&lt;script&gt;</code> code into the slot and click <strong>Save</strong>. Native placeholders are shown automatically when no real code is set (and are visible only to you during testing — they link to your own site).
      </div>

      <!-- Slot cards: Notes -->
      <div style="margin-bottom:28px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
          <h3 style="font-size:16px;font-weight:900">📝 Note Post Ad Slots</h3>
          <span style="font-size:11px;font-weight:800;background:#f0f4ff;color:#3b5bdb;padding:3px 10px;border-radius:20px">note-post.html</span>
        </div>
        <p style="font-size:12.5px;color:var(--muted);font-weight:600;margin-bottom:14px">These slots inject into individual note reading pages.</p>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${CONTENT_AD_SLOTS.filter(s => s.page === 'note-post.html').map(s => buildSlotCard(s, cfg, adSlots)).join('')}
        </div>
      </div>

      <!-- Slot cards: Solutions -->
      <div style="margin-bottom:28px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
          <h3 style="font-size:16px;font-weight:900">📖 Solution Post Ad Slots</h3>
          <span style="font-size:11px;font-weight:800;background:#f0fff4;color:#2f9e44;padding:3px 10px;border-radius:20px">solution-post.html</span>
        </div>
        <p style="font-size:12.5px;color:var(--muted);font-weight:600;margin-bottom:14px">These slots inject into individual solution reading pages.</p>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${CONTENT_AD_SLOTS.filter(s => s.page === 'solution-post.html').map(s => buildSlotCard(s, cfg, adSlots)).join('')}
        </div>
      </div>

      <!-- Density guide -->
      <div style="background:#fff;border:1px solid var(--gray2);border-radius:14px;padding:20px;margin-top:4px">
        <h4 style="font-size:14px;font-weight:900;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid var(--gray2)">📊 Ad Density Guide</h4>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;font-size:12.5px;font-weight:600;color:var(--muted)">
          <div style="padding:14px;background:#fafafa;border-radius:10px;border:1px solid var(--gray2)">
            <strong style="color:var(--text);display:block;margin-bottom:5px">🌿 Light (1 ad)</strong>
            One ad per page. Use for long notes with minimal interruption.
          </div>
          <div style="padding:14px;background:#fafafa;border-radius:10px;border:1px solid var(--gray2);border-color:rgba(232,33,26,.2)">
            <strong style="color:var(--red);display:block;margin-bottom:5px">⚡ Normal (2 ads) — Recommended</strong>
            Best balance of revenue and reader experience.
          </div>
          <div style="padding:14px;background:#fafafa;border-radius:10px;border:1px solid var(--gray2)">
            <strong style="color:var(--text);display:block;margin-bottom:5px">💰 Heavy (3 ads)</strong>
            Max revenue. Suitable for long, detailed articles only.
          </div>
        </div>
      </div>
    `;
  }

  /* ── Master panel (notes or solutions) ── */
  function buildMasterPanel(type, cfg) {
    const isNotes     = type === 'notes';
    const masterKey   = isNotes ? 'notesEnabled' : 'solutionsEnabled';
    const densityKey  = isNotes ? 'notesDensity' : 'solutionsDensity';
    const posConfig   = cfg[type] || {};
    const masterOn    = cfg[masterKey] !== false;
    const density     = cfg[densityKey] || 2;
    const label       = isNotes ? '📝 Notes Posts' : '📖 Solution Posts';

    const positions = [
      { key: 'beforeSummary', label: 'Before Summary',    desc: 'At top, before the summary card' },
      { key: 'afterSummary',  label: 'After Summary ★',  desc: 'After summary, before article' },
      { key: 'midContent',    label: 'Mid Article ★',    desc: 'Injected halfway through body' },
      { key: 'afterContent',  label: 'After Article ★',  desc: 'After the full article card' },
      { key: 'beforeMore',    label: 'Before More Grid',  desc: 'Before "more" content section' },
    ];

    return `
      <div style="background:#fff;border:1.5px solid var(--gray2);border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.04)">
        <!-- Header -->
        <div style="padding:14px 18px;border-bottom:1px solid var(--gray2);background:linear-gradient(135deg,#fafafa,#f4f4f6);display:flex;align-items:center;justify-content:space-between">
          <strong style="font-size:14px">${label}</strong>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:11px;font-weight:700;color:var(--muted)">${masterOn ? 'Enabled' : 'Disabled'}</span>
            <button class="toggle ${masterOn ? 'on' : ''}" id="master-${safe(type)}"
              onclick="erContentAdsAdmin.toggleMaster('${type}',this)"
              title="Toggle all ${type} ads"></button>
          </div>
        </div>
        <div style="padding:16px 18px">
          <!-- Density -->
          <div style="margin-bottom:14px">
            <label style="display:block;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:7px">
              Ad Density (max ads per page)
            </label>
            <div style="display:flex;gap:8px">
              ${[1,2,3].map(n => `
                <button
                  onclick="erContentAdsAdmin.setDensity('${type}', ${n})"
                  id="density-${type}-${n}"
                  style="flex:1;padding:9px 6px;border-radius:10px;border:2px solid ${density===n ? '#e8211a' : 'var(--gray2)'};background:${density===n ? '#fff0f0' : '#fff'};color:${density===n ? 'var(--red)' : 'var(--text)'};font-size:13px;font-weight:900;cursor:pointer;transition:.2s;font-family:'Nunito',sans-serif">
                  ${n}
                  <div style="font-size:9px;font-weight:700;color:${density===n ? 'var(--red)' : 'var(--muted)';margin-top:2px}">${n===1?'Light':n===2?'Normal':'Heavy'}</div>
                </button>`).join('')}
            </div>
          </div>

          <!-- Position toggles -->
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:8px">
            Ad Positions
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${positions.map(pos => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:#fafafa;border:1px solid var(--gray2);border-radius:10px">
                <div>
                  <div style="font-size:12.5px;font-weight:800">${safe(pos.label)}</div>
                  <div style="font-size:11px;color:var(--muted);font-weight:700">${safe(pos.desc)}</div>
                </div>
                <button class="toggle ${posConfig[pos.key] ? 'on' : ''}"
                  id="pos-${safe(type)}-${safe(pos.key)}"
                  onclick="erContentAdsAdmin.togglePosition('${type}','${pos.key}',this)"
                  title="Toggle position"></button>
              </div>`).join('')}
          </div>

          <button class="btn btn-red" style="width:100%;margin-top:14px" onclick="erContentAdsAdmin.saveSettings()">
            💾 Save ${isNotes ? 'Notes' : 'Solutions'} Settings
          </button>
        </div>
      </div>`;
  }

  /* ── Individual slot card ── */
  function buildSlotCard(s, cfg, adSlots) {
    const slotData  = adSlots[s.key] || {};
    const enabled   = slotData.enabled !== false;
    const adCode    = slotData.adCode  || '';
    const hasLive   = !!(adCode.trim());
    const posOn     = (cfg[s.page === 'note-post.html' ? 'notes' : 'solutions'] || {})[s.pos];
    const borderCol = hasLive && enabled ? 'rgba(47,158,68,.4)' : enabled ? 'var(--gray2)' : 'rgba(200,0,0,.2)';
    const statusHtml = hasLive && enabled
      ? '<span style="background:#e6ffed;color:#2f9e44;font-size:10px;font-weight:900;padding:3px 10px;border-radius:20px">✅ Live</span>'
      : enabled
      ? '<span style="background:#f4f4f4;color:#888;font-size:10px;font-weight:900;padding:3px 10px;border-radius:20px">⭕ No code</span>'
      : '<span style="background:#fff0f0;color:#e8211a;font-size:10px;font-weight:900;padding:3px 10px;border-radius:20px">🔴 Off</span>';
    const posStatusHtml = posOn
      ? '<span style="background:#fff8f0;color:#c97a00;font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px">Position: ON</span>'
      : '<span style="background:#f4f4f4;color:#aaa;font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px">Position: OFF</span>';

    return `
      <div id="cadcard-${safe(s.key)}" style="background:#fff;border:2px solid ${borderCol};border-radius:14px;padding:16px 18px;transition:border-color .2s">
        <!-- Header -->
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:5px">
              <strong style="font-size:13.5px">${safe(s.label)}</strong>
              ${statusHtml}
              ${posStatusHtml}
            </div>
            <div style="font-size:11.5px;color:var(--muted);font-weight:700;line-height:1.65">
              📍 <strong style="color:var(--text)">Where:</strong> ${safe(s.where)}&nbsp;|&nbsp;
              📐 <strong style="color:var(--text)">Size:</strong> ${safe(s.size)}
            </div>
            <div style="margin-top:7px;padding:7px 11px;background:#fffbf0;border:1px solid #ffe8a0;border-radius:8px;font-size:11.5px;font-weight:700;color:#7a5800">
              💡 ${safe(s.tip)}
            </div>
          </div>
          <!-- Enable toggle -->
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0">
            <span style="font-size:9.5px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Enable</span>
            <button class="toggle ${enabled ? 'on' : ''}" id="cadtoggle-${safe(s.key)}"
              onclick="this.classList.toggle('on')" title="Toggle slot"></button>
          </div>
        </div>

        <!-- Code editor -->
        <div style="margin-bottom:10px">
          <label style="display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:5px">
            <span>Ad Code</span>
            <span style="color:${hasLive ? 'var(--green)' : 'var(--muted)'}">
              ${hasLive ? `✓ ${adCode.trim().length} chars — live code set` : 'Empty — native placeholder shown'}
            </span>
          </label>
          <textarea id="cadcode-${safe(s.key)}" rows="3"
            style="font-family:monospace;font-size:11.5px;background:#fafafa;border:2px solid ${hasLive ? 'var(--green)' : 'var(--gray2)'};border-radius:8px;width:100%;padding:10px;resize:vertical;outline:none;transition:border-color .2s"
            placeholder="Paste your Google AdSense &lt;ins&gt; + &lt;script&gt; code here…"
            onfocus="this.style.borderColor='var(--red)'"
            onblur="this.style.borderColor=(this.value.trim()?'var(--green)':'var(--gray2)')"
          >${safe(adCode)}</textarea>
        </div>

        <!-- Actions -->
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <button class="btn btn-red" data-cad-key="${safe(s.key)}"
            onclick="erContentAdsAdmin.saveSlot(this.dataset.cadKey)">💾 Save Slot</button>
          ${hasLive ? `<button class="btn btn-danger" data-cad-key="${safe(s.key)}"
            onclick="erContentAdsAdmin.clearSlot(this.dataset.cadKey)">✕ Clear</button>` : ''}
          <code style="margin-left:auto;background:#f4f4f4;padding:3px 9px;border-radius:6px;font-size:11px;color:var(--muted)">${safe(s.key)}</code>
        </div>
      </div>`;
  }

  /* ================================================================
     PUBLIC API
     ================================================================ */
  window.erContentAdsAdmin = {

    toggleMaster(type, btn) {
      btn.classList.toggle('on');
      // Live preview of button state only — saved on explicit save
    },

    setDensity(type, n) {
      const cfg = loadSettings();
      const key = type === 'notes' ? 'notesDensity' : 'solutionsDensity';
      cfg[key] = n;
      saveSettings(cfg);
      toast(`Density set to ${n}.`);
      renderContentAdsSettings();
    },

    togglePosition(type, posKey, btn) {
      btn.classList.toggle('on');
    },

    saveSettings() {
      const cfg = loadSettings();

      // Read master toggles
      const notesMaster = document.getElementById('master-notes');
      const solMaster   = document.getElementById('master-solutions');
      if (notesMaster) cfg.notesEnabled    = notesMaster.classList.contains('on');
      if (solMaster)   cfg.solutionsEnabled = solMaster.classList.contains('on');

      // Read position toggles
      ['notes','solutions'].forEach(type => {
        ['beforeSummary','afterSummary','midContent','afterContent','beforeMore'].forEach(pos => {
          const btn = document.getElementById(`pos-${type}-${pos}`);
          if (btn) cfg[type][pos] = btn.classList.contains('on');
        });
      });

      saveSettings(cfg);
      toast('In-content ad settings saved!');
      renderContentAdsSettings();
    },

    saveSlot(key) {
      const codeEl   = document.getElementById('cadcode-'   + key);
      const toggleEl = document.getElementById('cadtoggle-' + key);
      if (!codeEl) { toast('Slot not found.', 'error'); return; }
      const slots = getAdSlots();
      slots[key] = {
        enabled: toggleEl ? toggleEl.classList.contains('on') : true,
        adCode:  codeEl.value,
      };
      saveAdSlots(slots);
      toast(`"${key}" saved!`);
      renderContentAdsSettings();
      if (typeof renderDashboard === 'function') renderDashboard();
    },

    clearSlot(key) {
      if (!confirm(`Clear ad code for "${key}"?`)) return;
      const slots = getAdSlots();
      if (slots[key]) { slots[key].adCode = ''; slots[key].enabled = true; }
      saveAdSlots(slots);
      toast('Slot cleared.', 'warn');
      renderContentAdsSettings();
    },

    saveAll() {
      CONTENT_AD_SLOTS.forEach(s => {
        const codeEl   = document.getElementById('cadcode-'   + s.key);
        const toggleEl = document.getElementById('cadtoggle-' + s.key);
        if (!codeEl) return;
        const slots = getAdSlots();
        slots[s.key] = {
          enabled: toggleEl ? toggleEl.classList.contains('on') : true,
          adCode:  codeEl.value,
        };
        saveAdSlots(slots);
      });
      erContentAdsAdmin.saveSettings();
      toast('All in-content slots saved!');
    },

    exportConfig() {
      const cfg  = loadSettings();
      const slotData = {};
      CONTENT_AD_SLOTS.forEach(s => { slotData[s.key] = getAdSlots()[s.key] || {}; });
      const blob = new Blob([JSON.stringify({ settings: cfg, slots: slotData }, null, 2)], { type:'application/json' });
      const a    = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'examready-content-ads-' + new Date().toISOString().slice(0,10) + '.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      toast('Content ad config exported!');
    },

    importConfig(input) {
      const f = input.files[0]; if (!f) return;
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.settings) saveSettings(data.settings);
          if (data.slots) {
            const all = getAdSlots();
            Object.assign(all, data.slots);
            saveAdSlots(all);
          }
          toast('Config imported!');
          renderContentAdsSettings();
        } catch (err) { toast('Invalid JSON.', 'error'); }
      };
      reader.readAsText(f);
      input.value = '';
    }
  };

  /* ================================================================
     EXPOSE TO ADMIN — section and sidebar now live natively in
     admin.html, so we just expose the render function globally.
     ================================================================ */
  window.renderContentAdsSettings = renderContentAdsSettings;
  window.erContentAdsAdmin = window.erContentAdsAdmin; // already set above

})();

