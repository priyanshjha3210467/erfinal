/**
 * notes-admin.js — ExamReady Notes Manager Admin Patch
 * ======================================================
 * Auto-injects the Notes Manager into admin.html.
 * Include at the bottom of admin.html AFTER shared.js:
 *
 *   <script src="notes-admin.js"></script>
 *
 * Adds:
 *  • Sidebar nav items: "Notes" (list) + "Add Note" (editor)
 *  • #sec-notes — notes list/table
 *  • #sec-create-note — notes editor (add + edit)
 *  • All CRUD logic: create, edit, delete, search, filter
 *  • Subject + chapter dropdowns reuse existing shared.js helpers
 */
(function () {
  'use strict';

  const PAGE = window.location.pathname.split('/').pop() || '';
  if (!PAGE.includes('admin')) return;

  /* ================================================================
     STORAGE
     ================================================================ */
  function loadNotes() {
    if (typeof getAllNotes === 'function') return getAllNotes();
    try {
      const raw = localStorage.getItem('examready_notes');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  function persistNotes(notes) {
    if (typeof saveAllNotes === 'function') {
      saveAllNotes(notes);
    } else {
      localStorage.setItem('examready_notes', JSON.stringify(notes));
    }
  }

  function genNoteId() {
    return typeof genId === 'function' ? genId() : ('note_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9));
  }

  /* ================================================================
     TOAST / UTILS
     ================================================================ */
  function toast(msg, type) {
    if (typeof showToast === 'function') showToast(msg, type || 'success');
    else alert(msg);
  }

  function safe(v) {
    if (typeof escapeHtml === 'function') return escapeHtml(v);
    return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function subLabel(cls, key) {
    if (typeof getSubjectLabel === 'function') return getSubjectLabel(cls, key);
    return String(key || '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  function subjectOptions(cls) {
    if (typeof getSubjectsMap !== 'function') return '<option value="">—</option>';
    const subs = (getSubjectsMap()[cls] || []);
    return subs.length
      ? subs.map(s => `<option value="${safe(s.key)}">${safe(s.icon || '')} ${safe(s.label)}</option>`).join('')
      : '<option value="">No subjects</option>';
  }

  function chapterOptions(cls, subjectKey) {
    if (typeof getChapters !== 'function') return '<option value="">— No Chapter —</option>';
    const chs = getChapters(cls, subjectKey);
    return '<option value="">— No Chapter —</option>' +
      chs.map(c => `<option value="${safe(c.id)}">Ch ${safe(String(c.number))}: ${safe(c.name)}</option>`).join('');
  }

  function humanDate(v) {
    if (typeof formatHumanDate === 'function') return formatHumanDate(v);
    return v || 'Recently';
  }

  /* ================================================================
     WORD-COUNT STATS
     ================================================================ */
  function updateNoteStats() {
    const summary  = (document.getElementById('noteEditorSummary')?.value || '').trim();
    const content  = (document.getElementById('noteEditorContent')?.value || '').trim();
    const tags     = (document.getElementById('noteEditorTags')?.value || '').split(',').map(t => t.trim()).filter(Boolean);
    const words    = content.split(/\s+/).filter(Boolean).length;
    const paras    = content.split(/\n\s*\n/).filter(b => b.trim()).length;
    const statsEl  = document.getElementById('noteEditorStats');
    if (!statsEl) return;
    statsEl.innerHTML = [
      { label: 'Summary', val: summary.length + ' chars' },
      { label: 'Body words', val: words },
      { label: 'Paragraphs', val: paras },
      { label: 'Tags', val: tags.length },
      { label: 'Read time', val: Math.max(1, Math.round(words / 200)) + ' min' },
    ].map(s => `<div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid var(--gray2);font-size:12px"><span style="font-weight:700;color:var(--muted)">${s.label}</span><strong>${s.val}</strong></div>`).join('');
  }

  /* ================================================================
     TABLE RENDER
     ================================================================ */
  function renderNotesTable() {
    const clsFilter   = (document.getElementById('noteClassFilter')?.value || '').trim();
    const subjFilter  = (document.getElementById('noteSubjFilter')?.value || '').trim();
    const searchVal   = (document.getElementById('noteSearch')?.value || '').toLowerCase().trim();
    const tbody       = document.getElementById('noteTableBody');
    const countEl     = document.getElementById('noteCount');
    if (!tbody) return;

    let notes = loadNotes();
    if (clsFilter)  notes = notes.filter(n => n.classNum === clsFilter);
    if (subjFilter) notes = notes.filter(n => n.subjectKey === subjFilter);
    if (searchVal)  notes = notes.filter(n => (n.title||'').toLowerCase().includes(searchVal) || (n.summary||'').toLowerCase().includes(searchVal));

    if (countEl) countEl.textContent = notes.length + ' note' + (notes.length !== 1 ? 's' : '');

    tbody.innerHTML = notes.length ? notes.map(note => `
      <tr>
        <td><b style="font-size:13px">${safe(note.title)}</b></td>
        <td><span class="badge badge-blue">Class ${safe(note.classNum)}</span></td>
        <td>${safe(subLabel(note.classNum, note.subjectKey))}</td>
        <td>${(note.tags||[]).slice(0,3).map(t => `<span class="badge badge-purple" style="margin-right:3px;font-size:10px">${safe(t)}</span>`).join('')}</td>
        <td>${safe(humanDate(note.updatedAt))}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-edit" style="padding:5px 10px;font-size:11px"
              data-nid="${safe(note.id)}" onclick="erNotes.editNote(this.dataset.nid)">✏ Edit</button>
            <button class="btn btn-danger" style="padding:5px 10px;font-size:11px"
              data-nid="${safe(note.id)}" onclick="erNotes.deleteNote(this.dataset.nid)">🗑 Delete</button>
          </div>
        </td>
      </tr>`).join('') : '<tr class="empty-row"><td colspan="6">No notes found</td></tr>';
  }

  /* ================================================================
     SUBJECT FILTER HELPER
     ================================================================ */
  function populateNoteSubjectFilter() {
    const sel = document.getElementById('noteSubjFilter');
    if (!sel) return;
    const cls = document.getElementById('noteClassFilter')?.value || '';
    if (!cls) {
      sel.innerHTML = '<option value="">All Subjects</option>';
      return;
    }
    const subs = typeof getSubjectsMap === 'function' ? (getSubjectsMap()[cls] || []) : [];
    sel.innerHTML = '<option value="">All Subjects</option>' +
      subs.map(s => `<option value="${safe(s.key)}">${safe(s.label)}</option>`).join('');
  }

  /* ================================================================
     EDITOR CLASS/SUBJECT CHANGE
     ================================================================ */
  function onNoteClassChange() {
    const cls = document.getElementById('noteEditorClass')?.value || '';
    const subjSel = document.getElementById('noteEditorSubject');
    if (subjSel) subjSel.innerHTML = subjectOptions(cls);
    populateNoteChapters();
  }

  function populateNoteChapters() {
    const cls     = document.getElementById('noteEditorClass')?.value || '';
    const subjKey = document.getElementById('noteEditorSubject')?.value || '';
    const chapSel = document.getElementById('noteEditorChapter');
    if (chapSel) chapSel.innerHTML = chapterOptions(cls, subjKey);
  }

  /* ================================================================
     PUBLIC API
     ================================================================ */
  window.erNotes = {

    startNew() {
      document.getElementById('noteEditorId').value   = '';
      document.getElementById('noteEditorTitle').value   = '';
      document.getElementById('noteEditorSummary').value = '';
      document.getElementById('noteEditorContent').value = '';
      document.getElementById('noteEditorTags').value    = '';
      document.getElementById('noteEditorClass').value   = '9';
      onNoteClassChange();
      const titleEl = document.getElementById('noteEditorPageTitle');
      if (titleEl) titleEl.textContent = '➕ Create New Note';
      updateNoteStats();
      erNotes._showSection('create-note');
    },

    saveNote() {
      const id       = document.getElementById('noteEditorId')?.value?.trim();
      const title    = document.getElementById('noteEditorTitle')?.value?.trim();
      const cls      = document.getElementById('noteEditorClass')?.value;
      const subj     = document.getElementById('noteEditorSubject')?.value;
      const summary  = document.getElementById('noteEditorSummary')?.value?.trim();
      const content  = document.getElementById('noteEditorContent')?.value?.trim();
      const tagsRaw  = document.getElementById('noteEditorTags')?.value || '';
      const chapId   = document.getElementById('noteEditorChapter')?.value || '';
      const tags     = tagsRaw.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

      if (!title)   { toast('Please enter a note title.', 'error'); return; }
      if (!subj)    { toast('Please select a subject.', 'error'); return; }
      if (!summary) { toast('Please enter a short summary.', 'error'); return; }
      if (!content) { toast('Please enter note content.', 'error'); return; }

      const notes   = loadNotes();
      const payload = {
        id: id || genNoteId(),
        title, classNum: cls, subjectKey: subj, summary, content,
        tags, chapterId: chapId,
        author: 'ExamReady Team',
        updatedAt: new Date().toISOString().slice(0, 10),
      };

      const next = id ? notes.map(n => n.id === id ? { ...n, ...payload } : n) : [payload, ...notes];
      persistNotes(next);
      toast(id ? 'Note updated!' : 'Note published!');
      erNotes._showSection('notes');
      renderNotesTable();
      if (typeof renderDashboard === 'function') renderDashboard();
    },

    editNote(noteId) {
      const note = loadNotes().find(n => n.id === noteId);
      if (!note) { toast('Note not found.', 'error'); return; }
      erNotes._showSection('create-note');
      document.getElementById('noteEditorId').value      = note.id;
      document.getElementById('noteEditorTitle').value   = note.title || '';
      document.getElementById('noteEditorClass').value   = note.classNum || '9';
      onNoteClassChange();
      // Restore subject
      const subjSel = document.getElementById('noteEditorSubject');
      if (subjSel && note.subjectKey) {
        setTimeout(() => {
          subjSel.value = note.subjectKey;
          populateNoteChapters();
          setTimeout(() => {
            const chapSel = document.getElementById('noteEditorChapter');
            if (chapSel) chapSel.value = note.chapterId || '';
          }, 50);
        }, 0);
      }
      document.getElementById('noteEditorSummary').value = note.summary || '';
      document.getElementById('noteEditorContent').value = note.content || '';
      document.getElementById('noteEditorTags').value    = (note.tags || []).join(', ');
      const titleEl = document.getElementById('noteEditorPageTitle');
      if (titleEl) titleEl.textContent = '✏ Edit Note';
      updateNoteStats();
    },

    deleteNote(noteId) {
      if (!confirm('Delete this note permanently?')) return;
      persistNotes(loadNotes().filter(n => n.id !== noteId));
      renderNotesTable();
      toast('Note deleted.');
      if (typeof renderDashboard === 'function') renderDashboard();
    },

    clearFilters() {
      const cf = document.getElementById('noteClassFilter');
      const sf = document.getElementById('noteSubjFilter');
      const sc = document.getElementById('noteSearch');
      if (cf) cf.value = '';
      if (sf) sf.innerHTML = '<option value="">All Subjects</option>';
      if (sc) sc.value = '';
      renderNotesTable();
    },

    _showSection(id) {
      if (typeof showSection === 'function') showSection(id);
    },
  };

  /* ================================================================
     HTML BUILDERS
     ================================================================ */
  function buildNotesListSection() {
    return `
      <div class="page-title">📝 Short Notes</div>
      <div class="page-subtitle">Publish, edit, and remove short text notes for any subject and class.</div>
      <div class="filter-bar">
        <select class="filter-select" id="noteClassFilter" onchange="populateNoteSubjectFilter();renderNotesTable()">
          <option value="">All Classes</option>
          <option value="9">Class 9</option>
          <option value="10">Class 10</option>
          <option value="11">Class 11</option>
          <option value="12">Class 12</option>
        </select>
        <select class="filter-select" id="noteSubjFilter" onchange="renderNotesTable()">
          <option value="">All Subjects</option>
        </select>
        <input type="text" class="filter-select" id="noteSearch" placeholder="🔍 Search by title…" onkeyup="renderNotesTable()" style="min-width:200px">
        <button class="btn btn-gray" onclick="erNotes.clearFilters()">✕ Clear</button>
        <button class="btn btn-red" onclick="erNotes.startNew()">➕ New Note</button>
      </div>
      <div class="table-card">
        <div class="table-header">
          <h3>Published Notes</h3>
          <span id="noteCount" style="font-size:12px;color:var(--muted);font-weight:700"></span>
        </div>
        <div style="overflow-x:auto">
          <table>
            <thead><tr><th>Title</th><th>Class</th><th>Subject</th><th>Tags</th><th>Updated</th><th>Actions</th></tr></thead>
            <tbody id="noteTableBody"></tbody>
          </table>
        </div>
      </div>`;
  }

  function buildNoteEditorSection() {
    return `
      <div class="page-title" id="noteEditorPageTitle">➕ Create New Note</div>
      <div class="page-subtitle">Write concise notes with key points, formulas, and exam tips. Use - for bullet lists. Use [TIP], [WARNING], or [IMPORTANT] at the start of a paragraph for callout boxes.</div>
      <div class="form-card" style="max-width:none">
        <div class="table-header"><h3>Note Editor</h3></div>
        <div class="form-body">
          <input type="hidden" id="noteEditorId">
          <div style="display:grid;grid-template-columns:minmax(0,1.5fr) 280px;gap:20px;align-items:start">

            <!-- Left: form fields -->
            <div>
              <div class="form-group"><label>Note Title *</label><input type="text" id="noteEditorTitle" placeholder="e.g. Class 10 Maths – Triangles Quick Notes" oninput="updateNoteStats()"></div>
              <div class="form-row">
                <div class="form-group">
                  <label>Class *</label>
                  <select id="noteEditorClass" onchange="onNoteClassChange()">
                    <option value="9">Class 9</option>
                    <option value="10">Class 10</option>
                    <option value="11">Class 11</option>
                    <option value="12">Class 12</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Subject *</label>
                  <select id="noteEditorSubject" onchange="populateNoteChapters()"></select>
                </div>
              </div>
              <div class="form-group">
                <label>Chapter (optional)</label>
                <select id="noteEditorChapter"><option value="">— No Chapter —</option></select>
                <div class="form-hint">Assign this note to a chapter for the subject hub page</div>
              </div>
              <div class="form-group">
                <label>Short Summary * <span style="font-size:10px;font-weight:700;color:var(--muted)">(shown on cards and at the top of the note)</span></label>
                <textarea id="noteEditorSummary" rows="3" placeholder="Key takeaway in 1-2 sentences." oninput="updateNoteStats()"></textarea>
              </div>
              <div class="form-group">
                <label>Note Content * <span style="font-size:10px;font-weight:700;color:var(--muted)">— Use blank lines to separate paragraphs</span></label>
                <textarea id="noteEditorContent" rows="18" placeholder="Write your note here.

Use - at the start of lines for bullet points.
1. Use numbers for ordered lists.

[TIP] Add tip callout boxes like this.
[WARNING] Or warning boxes.
[IMPORTANT] Or important boxes." oninput="updateNoteStats()" style="font-family:monospace;font-size:13px"></textarea>
              </div>
              <div class="form-group">
                <label>Tags <span style="font-size:10px;font-weight:700;color:var(--muted)">(comma-separated — e.g. important, formula, exam-tips)</span></label>
                <input type="text" id="noteEditorTags" placeholder="important, formula, exam-tips, concept" oninput="updateNoteStats()">
                <div class="form-hint">Recommended tags: <strong>important</strong>, <strong>formula</strong>, <strong>exam-tips</strong>, <strong>concept</strong></div>
              </div>
              <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">
                <button class="btn btn-red btn-lg" onclick="erNotes.saveNote()">💾 Save Note</button>
                <button class="btn btn-gray btn-lg" onclick="erNotes.startNew()">↺ Clear</button>
                <button class="btn btn-gray btn-lg" onclick="erNotes._showSection('notes')">Cancel</button>
              </div>
            </div>

            <!-- Right: stats + tips -->
            <div style="display:flex;flex-direction:column;gap:16px">
              <div class="table-card">
                <div class="table-header"><h3>Editor Stats</h3></div>
                <div class="form-body" id="noteEditorStats"></div>
              </div>
              <div style="background:#fffbf0;border:1px solid #ffe8a0;border-radius:16px;padding:16px">
                <h4 style="font-size:14px;font-weight:900;margin-bottom:10px">✍ Writing Tips</h4>
                <p style="font-size:12px;color:var(--muted);line-height:1.75">
                  <strong>Callouts:</strong> Start a paragraph with <code>[TIP]</code>, <code>[WARNING]</code>, or <code>[IMPORTANT]</code> followed by your text to create a coloured callout box.<br><br>
                  <strong>Lists:</strong> Start lines with <code>-&nbsp;</code> for bullets or <code>1.&nbsp;</code> for numbered steps.<br><br>
                  <strong>Keep it concise.</strong> Aim for 150–400 words. Notes should complement, not replace, the textbook.
                </p>
              </div>
              <div style="background:#f0fff4;border:1px solid #b2f2cb;border-radius:16px;padding:16px">
                <h4 style="font-size:14px;font-weight:900;margin-bottom:8px">🏷 Suggested Tags</h4>
                <div style="display:flex;flex-wrap:wrap;gap:6px">
                  ${['important','formula','exam-tips','concept','definition','theorem','diagram','shortcut','revision'].map(t =>
                    `<span style="background:#e6ffed;color:#2f9e44;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:800;cursor:pointer" onclick="(function(el,tag){const f=document.getElementById('noteEditorTags');const cur=f.value.split(',').map(t=>t.trim()).filter(Boolean);if(!cur.includes(tag)){cur.push(tag);f.value=cur.join(', ');updateNoteStats();}})(this,'${t}')">${t}</span>`
                  ).join('')}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>`;
  }

  /* ================================================================
     INJECT INTO ADMIN
     ================================================================ */
  function injectSidebarItems() {
    if (document.querySelector('[data-nav-notes]')) return;
    const contentSection = Array.from(document.querySelectorAll('.sidebar-section')).find(el => /content/i.test(el.textContent));
    if (!contentSection) return;

    // Find "All Quizzes" nav item — insert Notes after it
    const allNavItems = Array.from(document.querySelectorAll('.nav-item'));
    const quizzesBtn  = allNavItems.find(el => el.textContent.includes('All Quizzes'));
    const insertAfterEl = quizzesBtn || contentSection;

    const notesBtn = document.createElement('button');
    notesBtn.className = 'nav-item';
    notesBtn.dataset.navNotes = '1';
    notesBtn.innerHTML = '<span class="nav-icon">📝</span> Short Notes';
    notesBtn.onclick = () => {
      if (typeof showSection === 'function') showSection('notes');
    };

    const addNoteBtn = document.createElement('button');
    addNoteBtn.className = 'nav-item';
    addNoteBtn.dataset.navNotes = '2';
    addNoteBtn.innerHTML = '<span class="nav-icon">✏</span> Add Note';
    addNoteBtn.onclick = () => erNotes.startNew();

    insertAfterEl.insertAdjacentElement('afterend', addNoteBtn);
    insertAfterEl.insertAdjacentElement('afterend', notesBtn);
  }

  function injectSections() {
    if (document.getElementById('sec-notes')) return;
    const adminContent = document.querySelector('.admin-content');
    if (!adminContent) return;

    const listSec = document.createElement('div');
    listSec.className = 'admin-section';
    listSec.id = 'sec-notes';
    listSec.innerHTML = buildNotesListSection();
    adminContent.appendChild(listSec);

    const editSec = document.createElement('div');
    editSec.className = 'admin-section';
    editSec.id = 'sec-create-note';
    editSec.innerHTML = buildNoteEditorSection();
    adminContent.appendChild(editSec);
  }

  function patchShowSection() {
    const orig = window.showSection;
    if (typeof orig !== 'function' || orig._notePatched) return;

    window.showSection = function (id) {
      orig(id);
      if (id === 'notes') {
        document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
        const sec = document.getElementById('sec-notes');
        if (sec) sec.classList.add('active');
        document.querySelectorAll('.nav-item').forEach(n => {
          n.classList.toggle('active', !!(n.dataset.navNotes === '1' && id === 'notes'));
        });
        const tb = document.getElementById('topbarTitle');
        if (tb) tb.textContent = 'Short Notes';
        renderNotesTable();
        return;
      }
      if (id === 'create-note') {
        document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
        const sec = document.getElementById('sec-create-note');
        if (sec) sec.classList.add('active');
        document.querySelectorAll('.nav-item').forEach(n => {
          n.classList.toggle('active', !!(n.dataset.navNotes === '2' && id === 'create-note'));
        });
        const tb = document.getElementById('topbarTitle');
        if (tb) tb.textContent = 'Add / Edit Note';
        onNoteClassChange();
        updateNoteStats();
        return;
      }
    };
    window.showSection._notePatched = true;
  }

  /* Expose helpers for inline events */
  window.populateNoteSubjectFilter = populateNoteSubjectFilter;
  window.renderNotesTable          = renderNotesTable;
  window.updateNoteStats           = updateNoteStats;
  window.onNoteClassChange         = onNoteClassChange;
  window.populateNoteChapters      = populateNoteChapters;

  /* ================================================================
     BOOT
     ================================================================ */
  function boot() {
    const timer = setInterval(() => {
      if (document.querySelector('.admin-content') && document.querySelector('.sidebar-section')) {
        clearInterval(timer);
        injectSidebarItems();
        injectSections();
        patchShowSection();
        // Initialise the subject dropdown with default class 9
        onNoteClassChange();
      }
    }, 120);
    setTimeout(() => {
      clearInterval(timer);
      injectSidebarItems();
      injectSections();
      patchShowSection();
      onNoteClassChange();
    }, 4500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
