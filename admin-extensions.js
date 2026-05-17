/**
 * admin-extensions.js — ExamReady Admin Panel Extensions
 * Renders: Ad Placeholders, Chapter Mapper, Activity Log, Content Health,
 *          Bulk PDF helpers, CSV Quiz Import, Solution History modal
 */
(function() {
'use strict';

/* ================================================================
   1. AD PLACEHOLDER MANAGER
   ================================================================ */
window.renderAdPlaceholders = function() {
  var sec = document.getElementById('sec-ad-placeholders');
  if (!sec) return;
  var cfg = {};
  try { cfg = JSON.parse(localStorage.getItem('er_native_ad_config') || '{}'); } catch(e) {}
  sec.innerHTML =
    '<div class="page-title">\ud83c\udff7\ufe0f Native Ad Placeholder Manager</div>' +
    '<div class="page-subtitle">Edit the placeholder copy shown when no real AdSense code is set. Changes apply site-wide instantly.</div>' +
    '<div class="form-card"><div class="table-header"><h3>Placeholder Settings</h3></div><div class="form-body">' +
      '<div class="form-group"><label>Placeholder Title</label><input type="text" id="phTitle" value="' + safeHtml(cfg.title || 'Study Resources') + '" placeholder="e.g. Study Resources"></div>' +
      '<div class="form-group"><label>Placeholder Body</label><textarea id="phBody" rows="3" placeholder="Short promo text...">' + safeHtml(cfg.body || 'Explore curated study materials for your exam prep.') + '</textarea></div>' +
      '<div class="form-row"><div class="form-group"><label>CTA Button Text</label><input type="text" id="phCTA" value="' + safeHtml(cfg.cta || 'Explore Now') + '"></div>' +
      '<div class="form-group"><label>CTA Link URL</label><input type="url" id="phURL" value="' + safeHtml(cfg.url || 'index.html') + '"></div></div>' +
      '<button class="btn btn-red btn-lg" onclick="saveAdPlaceholders()">\ud83d\udcbe Save Placeholders</button>' +
    '</div></div>' +
    '<div style="margin-top:20px"><div style="font-size:12px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Live Preview</div>' +
    '<div id="phPreview" style="background:#fafafa;border:2px solid var(--gray2);border-radius:14px;padding:20px;text-align:center">' +
      '<div style="font-size:15px;font-weight:900;margin-bottom:6px">' + safeHtml(cfg.title || 'Study Resources') + '</div>' +
      '<div style="font-size:13px;color:var(--muted);font-weight:600;margin-bottom:12px">' + safeHtml(cfg.body || 'Explore curated study materials for your exam prep.') + '</div>' +
      '<a style="display:inline-block;padding:8px 20px;background:var(--red);color:#fff;border-radius:8px;font-weight:800;font-size:13px;text-decoration:none">' + safeHtml(cfg.cta || 'Explore Now') + '</a>' +
    '</div></div>';
};

window.saveAdPlaceholders = function() {
  var cfg = {
    title: (document.getElementById('phTitle') || {}).value || '',
    body:  (document.getElementById('phBody') || {}).value || '',
    cta:   (document.getElementById('phCTA') || {}).value || '',
    url:   (document.getElementById('phURL') || {}).value || ''
  };
  localStorage.setItem('er_native_ad_config', JSON.stringify(cfg));
  showToast('Placeholder settings saved!');
  renderAdPlaceholders();
};

/* ================================================================
   2. CHAPTER-TO-RESOURCE MAPPER
   ================================================================ */
window.renderChapterMapper = function() {
  var sec = document.getElementById('sec-chapter-mapper');
  if (!sec) return;
  var map = typeof getSubjectsMap === 'function' ? getSubjectsMap() : {};
  var allPDFs = typeof getAllPDFs === 'function' ? getAllPDFs() : [];
  var allQuizzes = typeof getAllQuizzes === 'function' ? getAllQuizzes() : [];
  var allSols = typeof getAllSolutionsSafe === 'function' ? getAllSolutionsSafe() : [];
  var html = '<div class="page-title">\ud83d\uddfa\ufe0f Chapter Resource Mapper</div>' +
    '<div class="page-subtitle">Visual grid showing which chapters have zero PDFs, quizzes, or solutions. Red = missing, green = has resources.</div>';

  ['9','10','11','12'].forEach(function(cls) {
    var subjects = map[cls] || [];
    if (!subjects.length) return;
    html += '<div class="table-card" style="margin-bottom:18px"><div class="table-header"><h3>Class ' + cls + '</h3></div><div style="padding:16px">';
    subjects.forEach(function(subj) {
      var chapters = typeof getChapters === 'function' ? getChapters(cls, subj.key) : [];
      if (!chapters.length) return;
      html += '<div style="margin-bottom:14px"><strong style="font-size:13px">' + safeHtml(subj.icon || '') + ' ' + safeHtml(subj.label) + '</strong>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">';
      chapters.forEach(function(ch) {
        var pdfCount = allPDFs.filter(function(p) { return p.class === cls && p.subject === subj.key && p.chapterId === ch.id; }).length;
        var quizCount = allQuizzes.filter(function(q) { return q.classNum === cls && q.subjectKey === subj.key && q.chapterId === ch.id; }).length;
        var solCount = allSols.filter(function(s) { return (s.class || s.classNum) === cls && (s.subject || s.subjectKey) === subj.key && s.chapterId === ch.id; }).length;
        var total = pdfCount + quizCount + solCount;
        var color = total === 0 ? '#fff0f0;border-color:#ffd0ce;color:var(--red)' : total < 3 ? '#fff8f0;border-color:#ffe0a0;color:var(--orange)' : '#e6ffed;border-color:#b3e6c0;color:var(--green)';
        html += '<div style="padding:8px 12px;border-radius:10px;border:1.5px solid;font-size:12px;font-weight:800;cursor:pointer;' + color + '" ' +
          'onclick="showSection(\'upload-pdf\');setTimeout(function(){var c=document.getElementById(\'pdfClass\');if(c)c.value=\'' + cls + '\';onPdfClassChange();setTimeout(function(){var s=document.getElementById(\'pdfSubject\');if(s)s.value=\'' + safeHtml(subj.key) + '\';onPdfSubjectChange();},60);},60)" ' +
          'title="' + pdfCount + ' PDFs, ' + quizCount + ' quizzes, ' + solCount + ' solutions">' +
          'Ch ' + ch.number + ': ' + safeHtml(ch.name) +
          ' <span style="opacity:.7">(' + total + ')</span></div>';
      });
      html += '</div></div>';
    });
    html += '</div></div>';
  });
  sec.innerHTML = html;
};

/* ================================================================
   3. SESSION ACTIVITY LOG
   ================================================================ */
window.renderActivityLog = function() {
  var sec = document.getElementById('sec-activity-log');
  if (!sec) return;
  var logs = [];
  try { if (window.erSec && typeof window.erSec.getLogs === 'function') logs = window.erSec.getLogs(); } catch(e) {}
  var html = '<div class="page-title">\ud83d\udccb Session Activity Log</div>' +
    '<div class="page-subtitle">Security and session events from erSec. ' + logs.length + ' entries.</div>' +
    '<div class="filter-bar"><select class="filter-select" id="logLevelFilter" onchange="renderActivityLog()"><option value="">All Levels</option><option value="info">Info</option><option value="warn">Warning</option><option value="error">Error</option></select>' +
    '<input type="text" class="filter-select" id="logSearch" placeholder="\ud83d\udd0d Search..." onkeyup="renderActivityLog()" style="min-width:200px">' +
    '<button class="btn btn-danger" onclick="if(window.erSec&&erSec.clearLogs)erSec.clearLogs();renderActivityLog()">Clear Logs</button></div>';

  var levelFilter = (document.getElementById('logLevelFilter') || {}).value || '';
  var searchFilter = ((document.getElementById('logSearch') || {}).value || '').toLowerCase();
  var filtered = logs.filter(function(l) {
    if (levelFilter && l.level !== levelFilter) return false;
    if (searchFilter && (l.message || '').toLowerCase().indexOf(searchFilter) === -1) return false;
    return true;
  });

  html += '<div class="table-card"><div class="table-header"><h3>Log Entries</h3><span style="font-size:12px;color:var(--muted);font-weight:700">' + filtered.length + ' shown</span></div>' +
    '<div style="overflow-x:auto"><table><thead><tr><th>Time</th><th>Level</th><th>Message</th><th>Details</th></tr></thead><tbody>';

  if (filtered.length) {
    filtered.slice(0, 100).forEach(function(l) {
      var badgeClass = l.level === 'error' ? 'badge-red' : l.level === 'warn' ? 'badge-orange' : 'badge-blue';
      var time = l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : '—';
      var details = l.data ? '<code style="font-size:10px;word-break:break-all">' + safeHtml(JSON.stringify(l.data).slice(0, 120)) + '</code>' : '—';
      html += '<tr><td style="white-space:nowrap;font-size:12px">' + time + '</td><td><span class="badge ' + badgeClass + '">' + safeHtml(l.level || 'info') + '</span></td><td style="font-size:12px;max-width:300px">' + safeHtml(l.message || '') + '</td><td style="font-size:11px">' + details + '</td></tr>';
    });
  } else {
    html += '<tr class="empty-row"><td colspan="4">No log entries' + (logs.length ? ' matching filters' : '') + '</td></tr>';
  }
  html += '</tbody></table></div></div>';
  sec.innerHTML = html;
};

/* ================================================================
   4. CONTENT HEALTH SCORE
   ================================================================ */
window.renderContentHealth = function() {
  var sec = document.getElementById('sec-content-health');
  if (!sec) return;
  var map = typeof getSubjectsMap === 'function' ? getSubjectsMap() : {};
  var allPDFs = typeof getAllPDFs === 'function' ? getAllPDFs() : [];
  var allQuizzes = typeof getAllQuizzes === 'function' ? getAllQuizzes() : [];
  var allSols = typeof getAllSolutionsSafe === 'function' ? getAllSolutionsSafe() : [];

  var html = '<div class="page-title">\ud83d\udc9a Content Health Score</div>' +
    '<div class="page-subtitle">Each class/subject is graded by resource diversity: \ud83d\udfe2 3+ types, \ud83d\udfe1 1\u20132 types, \ud83d\udd34 zero resources.</div>' +
    '<div class="stat-grid" style="margin-bottom:20px">';

  var totalRed = 0, totalYellow = 0, totalGreen = 0;
  var rows = [];

  ['9','10','11','12'].forEach(function(cls) {
    (map[cls] || []).forEach(function(subj) {
      var types = new Set();
      allPDFs.filter(function(p) { return p.class === cls && p.subject === subj.key; }).forEach(function(p) { types.add(p.type); });
      if (allQuizzes.some(function(q) { return q.classNum === cls && q.subjectKey === subj.key; })) types.add('quiz');
      if (allSols.some(function(s) { return (s.class || s.classNum) === cls && (s.subject || s.subjectKey) === subj.key; })) types.add('sol');
      var grade = types.size >= 3 ? 'green' : types.size >= 1 ? 'yellow' : 'red';
      if (grade === 'red') totalRed++; else if (grade === 'yellow') totalYellow++; else totalGreen++;
      rows.push({ cls: cls, subj: subj, types: types, grade: grade });
    });
  });

  html += '<div class="stat-card"><div class="stat-num" style="color:var(--green)">' + totalGreen + '</div><div class="stat-lbl">\ud83d\udfe2 Healthy</div></div>';
  html += '<div class="stat-card"><div class="stat-num" style="color:var(--orange)">' + totalYellow + '</div><div class="stat-lbl">\ud83d\udfe1 Needs More</div></div>';
  html += '<div class="stat-card"><div class="stat-num" style="color:var(--red)">' + totalRed + '</div><div class="stat-lbl">\ud83d\udd34 Empty</div></div>';
  html += '</div>';

  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">';
  rows.forEach(function(r) {
    var bg = r.grade === 'red' ? '#fff0f0' : r.grade === 'yellow' ? '#fff8f0' : '#e6ffed';
    var border = r.grade === 'red' ? '#ffd0ce' : r.grade === 'yellow' ? '#ffe0a0' : '#b3e6c0';
    var emoji = r.grade === 'red' ? '\ud83d\udd34' : r.grade === 'yellow' ? '\ud83d\udfe1' : '\ud83d\udfe2';
    html += '<div style="background:' + bg + ';border:1.5px solid ' + border + ';border-radius:12px;padding:14px 16px;cursor:pointer" ' +
      'onclick="showSection(\'upload-pdf\');setTimeout(function(){var c=document.getElementById(\'pdfClass\');if(c)c.value=\'' + r.cls + '\';onPdfClassChange();setTimeout(function(){var s=document.getElementById(\'pdfSubject\');if(s)s.value=\'' + safeHtml(r.subj.key) + '\';},60);},60)">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="font-size:20px">' + safeHtml(r.subj.icon || '\ud83d\udcda') + '</span><strong style="font-size:13px">' + safeHtml(r.subj.label) + '</strong><span class="badge badge-blue">Class ' + r.cls + '</span></div>' +
      '<div style="font-size:12px;font-weight:700;color:var(--muted)">' + emoji + ' ' + r.types.size + ' resource type' + (r.types.size !== 1 ? 's' : '') + (r.types.size ? ': ' + Array.from(r.types).join(', ') : '') + '</div></div>';
  });
  html += '</div>';
  sec.innerHTML = html;
};

/* ================================================================
   5. BULK PDF OPERATIONS
   ================================================================ */
window.toggleAllPdfChecks = function(checked) {
  document.querySelectorAll('.pdf-bulk-check').forEach(function(cb) { cb.checked = checked; });
  updateBulkBar();
};

window.updateBulkBar = function() {
  var checks = document.querySelectorAll('.pdf-bulk-check:checked');
  var bar = document.getElementById('pdfBulkBar');
  var count = document.getElementById('pdfBulkCount');
  if (bar) bar.style.display = checks.length > 0 ? 'flex' : 'none';
  if (count) count.textContent = checks.length + ' selected';
  var selectAll = document.getElementById('pdfSelectAll');
  if (selectAll) selectAll.checked = checks.length > 0 && checks.length === document.querySelectorAll('.pdf-bulk-check').length;
};

function getSelectedPdfs() {
  var items = [];
  document.querySelectorAll('.pdf-bulk-check:checked').forEach(function(cb) {
    items.push({ cls: cb.dataset.cls, subj: cb.dataset.subj, type: cb.dataset.type, id: cb.dataset.id });
  });
  return items;
}

window.bulkDeletePdfs = function() {
  var sel = getSelectedPdfs();
  if (!sel.length) return;
  if (!confirm('Delete ' + sel.length + ' selected PDFs permanently?')) return;
  var allPDFs = getData('pdfs') || {};
  sel.forEach(function(s) {
    var key = s.cls + '-' + s.subj + '-' + s.type;
    if (allPDFs[key]) allPDFs[key] = allPDFs[key].filter(function(p) { return p.id !== s.id; });
  });
  setData('pdfs', allPDFs);
  showToast(sel.length + ' PDFs deleted.');
  renderPDFTable();
};

window.bulkRetypePdfs = function() {
  var newType = (document.getElementById('bulkRetypeSelect') || {}).value;
  if (!newType) { showToast('Select a type first.', 'warn'); return; }
  var sel = getSelectedPdfs();
  if (!sel.length) return;
  var allPDFs = getData('pdfs') || {};
  sel.forEach(function(s) {
    var oldKey = s.cls + '-' + s.subj + '-' + s.type;
    var newKey = s.cls + '-' + s.subj + '-' + newType;
    var list = allPDFs[oldKey] || [];
    var idx = list.findIndex(function(p) { return p.id === s.id; });
    if (idx > -1) {
      var item = list.splice(idx, 1)[0];
      if (!allPDFs[newKey]) allPDFs[newKey] = [];
      allPDFs[newKey].push(item);
    }
  });
  setData('pdfs', allPDFs);
  showToast(sel.length + ' PDFs retyped to ' + newType + '.');
  renderPDFTable();
};

window.bulkAssignYear = function() {
  var year = (document.getElementById('bulkYearInput') || {}).value || '';
  if (!year.trim()) { showToast('Enter a year first.', 'warn'); return; }
  var sel = getSelectedPdfs();
  if (!sel.length) return;
  var allPDFs = getData('pdfs') || {};
  sel.forEach(function(s) {
    var key = s.cls + '-' + s.subj + '-' + s.type;
    var item = (allPDFs[key] || []).find(function(p) { return p.id === s.id; });
    if (item) item.year = year.trim();
  });
  setData('pdfs', allPDFs);
  showToast(sel.length + ' PDFs updated to year ' + year + '.');
  renderPDFTable();
};

/* ================================================================
   6. QUIZ CSV IMPORT
   ================================================================ */
window.openCsvImportModal = function() {
  var existing = document.getElementById('csvImportModal');
  if (existing) { existing.style.display = 'flex'; return; }
  var modal = document.createElement('div');
  modal.id = 'csvImportModal';
  modal.style.cssText = 'display:flex;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML =
    '<div style="background:#fff;border-radius:16px;width:100%;max-width:600px;overflow:hidden">' +
      '<div style="padding:18px 22px;border-bottom:1px solid var(--gray2);display:flex;align-items:center;justify-content:space-between"><h3 style="font-size:16px;font-weight:900">\ud83d\udccb Import Questions from CSV</h3><button onclick="document.getElementById(\'csvImportModal\').style.display=\'none\'" style="background:var(--gray2);border:none;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:14px">\u2715</button></div>' +
      '<div style="padding:22px">' +
        '<div class="form-group"><label>Paste CSV or upload file</label>' +
        '<textarea id="csvImportText" rows="8" style="font-family:monospace;font-size:12px" placeholder="question,optionA,optionB,optionC,optionD,correct\nWhat is 2+2?,2,3,4,5,C"></textarea></div>' +
        '<div style="display:flex;gap:10px;align-items:center;margin-bottom:14px"><input type="file" id="csvFileInput" accept=".csv,.txt" onchange="loadCsvFile(this)" style="font-size:12px"><span id="csvStatus" style="font-size:12px;font-weight:700;color:var(--muted)"></span></div>' +
        '<div class="form-hint" style="margin-bottom:14px">Columns: <code>question, optionA, optionB, optionC, optionD, correct</code> (correct = A/B/C/D)</div>' +
      '</div>' +
      '<div style="padding:14px 22px;border-top:1px solid var(--gray2);display:flex;justify-content:flex-end;gap:10px"><button class="btn btn-gray" onclick="document.getElementById(\'csvImportModal\').style.display=\'none\'">Cancel</button><button class="btn btn-red" onclick="importCsvQuestions()">\u2b07 Import Questions</button></div>' +
    '</div>';
  document.body.appendChild(modal);
};

window.loadCsvFile = function(input) {
  var f = input.files[0]; if (!f) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('csvImportText').value = e.target.result;
    document.getElementById('csvStatus').textContent = 'Loaded: ' + f.name;
  };
  reader.readAsText(f);
};

window.importCsvQuestions = function() {
  var text = (document.getElementById('csvImportText') || {}).value || '';
  if (!text.trim()) { showToast('Paste CSV data first.', 'error'); return; }
  var lines = text.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);
  var startIdx = 0;
  if (lines[0] && /question/i.test(lines[0]) && /option/i.test(lines[0])) startIdx = 1;
  var added = 0;
  for (var i = startIdx; i < lines.length; i++) {
    var cols = lines[i].split(',').map(function(c) { return c.trim().replace(/^"|"$/g, ''); });
    if (cols.length < 6) continue;
    var ansMap = { A: 0, B: 1, C: 2, D: 3 };
    var ans = ansMap[(cols[5] || '').toUpperCase()] || 0;
    addQuestion({ q: cols[0], opts: [cols[1], cols[2], cols[3], cols[4]], ans: ans });
    added++;
  }
  document.getElementById('csvImportModal').style.display = 'none';
  showToast(added + ' questions imported from CSV!');
};

