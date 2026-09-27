/**
 * admin-extensions.js — ExamReady Admin Panel Extensions
 * Renders: Ad Placeholders, Chapter Mapper, Activity Log, Content Health,
 *          Bulk PDF helpers and CSV Quiz Import
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
  var html = '<div class="page-title">\ud83d\uddfa\ufe0f Chapter Resource Mapper</div>' +
    '<div class="page-subtitle">Visual grid showing which chapters have zero PDFs or quizzes. Red = missing, green = has resources.</div>';

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
        var total = pdfCount + quizCount;
        var color = total === 0 ? '#fff0f0;border-color:#ffd0ce;color:var(--red)' : total < 3 ? '#fff8f0;border-color:#ffe0a0;color:var(--orange)' : '#e6ffed;border-color:#b3e6c0;color:var(--green)';
        html += '<div style="padding:8px 12px;border-radius:10px;border:1.5px solid;font-size:12px;font-weight:800;cursor:pointer;' + color + '" ' +
          'onclick="showSection(\'upload-pdf\');setTimeout(function(){var c=document.getElementById(\'pdfClass\');if(c)c.value=\'' + cls + '\';onPdfClassChange();setTimeout(function(){var s=document.getElementById(\'pdfSubject\');if(s)s.value=\'' + safeHtml(subj.key) + '\';onPdfSubjectChange();},60);},60)" ' +
          'title="' + pdfCount + ' PDFs, ' + quizCount + ' quizzes">' +
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
   6. CSV / PASTE IMPORT
   ================================================================ */
var csvImportState = { mode: 'questions', rows: [], delimiter: ',' };

function csvEscape(value) {
  var text = String(value == null ? '' : value);
  return /[",\t\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function csvNormalizeHeader(value) {
  var key = String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  var aliases = {
    class: 'class', classname: 'class', grade: 'class',
    subject: 'subject', subjectname: 'subject',
    chapter: 'chapter', chaptername: 'chapter',
    deck: 'deck', deckname: 'deck', quiz: 'quiz', quizname: 'quiz',
    front: 'front', prompt: 'front', term: 'front',
    back: 'back', answer: 'back', meaning: 'back', explanation: 'explanation',
    hint: 'hint', question: 'question', questiontext: 'question',
    optiona: 'optionA', option1: 'optionA', a: 'optionA',
    optionb: 'optionB', option2: 'optionB', b: 'optionB',
    optionc: 'optionC', option3: 'optionC', c: 'optionC',
    optiond: 'optionD', option4: 'optionD', d: 'optionD',
    correct: 'correct', correctanswer: 'correct', answerkey: 'correct',
    difficulty: 'difficulty', year: 'year', session: 'year',
    name: 'name', title: 'name', filename: 'name',
    url: 'url', link: 'url', size: 'size', type: 'type'
  };
  return aliases[key] || key;
}

function csvDetectDelimiter(text) {
  var firstLine = String(text || '').split(/\r?\n/).find(function(line) { return line.trim(); }) || '';
  var tabs = (firstLine.match(/\t/g) || []).length;
  var commas = (firstLine.match(/,/g) || []).length;
  return tabs > commas ? '\t' : ',';
}

function csvParse(text) {
  var delimiter = csvDetectDelimiter(text);
  var rows = [], row = [], cell = '', quoted = false;
  for (var i = 0; i < text.length; i++) {
    var char = text[i], next = text[i + 1];
    if (char === '"') {
      if (quoted && next === '"') { cell += '"'; i++; }
      else { quoted = !quoted; }
    } else if (char === delimiter && !quoted) {
      row.push(cell); cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(function(value) { return String(value).trim(); })) rows.push(row);
      row = [];
    } else {
      cell += char;
    }
  }
  if (cell || row.length) { row.push(cell); if (row.some(function(value) { return String(value).trim(); })) rows.push(row); }
  if (!rows.length) return { headers: [], rows: [], delimiter: delimiter };
  var headers = rows.shift().map(csvNormalizeHeader);
  return { headers: headers, rows: rows.map(function(values, index) { var item = { __line: index + 2 }; headers.forEach(function(header, col) { item[header] = String(values[col] == null ? '' : values[col]).trim(); }); return item; }), delimiter: delimiter };
}

function csvValue(row, key) { return String(row[key] == null ? '' : row[key]).trim(); }
function csvClassValue(row) { return csvValue(row, 'class') || (document.getElementById('csvTargetClass') || {}).value || ''; }
function csvSubjectValue(row) { return csvValue(row, 'subject') || (document.getElementById('csvTargetSubject') || {}).value || ''; }
function csvChapterValue(row) { return csvValue(row, 'chapter') || (document.getElementById('csvTargetChapter') || {}).value || ''; }
function csvResolveChapterId(cls, subject, value) {
  var raw = String(value || '').trim(); if (!raw) return '';
  var chapters = typeof getChapters === 'function' ? getChapters(cls, subject) : [];
  var match = chapters.find(function(ch) { return String(ch.id) === raw || String(ch.name).toLowerCase() === raw.toLowerCase() || ('ch ' + ch.number).toLowerCase() === raw.toLowerCase() || String(ch.number) === raw; });
  return match ? match.id : '';
}

function csvTargetSubjectOptions() {
  var cls = (document.getElementById('csvTargetClass') || {}).value || '9';
  var map = typeof getSubjectsMap === 'function' ? getSubjectsMap() : {};
  return (map[cls] || []).map(function(subject) { return '<option value="' + safeHtml(subject.key) + '">' + safeHtml(subject.label || subject.key) + '</option>'; }).join('');
}

function csvExistingDeckOptions() {
  var store = typeof getFlashcardStoreAdmin === 'function' ? getFlashcardStoreAdmin() : { decks: [] };
  return '<option value="">Create from CSV deck column</option>' + store.decks.map(function(deck) { return '<option value="' + safeHtml(deck.id) + '">' + safeHtml(deck.title) + '</option>'; }).join('');
}

function csvExistingQuizOptions() {
  var all = getData('quizzes') || {}, options = '<option value="">Create from CSV quiz column</option>';
  Object.keys(all).forEach(function(key) { (all[key] || []).forEach(function(quiz) { options += '<option value="' + safeHtml(quiz.id) + '">' + safeHtml(quiz.title || quiz.id) + ' · ' + safeHtml(quiz.class || '') + '</option>'; }); });
  return options;
}

function renderCsvTargetFields() {
  var mode = (document.getElementById('csvImportMode') || {}).value || 'questions';
  var target = document.getElementById('csvTargetFields'); if (!target) return;
  var isResource = mode === 'resources';
  var targetLabel = mode === 'flashcards' ? 'Target deck' : mode === 'questions' ? 'Target quiz' : 'Paper type';
  var extra = mode === 'resources'
    ? '<div class="form-group"><label>Paper type</label><select id="csvResourceType"><option value="pyq">PYQ</option><option value="spq">SQP / SPQ</option><option value="qb">Question Bank</option><option value="ip">Institutional Paper</option></select></div>'
    : '<div class="form-group"><label>' + targetLabel + '</label><select id="csvTargetItem">' + (mode === 'flashcards' ? csvExistingDeckOptions() : csvExistingQuizOptions()) + '</select><input type="text" id="csvNewTargetTitle" placeholder="New ' + (mode === 'flashcards' ? 'deck' : 'quiz') + ' title (used when CSV has no ' + (mode === 'flashcards' ? 'deck' : 'quiz') + ' column)" style="margin-top:7px"></div>';
  target.innerHTML = '<div class="form-row"><div class="form-group"><label>Target class</label><select id="csvTargetClass" onchange="refreshCsvImportTargets()"><option value="9">Class 9</option><option value="10">Class 10</option><option value="11">Class 11</option><option value="12">Class 12</option></select></div><div class="form-group"><label>Target subject</label><select id="csvTargetSubject" onchange="refreshCsvImportTargets()">' + csvTargetSubjectOptions() + '</select></div></div><div class="form-row"><div class="form-group"><label>Target chapter (optional)</label><select id="csvTargetChapter"><option value="">— Read chapter from CSV —</option></select></div>' + extra + '</div>';
  refreshCsvImportTargets();
}