/* ================================================================
   7. SOLUTION HISTORY MODAL
   ================================================================ */
window.openSolHistoryModal = function(id) {
  var history = typeof getSolutionHistory === 'function' ? getSolutionHistory(id) : [];
  var existing = document.getElementById('solHistoryModal');
  if (existing) existing.remove();
  var modal = document.createElement('div');
  modal.id = 'solHistoryModal';
  modal.style.cssText = 'display:flex;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;align-items:center;justify-content:center;padding:20px';
  var rows = history.map(function(h, idx) {
    var date = h._snapshotAt ? new Date(h._snapshotAt).toLocaleString() : 'Unknown';
    var wordCount = (h.content || '').split(/\s+/).filter(Boolean).length;
    return '<div style="padding:14px 16px;background:#fafafa;border:1px solid var(--gray2);border-radius:10px;margin-bottom:8px">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">' +
        '<div><strong style="font-size:13px">v' + (history.length - idx) + '</strong> <span style="font-size:12px;color:var(--muted);font-weight:700">\u2014 ' + date + '</span>' +
        '<div style="font-size:11px;color:var(--muted);font-weight:600;margin-top:3px">' + wordCount + ' words \u00b7 ' + safeHtml((h.summary || '').slice(0, 80)) + '</div></div>' +
        '<button class="btn btn-edit" style="font-size:11px;padding:5px 12px" data-idx="' + idx + '" onclick="restoreSolVersion(\'' + safeHtml(id) + '\',' + idx + ')">Restore</button>' +
      '</div></div>';
  }).join('');
  modal.innerHTML =
    '<div style="background:#fff;border-radius:16px;width:100%;max-width:560px;max-height:80vh;overflow-y:auto">' +
      '<div style="padding:18px 22px;border-bottom:1px solid var(--gray2);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:#fff;z-index:1"><h3 style="font-size:16px;font-weight:900">\ud83d\udcdc Version History</h3><button onclick="document.getElementById(\'solHistoryModal\').remove()" style="background:var(--gray2);border:none;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:14px">\u2715</button></div>' +
      '<div style="padding:22px">' + (rows || '<div class="empty-state"><p>No history available.</p></div>') + '</div></div>';
  document.body.appendChild(modal);
};

window.restoreSolVersion = function(id, idx) {
  var history = typeof getSolutionHistory === 'function' ? getSolutionHistory(id) : [];
  var version = history[idx];
  if (!version) { showToast('Version not found.', 'error'); return; }
  if (!confirm('Restore this version? The current draft in the editor will be replaced.')) return;
  document.getElementById('solHistoryModal').remove();
  editSolutionPost(id);
  setTimeout(function() {
    var nameEl = document.getElementById('solName');
    var summaryEl = document.getElementById('solSummary');
    var contentEl = document.getElementById('solContent');
    if (nameEl) nameEl.value = version.title || '';
    if (summaryEl) summaryEl.value = version.summary || '';
    if (contentEl) contentEl.value = version.content || '';
    if (typeof updateSolutionEditorStats === 'function') updateSolutionEditorStats();
    showToast('Version restored into editor. Click Save to apply.');
  }, 300);
};

})();