window.refreshCsvImportTargets = function() {
  var cls = (document.getElementById('csvTargetClass') || {}).value || '9';
  var subjectEl = document.getElementById('csvTargetSubject');
  var subject = subjectEl ? subjectEl.value : '';
  if (subjectEl && subjectEl.dataset.csvClass !== cls) {
    var previousSubject = subject;
    subjectEl.innerHTML = csvTargetSubjectOptions();
    subject = [...subjectEl.options].some(function(option) { return option.value === previousSubject; }) ? previousSubject : (subjectEl.options[0] ? subjectEl.options[0].value : '');
    subjectEl.value = subject;
    subjectEl.dataset.csvClass = cls;
  }
  var chapter = document.getElementById('csvTargetChapter');
  if (chapter) {
    var chapters = typeof getChapters === 'function' ? getChapters(cls, subject) : [];
    chapter.innerHTML = '<option value="">— Read chapter from CSV —</option>' + chapters.map(function(item) { return '<option value="' + safeHtml(item.id) + '">Ch ' + safeHtml(String(item.number)) + ': ' + safeHtml(item.name) + '</option>'; }).join('');
  }
};

function csvFormatGuide(mode) {
  if (mode === 'flashcards') return 'class, subject, chapter, deck, front, back, hint';
  if (mode === 'resources') return 'class, subject, chapter, name, url, type, year, size';
  return 'class, subject, chapter, quiz, question, optionA, optionB, optionC, optionD, correct, explanation, year, difficulty';
}

function csvTemplate(mode) {
  if (mode === 'flashcards') return 'class,subject,chapter,deck,front,back,hint\n9,math,Number Systems,Number Systems Quick Review,What is 2 + 2?,4,,\n';
  if (mode === 'resources') return 'class,subject,chapter,name,url,type,year,size\n9,math,Number Systems,Class 9 Maths PYQ 2024,https://example.com/paper.pdf,pyq,2024,2 MB\n';
  return 'class,subject,chapter,quiz,question,optionA,optionB,optionC,optionD,correct,explanation,year,difficulty\n9,math,Number Systems,Number Systems Quiz,Which is irrational?,sqrt(4),sqrt(9),sqrt(2),sqrt(16),C,,2024,Easy\n';
}

function csvRowError(row, mode) {
  var errors = [], cls = csvClassValue(row), subject = csvSubjectValue(row);
  if (!['9', '10', '11', '12'].includes(String(cls))) errors.push('class must be 9, 10, 11, or 12');
  if (!subject) errors.push('subject is required');
  if (mode === 'flashcards') {
    if (!csvValue(row, 'front')) errors.push('front is required');
    if (!csvValue(row, 'back')) errors.push('back is required');
    if (!csvValue(row, 'deck') && !(document.getElementById('csvTargetItem') || {}).value && !csvValue(row, 'deck') && !(document.getElementById('csvNewTargetTitle') || {}).value.trim()) errors.push('deck is required');
  } else if (mode === 'questions') {
    ['question', 'optionA', 'optionB', 'optionC', 'optionD'].forEach(function(key) { if (!csvValue(row, key)) errors.push(key + ' is required'); });
    if (!/^[ABCD]$/i.test(csvValue(row, 'correct'))) errors.push('correct must be A, B, C, or D');
    if (!csvValue(row, 'quiz') && !(document.getElementById('csvTargetItem') || {}).value && !((document.getElementById('csvNewTargetTitle') || {}).value || '').trim()) errors.push('quiz is required');
  } else {
    if (!csvValue(row, 'name')) errors.push('name is required');
    if (!csvValue(row, 'url')) errors.push('url is required');
    else if (typeof safeStoredResourceUrl === 'function' && !safeStoredResourceUrl(csvValue(row, 'url'), '')) errors.push('url is invalid');
    if (!/^(pyq|qb|spq|ip)$/i.test(csvValue(row, 'type') || (document.getElementById('csvResourceType') || {}).value)) errors.push('type must be pyq, spq, qb, or ip');
  }
  return errors;
}

function renderCsvPreview(parsed, mode) {
  var body = document.getElementById('csvPreviewBody'), head = document.getElementById('csvPreviewHead'), count = document.getElementById('csvPreviewCount');
  if (!body || !head) return;
  var previewHeaders = mode === 'flashcards' ? ['front', 'back', 'deck'] : mode === 'resources' ? ['name', 'url', 'type'] : ['question', 'optionA', 'optionB', 'correct'];
  head.innerHTML = '<tr><th>Row</th><th>Status</th>' + previewHeaders.map(function(key) { return '<th>' + safeHtml(key) + '</th>'; }).join('') + '</tr>';
  body.innerHTML = parsed.rows.map(function(row) {
    var errors = csvRowError(row, mode); row.__errors = errors;
    return '<tr style="background:' + (errors.length ? '#fff0f0' : '#f0fff4') + '"><td>' + row.__line + '</td><td><span class="badge ' + (errors.length ? 'badge-red' : 'badge-green') + '">' + (errors.length ? safeHtml(errors.join('; ')) : 'Valid') + '</span></td>' + previewHeaders.map(function(key) { return '<td>' + safeHtml(csvValue(row, key)) + '</td>'; }).join('') + '</tr>';
  }).join('') || '<tr class="empty-row"><td colspan="6">No rows found. Paste CSV text or upload a file.</td></tr>';
  var valid = parsed.rows.filter(function(row) { return !(row.__errors || []).length; }).length;
  count.textContent = parsed.rows.length + ' rows · ' + valid + ' valid · ' + (parsed.rows.length - valid) + ' with errors';
  csvImportState = { mode: mode, rows: parsed.rows, delimiter: parsed.delimiter };
};

window.previewCsvImport = function() {
  var text = (document.getElementById('csvImportText') || {}).value || '';
  var mode = (document.getElementById('csvImportMode') || {}).value || 'questions';
  if (!text.trim()) { showToast('Paste CSV data or choose a file first.', 'error'); return; }
  var parsed = csvParse(text);
  if (!parsed.headers.length) { showToast('No CSV header row found.', 'error'); return; }
  renderCsvPreview(parsed, mode);
  document.getElementById('csvStatus').textContent = 'Detected ' + (parsed.delimiter === '\t' ? 'tab' : 'comma') + ' separators.';
};

window.downloadCsvTemplate = function() {
  var mode = (document.getElementById('csvImportMode') || {}).value || 'questions';
  var blob = new Blob([csvTemplate(mode)], { type: 'text/csv;charset=utf-8' });
  var link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'examready-' + mode + '-template.csv'; link.click();
  setTimeout(function() { URL.revokeObjectURL(link.href); }, 1000);
};

window.loadCsvFile = function(input) {
  var file = input.files && input.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(event) { document.getElementById('csvImportText').value = event.target.result; document.getElementById('csvStatus').textContent = 'Loaded: ' + file.name; previewCsvImport(); };
  reader.onerror = function() { showToast('Could not read the CSV file.', 'error'); };
  reader.readAsText(file, 'UTF-8');
};

function csvBuildQuestion(row) {
  var ans = { A: 0, B: 1, C: 2, D: 3 }[csvValue(row, 'correct').toUpperCase()];
  var question = { q: csvValue(row, 'question'), opts: [csvValue(row, 'optionA'), csvValue(row, 'optionB'), csvValue(row, 'optionC'), csvValue(row, 'optionD')], ans: ans };
  ['explanation', 'year', 'difficulty'].forEach(function(key) { if (csvValue(row, key)) question[key] = csvValue(row, key); });
  return question;
}

function csvImportFlashcards(rows, policy) {
  var store = getFlashcardStoreAdmin(), added = 0, updated = 0, skipped = 0;
  rows.forEach(function(row) {
    var cls = csvClassValue(row), subject = csvSubjectValue(row), chapterValue = csvChapterValue(row), targetId = (document.getElementById('csvTargetItem') || {}).value || '';
    var deckTitle = csvValue(row, 'deck') || ((document.getElementById('csvNewTargetTitle') || {}).value || '').trim();
    var deck = targetId ? store.decks.find(function(item) { return item.id === targetId; }) : store.decks.find(function(item) { return item.title.toLowerCase() === deckTitle.toLowerCase() && String(item.class) === String(cls) && String(item.subject) === String(subject); });
    if (!deck) { deck = { id: genId(), title: deckTitle, description: 'Imported flashcards for focused revision.', class: String(cls), subject: subject, subjectLabel: typeof getSubjectLabel === 'function' ? getSubjectLabel(cls, subject) : subject, chapterId: csvResolveChapterId(cls, subject, chapterValue), chapter: chapterValue || 'General revision', published: true, cards: [] }; store.decks.push(deck); }
    var front = csvValue(row, 'front'), back = csvValue(row, 'back'), existing = (deck.cards || []).find(function(card) { return String(card.front).trim().toLowerCase() === front.toLowerCase() && String(card.back).trim().toLowerCase() === back.toLowerCase(); });
    if (existing && policy === 'skip') { skipped++; return; }
    if (existing) { existing.hint = csvValue(row, 'hint'); updated++; return; }
    deck.cards = deck.cards || []; deck.cards.push({ id: genId(), front: front, back: back, hint: csvValue(row, 'hint') }); added++;
  });
  saveFlashcardStoreAdmin(store); if (typeof renderFlashcardTable === 'function') renderFlashcardTable(); return { added: added, updated: updated, skipped: skipped };
}

function csvImportQuestions(rows, policy) {
  var all = getData('quizzes') || {}, added = 0, updated = 0, skipped = 0;
  rows.forEach(function(row) {
    var cls = csvClassValue(row), subject = csvSubjectValue(row), chapterValue = csvChapterValue(row), selectedId = (document.getElementById('csvTargetItem') || {}).value || '';
    var quizTitle = csvValue(row, 'quiz') || ((document.getElementById('csvNewTargetTitle') || {}).value || '').trim(), key = cls + '-' + subject, quiz = null;
    Object.keys(all).some(function(groupKey) { var found = (all[groupKey] || []).find(function(item) { return item.id === selectedId; }); if (found) { quiz = found; return true; } return false; });
    if (!quiz) { if (!all[key]) all[key] = []; quiz = all[key].find(function(item) { return item.title.toLowerCase() === quizTitle.toLowerCase(); }); }
    if (!quiz) { quiz = { id: genId(), title: quizTitle, subject: typeof getSubjectLabel === 'function' ? getSubjectLabel(cls, subject) : subject, class: String(cls), chapterId: csvResolveChapterId(cls, subject, chapterValue), questions: [] }; if (!all[key]) all[key] = []; all[key].push(quiz); }
    var nextQuestion = csvBuildQuestion(row), existing = (quiz.questions || []).find(function(item) { return String(item.q).trim().toLowerCase() === nextQuestion.q.toLowerCase(); });
    if (existing && policy === 'skip') { skipped++; return; }
    if (existing) { Object.assign(existing, nextQuestion); updated++; return; }
    quiz.questions = quiz.questions || []; quiz.questions.push(nextQuestion); added++;
  });
  setData('quizzes', all); if (typeof renderQuizTable === 'function') renderQuizTable(); return { added: added, updated: updated, skipped: skipped };
}

function csvImportResources(rows, policy) {
  var all = getData('pdfs') || {}, added = 0, updated = 0, skipped = 0;
  rows.forEach(function(row) {
    var cls = csvClassValue(row), subject = csvSubjectValue(row), type = (csvValue(row, 'type') || (document.getElementById('csvResourceType') || {}).value || 'pyq').toLowerCase(), chapterValue = csvChapterValue(row), key = cls + '-' + subject + '-' + type;
    if (!Array.isArray(all[key])) all[key] = [];
    var item = { id: genId(), name: csvValue(row, 'name').slice(0, 200), class: String(cls), subject: subject, type: type, chapterId: csvResolveChapterId(cls, subject, chapterValue), year: csvValue(row, 'year').slice(0, 40), url: typeof safeStoredResourceUrl === 'function' ? safeStoredResourceUrl(csvValue(row, 'url'), '') : csvValue(row, 'url'), size: csvValue(row, 'size').slice(0, 40) };
    var existing = all[key].find(function(resource) { return String(resource.name).trim().toLowerCase() === item.name.toLowerCase() && String(resource.url).trim() === item.url; });
    if (existing && policy === 'skip') { skipped++; return; }
    if (existing) { Object.assign(existing, item, { id: existing.id }); updated++; return; }
    all[key].push(item); added++;
  });
  setData('pdfs', all); if (typeof renderPDFTable === 'function') renderPDFTable(); return { added: added, updated: updated, skipped: skipped };
}

window.importCsvRows = function() {
  if (!csvImportState.rows.length) { previewCsvImport(); if (!csvImportState.rows.length) return; }
  var valid = csvImportState.rows.filter(function(row) { return !(row.__errors || []).length; });
  if (!valid.length) { showToast('There are no valid rows to import.', 'error'); return; }
  var policy = (document.getElementById('csvDuplicatePolicy') || {}).value || 'skip', result;
  if (csvImportState.mode === 'flashcards') result = csvImportFlashcards(valid, policy);
  else if (csvImportState.mode === 'resources') result = csvImportResources(valid, policy);
  else result = csvImportQuestions(valid, policy);
  var failed = csvImportState.rows.length - valid.length;
  var summary = 'Added ' + result.added + ' · Updated ' + result.updated + ' · Skipped ' + result.skipped + ' · Failed ' + failed;
  document.getElementById('csvImportSummary').innerHTML = '<strong>Import complete.</strong> ' + safeHtml(summary) + '<br><span style="font-size:11px">Invalid rows were left out so valid rows could still be imported.</span>';
  document.getElementById('csvImportSummary').style.display = 'block';
  showToast(summary);
};

window.closeCsvImportModal = function() { var modal = document.getElementById('csvImportModal'); if (modal) modal.style.display = 'none'; };

window.openCsvImportModal = function(mode) {
  mode = mode || 'questions';
  var modal = document.getElementById('csvImportModal');
  if (!modal) {
    modal = document.createElement('div'); modal.id = 'csvImportModal'; modal.style.cssText = 'display:flex;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:2000;align-items:center;justify-content:center;padding:16px';
    modal.innerHTML = `<div style="background:#fff;border-radius:14px;width:100%;max-width:1100px;max-height:calc(100vh - 32px);overflow:auto"><div style="padding:18px 22px;border-bottom:1px solid var(--gray2);display:flex;align-items:center;justify-content:space-between;gap:14px"><div><h3 style="font-size:17px;font-weight:900">📋 Import content via CSV</h3><p style="font-size:12px;color:var(--muted);font-weight:700;margin-top:4px">Paste from Excel or Google Sheets, or upload a UTF-8 CSV file.</p></div><button onclick="closeCsvImportModal()" style="background:var(--gray2);border:none;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:15px">✕</button></div><div style="padding:20px"><div class="form-row"><div class="form-group"><label>Import type</label><select id="csvImportMode" onchange="renderCsvTargetFields();document.getElementById('csvFormatGuide').textContent=csvFormatGuide(this.value)"><option value="flashcards">Flashcards</option><option value="questions">Quiz questions</option><option value="resources">PYQ / SQP / Question Bank papers</option></select></div><div class="form-group"><label>Duplicate handling</label><select id="csvDuplicatePolicy"><option value="skip">Skip duplicates</option><option value="update">Update duplicates</option></select></div></div><div id="csvTargetFields"></div><div class="form-group"><label>Paste CSV or tab-separated data</label><textarea id="csvImportText" rows="7" style="font-family:monospace;font-size:12px" placeholder="class,subject,chapter,deck,front,back,hint"></textarea><div class="form-hint">Format: <code id="csvFormatGuide"></code>. Quoted commas, quoted line breaks, UTF-8, and tabs are supported.</div></div><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px"><input type="file" id="csvFileInput" accept=".csv,.tsv,.txt" onchange="loadCsvFile(this)" style="font-size:12px"><button class="btn btn-gray" onclick="downloadCsvTemplate()">⬇ Download CSV template</button><button class="btn btn-edit" onclick="previewCsvImport()">🔎 Preview import</button><span id="csvStatus" style="font-size:12px;font-weight:700;color:var(--muted)"></span></div><div id="csvPreviewCount" style="font-size:12px;font-weight:900;color:var(--muted);margin:10px 0"></div><div style="overflow:auto;max-height:240px;border:1px solid var(--gray2);border-radius:8px"><table><thead id="csvPreviewHead"></thead><tbody id="csvPreviewBody"></tbody></table></div><div id="csvImportSummary" style="margin-top:14px;padding:12px 14px;border-radius:8px;background:#f0fff4;color:#1a6a2a;font-size:12px;font-weight:700;display:none"></div></div><div style="padding:14px 22px;border-top:1px solid var(--gray2);display:flex;justify-content:flex-end;gap:10px"><button class="btn btn-gray" onclick="closeCsvImportModal()">Cancel</button><button class="btn btn-red" onclick="importCsvRows()">⬇ Import valid rows</button></div></div>`;
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex'; document.getElementById('csvImportMode').value = mode; document.getElementById('csvFormatGuide').textContent = csvFormatGuide(mode); renderCsvTargetFields(); csvImportState = { mode: mode, rows: [], delimiter: ',' };
};

})();
