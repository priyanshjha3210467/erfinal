// ===== EXAMREADY SHARED DATA STORE =====
// Data is synced via Firebase Realtime Database.
// Admin writes go to localStorage + Firebase. Public pages read from Firebase.

// ===== FIREBASE REALTIME DATABASE =====
const FIREBASE_DB_URL = 'https://examready-f2df6-default-rtdb.firebaseio.com';
const FIREBASE_DATA_PATH = '/siteData';
let _erSiteDataReady = null; // Promise that resolves when data is loaded

function _isAdminPageCheck() {
  return window.location.pathname.includes('admin');
}

// Keys to sync between localStorage and Firebase
const SITE_DATA_KEYS = [
  'examready_pdfs', 'examready_quizzes', 'examready_solution_posts',
  'er_subjects_map', 'er_site_config', 'er_nav', 'er_announcement',
  'er_features', 'er_ad_slots', 'er_chapters',
  'er_adsense_autoads', 'er_adsense_autoads_enabled',
  'er_native_ad_config', 'er_content_ads_config'
];

// ── Firebase REST helpers ──
function _firebaseGet() {
  return fetch(FIREBASE_DB_URL + FIREBASE_DATA_PATH + '.json')
    .then(function(res) {
      if (!res.ok) throw new Error('Firebase GET failed: ' + res.status);
      return res.json();
    });
}

function _firebasePut(key, value) {
  return fetch(FIREBASE_DB_URL + FIREBASE_DATA_PATH + '/' + key + '.json', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value)
  }).catch(function() { /* silent fail for non-critical sync */ });
}

function _firebasePutAll(data) {
  return fetch(FIREBASE_DB_URL + FIREBASE_DATA_PATH + '.json', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

// ── Hydrate localStorage from Firebase (public pages) ──
function _hydrateSiteData() {
  return _firebaseGet()
    .then(function(data) {
      if (!data || typeof data !== 'object') return;

      SITE_DATA_KEYS.forEach(function(key) {
        var val = data[key];
        if (val === undefined || val === null) return;

        if (typeof val === 'string' || typeof val === 'boolean' || typeof val === 'number') {
          localStorage.setItem(key, String(val));
        } else {
          localStorage.setItem(key, JSON.stringify(val));
        }
      });

      // Invalidate caches after hydration
      if (typeof invalidateDataCache === 'function') invalidateDataCache();
      _subjectsMapCache = null;
      _subjectsMapRaw = null;
    })
    .catch(function() {
      // Firebase unavailable — fall back to localStorage/defaults silently
    });
}

// ── Auto-sync admin writes to Firebase ──
// Intercepts localStorage.setItem on admin pages so every save
// automatically pushes to Firebase in real-time.
var _fbSyncTimers = {};
var _origLocalStorageSetItem = localStorage.setItem.bind(localStorage);

if (_isAdminPageCheck()) {
  localStorage.setItem = function(key, value) {
    _origLocalStorageSetItem(key, value);

    // Debounce Firebase sync for known data keys (500ms)
    if (SITE_DATA_KEYS.indexOf(key) !== -1) {
      clearTimeout(_fbSyncTimers[key]);
      _fbSyncTimers[key] = setTimeout(function() {
        var parsed;
        try { parsed = JSON.parse(value); } catch(e) { parsed = value; }
        _firebasePut(key, parsed);
      }, 500);
    }
  };
}

// ── Push ALL current localStorage data to Firebase (first-time setup) ──
function firebasePushAll() {
  var payload = {};
  SITE_DATA_KEYS.forEach(function(key) {
    var raw = localStorage.getItem(key);
    if (raw) {
      try { payload[key] = JSON.parse(raw); } catch(e) { payload[key] = raw; }
    }
  });
  return _firebasePutAll(payload)
    .then(function(res) {
      if (!res.ok) throw new Error('Push failed: ' + res.status);
      return res.json();
    });
}

// Start hydration on public pages, skip on admin
if (!_isAdminPageCheck()) {
  _erSiteDataReady = _hydrateSiteData();
} else {
  _erSiteDataReady = Promise.resolve();
}

// ===== DEFAULTS =====
const DEFAULTS = {
  pdfs: {
    "9-math-pyq": [
      { id:"p1", name:"Class 9 Maths PYQ 2023", year:"2023", url:"#", size:"2.1 MB" },
      { id:"p2", name:"Class 9 Maths PYQ 2022", year:"2022", url:"#", size:"1.8 MB" },
    ],
    "9-math-qb": [
      { id:"p3", name:"Class 9 Maths Question Bank Ch 1-5", url:"#", size:"3.2 MB" },
    ],
    "9-math-sol": [
      { id:"ps1", name:"Class 9 Maths NCERT Solutions - All Chapters", url:"#", size:"4.5 MB" },
    ],
    "9-science-pyq": [
      { id:"p4", name:"Class 9 Science PYQ 2023", year:"2023", url:"#", size:"2.4 MB" },
    ],
    "9-science-qb": [
      { id:"p5", name:"Class 9 Science Question Bank", url:"#", size:"4.1 MB" },
    ],
    "9-science-sol": [
      { id:"ps2", name:"Class 9 Science NCERT Solutions - All Chapters", url:"#", size:"3.8 MB" },
    ],
    "9-english-sol": [], "9-sst-sol": [], "9-hindi-sol": [],
    "10-math-pyq": [
      { id:"p6", name:"Class 10 Maths PYQ 2023", year:"2023", url:"#", size:"2.3 MB" },
      { id:"p7", name:"Class 10 Maths PYQ 2022", year:"2022", url:"#", size:"2.0 MB" },
    ],
    "10-math-qb": [{ id:"p8", name:"Class 10 Maths Question Bank", url:"#", size:"3.8 MB" }],
    "10-math-sol": [{ id:"ps3", name:"Class 10 Maths NCERT Solutions - All Chapters", url:"#", size:"5.1 MB" }],
    "10-science-pyq": [{ id:"p9", name:"Class 10 Science PYQ 2023", year:"2023", url:"#", size:"2.7 MB" }],
    "10-science-qb": [], "10-science-sol": [{ id:"ps4", name:"Class 10 Science NCERT Solutions", url:"#", size:"4.2 MB" }],
    "10-english-sol": [], "10-sst-sol": [], "10-hindi-sol": [],
    "11-physics-pyq": [{ id:"p10", name:"Class 11 Physics PYQ 2023", year:"2023", url:"#", size:"3.1 MB" }],
    "11-physics-qb": [], "11-physics-sol": [],
    "11-chemistry-pyq": [], "11-chemistry-qb": [], "11-chemistry-sol": [],
    "11-math-pyq": [], "11-math-qb": [], "11-math-sol": [],
    "11-biology-sol": [], "11-cs-sol": [],
    "12-physics-pyq": [
      { id:"p11", name:"Class 12 Physics PYQ 2023", year:"2023", url:"#", size:"3.4 MB" },
      { id:"p12", name:"Class 12 Physics PYQ 2022", year:"2022", url:"#", size:"3.0 MB" },
    ],
    "12-physics-qb": [], "12-physics-sol": [],
    "12-chemistry-pyq": [], "12-chemistry-qb": [], "12-chemistry-sol": [],
    "12-math-pyq": [], "12-math-qb": [], "12-math-sol": [],
    "12-biology-sol": [], "12-cs-sol": [],
  },
  quizzes: {
    "9-math": [{
      id:"q1", title:"Class 9 Maths - Number Systems", subject:"Mathematics", class:"9",
      questions: [
        { q:"Which of the following is an irrational number?", opts:["sqrt(4)","sqrt(9)","sqrt(2)","sqrt(16)"], ans:2 },
        { q:"Every rational number is also a:", opts:["Natural number","Integer","Real number","Whole number"], ans:2 },
        { q:"The decimal expansion of a rational number is:", opts:["Always terminating","Always non-terminating","Terminating or repeating","None"], ans:2 },
      ]
    }],
    "9-science": [{
      id:"q2", title:"Class 9 Science - Matter", subject:"Science", class:"9",
      questions: [
        { q:"Which state of matter has definite shape and volume?", opts:["Gas","Liquid","Solid","Plasma"], ans:2 },
        { q:"Conversion of solid to gas directly is called:", opts:["Evaporation","Condensation","Sublimation","Fusion"], ans:2 },
      ]
    }],
    "10-math": [{
      id:"q3", title:"Class 10 Maths - Real Numbers", subject:"Mathematics", class:"10",
      questions: [
        { q:"HCF of 96 and 404 is:", opts:["4","8","12","16"], ans:0 },
        { q:"Every composite number as a product of primes follows:", opts:["Euclid's theorem","Fundamental theorem of arithmetic","Division algorithm","None"], ans:1 },
      ]
    }],
    "10-science": [], "11-physics": [], "11-chemistry": [], "11-math": [],
    "12-physics": [{
      id:"q4", title:"Class 12 Physics - Electrostatics", subject:"Physics", class:"12",
      questions: [
        { q:"The SI unit of electric charge is:", opts:["Ampere","Volt","Coulomb","Farad"], ans:2 },
        { q:"Electric field lines start from:", opts:["Negative charge","Positive charge","Both","Neither"], ans:1 },
      ]
    }],
    "12-chemistry": [], "12-math": [],
  }
};

// ===== CORE DATA API (with caching) =====
const _dataCache = {};
const _dataDirty = new Set();

function getData(key) {
  if (_dataCache[key] !== undefined && !_dataDirty.has(key)) {
    // Return deep clone to prevent mutation of cached value
    return JSON.parse(JSON.stringify(_dataCache[key]));
  }
  try {
    const raw = localStorage.getItem('examready_' + key);
    if (raw) {
      const parsed = JSON.parse(raw);
      _dataCache[key] = parsed;
      _dataDirty.delete(key);
      return JSON.parse(JSON.stringify(parsed));
    }
  } catch(e) {}
  const fallback = DEFAULTS[key] ? JSON.parse(JSON.stringify(DEFAULTS[key])) : null;
  _dataCache[key] = fallback;
  _dataDirty.delete(key);
  return fallback ? JSON.parse(JSON.stringify(fallback)) : null;
}

function setData(key, val) {
  // CSRF write-token check: on admin pages, if a session IS active (user logged in)
  // but the write token is missing, it means something bypassed startAdminSession()
  // — likely an XSS-injected script. Block the write.
  // Note: Before login (no session), writes are allowed for defaults/initialization.
  if (_isAdminPage()) {
    const hasSession = sessionStorage.getItem('er_admin_auth') === '1';
    const hasToken = !!sessionStorage.getItem('er_write_token');
    if (hasSession && !hasToken) {
      if (typeof erSec !== 'undefined') erSec.log('error', 'setData blocked: missing write token', { key: key });
      return;
    }
  }
  localStorage.setItem('examready_' + key, JSON.stringify(val));
  _dataCache[key] = val;
  _dataDirty.delete(key);
}

function _isAdminPage() {
  return window.location.pathname.includes('admin');
}

// Invalidate cache for a key (for external writers that bypass setData)
function invalidateDataCache(key) {
  if (key) { _dataDirty.add(key); delete _dataCache[key]; }
  else { Object.keys(_dataCache).forEach(k => { _dataDirty.add(k); delete _dataCache[k]; }); }
}

function genId() {
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

// ===== SUBJECTS MAP =====
const DEFAULT_SUBJECTS_MAP = {
  "9": [
    { key:"english", label:"English", icon:"📖", stream:"Core Subjects" },
    { key:"hindi", label:"Hindi", icon:"🔤", stream:"Core Subjects" },
    { key:"math", label:"Mathematics", icon:"📐", stream:"Core Subjects" },
    { key:"science", label:"Science", icon:"🔬", stream:"Core Subjects" },
    { key:"sst", label:"Social Studies", icon:"🌍", stream:"Core Subjects" },
    { key:"sanskrit", label:"Sanskrit", icon:"🪔", stream:"Core Subjects" },
    { key:"cs", label:"Computer Science", icon:"💻", stream:"Skill Subjects" }
  ],
  "10": [
    { key:"english", label:"English", icon:"📖", stream:"Core Subjects" },
    { key:"hindi", label:"Hindi", icon:"🔤", stream:"Core Subjects" },
    { key:"math", label:"Mathematics", icon:"📐", stream:"Core Subjects" },
    { key:"science", label:"Science", icon:"🔬", stream:"Core Subjects" },
    { key:"sst", label:"Social Studies", icon:"🌍", stream:"Core Subjects" },
    { key:"sanskrit", label:"Sanskrit", icon:"🪔", stream:"Core Subjects" },
    { key:"cs", label:"Computer Science", icon:"💻", stream:"Skill Subjects" }
  ],
  "11": [
    { key:"english", label:"English", icon:"📖", stream:"Common Core" },
    { key:"physical-education", label:"Physical Education", icon:"🏃", stream:"General Electives" },
    { key:"physics", label:"Physics", icon:"⚡", stream:"Science" },
    { key:"chemistry", label:"Chemistry", icon:"🧪", stream:"Science" },
    { key:"math", label:"Mathematics", icon:"📐", stream:"Science" },
    { key:"biology", label:"Biology", icon:"🧬", stream:"Science" },
    { key:"cs", label:"Computer Science", icon:"💻", stream:"Science" },
    { key:"informatics-practices", label:"Informatics Practices", icon:"🖥️", stream:"Science" },
    { key:"accountancy", label:"Accountancy", icon:"📒", stream:"Commerce" },
    { key:"business-studies", label:"Business Studies", icon:"💼", stream:"Commerce" },
    { key:"economics", label:"Economics", icon:"📈", stream:"Commerce" },
    { key:"entrepreneurship", label:"Entrepreneurship", icon:"🚀", stream:"Commerce" },
    { key:"applied-math", label:"Applied Mathematics", icon:"📏", stream:"Commerce" },
    { key:"history", label:"History", icon:"🏛️", stream:"Humanities" },
    { key:"political-science", label:"Political Science", icon:"🏛", stream:"Humanities" },
    { key:"geography", label:"Geography", icon:"🗺️", stream:"Humanities" },
    { key:"sociology", label:"Sociology", icon:"👥", stream:"Humanities" },
    { key:"psychology", label:"Psychology", icon:"🧠", stream:"Humanities" },
    { key:"home-science", label:"Home Science", icon:"🏠", stream:"Humanities" }
  ],
  "12": [
    { key:"english", label:"English", icon:"📖", stream:"Common Core" },
    { key:"physical-education", label:"Physical Education", icon:"🏃", stream:"General Electives" },
    { key:"physics", label:"Physics", icon:"⚡", stream:"Science" },
    { key:"chemistry", label:"Chemistry", icon:"🧪", stream:"Science" },
    { key:"math", label:"Mathematics", icon:"📐", stream:"Science" },
    { key:"biology", label:"Biology", icon:"🧬", stream:"Science" },
    { key:"cs", label:"Computer Science", icon:"💻", stream:"Science" },
    { key:"informatics-practices", label:"Informatics Practices", icon:"🖥️", stream:"Science" },
    { key:"accountancy", label:"Accountancy", icon:"📒", stream:"Commerce" },
    { key:"business-studies", label:"Business Studies", icon:"💼", stream:"Commerce" },
    { key:"economics", label:"Economics", icon:"📈", stream:"Commerce" },
    { key:"entrepreneurship", label:"Entrepreneurship", icon:"🚀", stream:"Commerce" },
    { key:"applied-math", label:"Applied Mathematics", icon:"📏", stream:"Commerce" },
    { key:"history", label:"History", icon:"🏛️", stream:"Humanities" },
    { key:"political-science", label:"Political Science", icon:"🏛", stream:"Humanities" },
    { key:"geography", label:"Geography", icon:"🗺️", stream:"Humanities" },
    { key:"sociology", label:"Sociology", icon:"👥", stream:"Humanities" },
    { key:"psychology", label:"Psychology", icon:"🧠", stream:"Humanities" },
    { key:"home-science", label:"Home Science", icon:"🏠", stream:"Humanities" }
  ]
};

function getDefaultSubjectsMap() {
  return JSON.parse(JSON.stringify(DEFAULT_SUBJECTS_MAP));
}

function mergeSubjectsMap(customMap) {
  if (!customMap || typeof customMap !== 'object' || Array.isArray(customMap)) {
    return getDefaultSubjectsMap();
  }
  const defaults = getDefaultSubjectsMap();
  const merged = {};
  const allClasses = new Set([...Object.keys(defaults), ...Object.keys(customMap)]);
  allClasses.forEach(cls => {
    const defaultList = defaults[cls] || [];
    const customList = customMap[cls];
    if (Array.isArray(customList) && customList.length > 0) {
      const defaultByKey = new Map(defaultList.map(s => [s.key, s]));
      merged[cls] = customList.map(subject => ({
        ...(defaultByKey.get(subject.key) || {}),
        ...subject
      }));
    } else {
      merged[cls] = defaultList.slice();
    }
  });
  return merged;
}

let _subjectsMapCache = null;
let _subjectsMapRaw = null; // track raw string to detect external changes

function getSubjectsMap() {
  try {
    const raw = localStorage.getItem('er_subjects_map');
    // Return cache if raw hasn't changed
    if (_subjectsMapCache && raw === _subjectsMapRaw) {
      return JSON.parse(JSON.stringify(_subjectsMapCache));
    }
    _subjectsMapRaw = raw;
    if (!raw) { _subjectsMapCache = getDefaultSubjectsMap(); return JSON.parse(JSON.stringify(_subjectsMapCache)); }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      _subjectsMapCache = getDefaultSubjectsMap(); return JSON.parse(JSON.stringify(_subjectsMapCache));
    }
    const merged = mergeSubjectsMap(parsed);
    const defaults = getDefaultSubjectsMap();
    ['9', '10', '11', '12'].forEach(cls => {
      if (!Array.isArray(merged[cls]) || merged[cls].length === 0) {
        merged[cls] = defaults[cls] || [];
      }
    });
    _subjectsMapCache = merged;
    return JSON.parse(JSON.stringify(merged));
  } catch(e) {
    _subjectsMapCache = getDefaultSubjectsMap();
    return JSON.parse(JSON.stringify(_subjectsMapCache));
  }
}

// Call this after saveSubjectsMap to invalidate the cache
function invalidateSubjectsMapCache() { _subjectsMapCache = null; _subjectsMapRaw = null; }

function getSubjectLabel(cls, key) {
  const map = getSubjectsMap();
  const subjects = map[cls] || [];
  const found = subjects.find(s => s.key === key);
  if (found) return found.label;
  return String(key || '').split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function getClassMeta(cls) {
  const meta = {
    "9":  { label:"Class 9",  icon:"📗" },
    "10": { label:"Class 10", icon:"📘" },
    "11": { label:"Class 11", icon:"📙" },
    "12": { label:"Class 12", icon:"📕" }
  };
  return meta[cls] || { label:`Class ${cls}`, icon:"📚" };
}

function getSubjectMeta(cls, key) {
  const subjects = getSubjectsMap()[cls] || [];
  return subjects.find(s => s.key === key) || {
    key,
    label: getSubjectLabel(cls, key),
    icon: "📘",
    stream: "Subjects"
  };
}

function buildSubjectPageUrl(cls, subjectKey) {
  return `subject.html?class=${encodeURIComponent(cls)}&subject=${encodeURIComponent(subjectKey)}`;
}

function getResourceItems(cls, subjectKey, typeKey) {
  const allPdfs = getData('pdfs') || {};
  return allPdfs[`${cls}-${subjectKey}-${typeKey}`] || [];
}

function getClassCatalog() {
  return ["9","10","11","12"].map(cls => ({
    cls,
    label: getClassMeta(cls).label,
    icon:  getClassMeta(cls).icon,
    subjects: getSubjectsMap()[cls] || []
  }));
}

function getAllQuizEntries() {
  const quizzes = getData('quizzes') || {};
  const all = [];
  Object.entries(quizzes).forEach(([key, list]) => {
    const parts = key.split('-');
    const cls = parts[0];
    const subjectKey = parts.slice(1).join('-');
    (list || []).forEach(quiz => {
      all.push({ ...quiz, classNum: cls, subjectKey, subjectLabel: getSubjectLabel(cls, subjectKey) });
    });
  });
  return all;
}

const SAFE_LOCAL_FILE_RE = /^[A-Za-z0-9._ -]+$/;
const SAFE_COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const SAFE_DATA_IMAGE_RE = /^data:image\/(?:png|jpe?g|webp|gif|bmp|x-icon|vnd\.microsoft\.icon);base64,[a-z0-9+/=\s]+$/i;
const SAFE_DATA_FILE_RE = /^data:(?:application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document);base64,[a-z0-9+/=\s]+$/i;

function sanitizeStoredFileName(name) {
  const value = String(name || '').trim();
  return SAFE_LOCAL_FILE_RE.test(value) ? value : '';
}

function isSafeRelativeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return false;
  if (/^\/\//.test(raw)) return false;
  if (/[\u0000-\u001F\u007F<>"'`\\\s]/.test(raw)) return false;
  return true;
}

function sanitizeUrlValue(rawValue, options = {}) {
  const {
    fallback = '#',
    allowRelative = true,
    allowHash = true,
    allowHttp = true,
    allowMailto = false,
    allowTel = false,
    allowLocalToken = false,
    allowImageData = false,
    allowFileData = false,
    allowBlob = false
  } = options;

  const value = String(rawValue ?? '').trim();
  if (!value) return fallback;
  if (/[\u0000-\u001F\u007F]/.test(value)) return fallback;

  if (allowLocalToken && value.startsWith('local:')) {
    return sanitizeStoredFileName(value.slice(6)) ? value : fallback;
  }
  if (allowImageData && SAFE_DATA_IMAGE_RE.test(value)) return value;
  if (allowFileData && SAFE_DATA_FILE_RE.test(value)) return value;
  if (allowHash && value.startsWith('#')) return value;
  if (allowRelative && isSafeRelativeUrl(value)) return value;
  if (/^\/\//.test(value)) return fallback;

  try {
    const parsed = new URL(value, window.location.href);
    const protocol = parsed.protocol.toLowerCase();
    if (allowHttp && (protocol === 'http:' || protocol === 'https:')) return parsed.href;
    if (allowMailto && protocol === 'mailto:') return value;
    if (allowTel && protocol === 'tel:') return value;
    if (allowBlob && protocol === 'blob:') return parsed.href;
  } catch(e) {}

  return fallback;
}

function sanitizeNavigationUrl(value, fallback = '') {
  return sanitizeUrlValue(value, {
    fallback,
    allowRelative: true,
    allowHash: false,
    allowHttp: true
  });
}

function sanitizeAnnouncementUrl(value, fallback = '') {
  return sanitizeUrlValue(value, {
    fallback,
    allowRelative: true,
    allowHash: false,
    allowHttp: true,
    allowMailto: true,
    allowTel: true
  });
}

function sanitizeResourceUrl(value, fallback = '#') {
  return sanitizeUrlValue(value, {
    fallback,
    allowRelative: true,
    allowHash: false,
    allowHttp: true,
    allowLocalToken: true,
    allowFileData: true,
    allowBlob: true
  });
}

function sanitizeImageAssetUrl(value, fallback = 'logo.png') {
  return sanitizeUrlValue(value, {
    fallback,
    allowRelative: true,
    allowHash: false,
    allowHttp: true,
    allowImageData: true,
    allowBlob: true
  });
}

function sanitizeCssColor(value, fallback = '#e8211a') {
  const raw = String(value || '').trim();
  return SAFE_COLOR_RE.test(raw) ? raw : fallback;
}

function findQuizById(quizId) {
  if (!quizId) return null;
  return getAllQuizEntries().find(q => q.id === quizId) || null;
}

function getResolvedFileUrl(url) {
  if (!url) return '#';
  if (url.startsWith('local:')) {
    const fileName = sanitizeStoredFileName(url.slice(6));
    if (!fileName) return '#';
    return sanitizeResourceUrl(localStorage.getItem('er_file_' + fileName) || '#');
  }
  return sanitizeResourceUrl(url);
}

function getPreviewEmbedUrl(url) {
  const resolved = getResolvedFileUrl(url);
  if (!resolved || resolved === '#') return '#';
  if (resolved.startsWith('data:')) return resolved;
  const driveFileMatch = resolved.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveFileMatch) return `https://drive.google.com/file/d/${driveFileMatch[1]}/preview`;
  const driveOpenMatch = resolved.match(/[?&]id=([^&]+)/);
  if (resolved.includes('drive.google.com') && driveOpenMatch) {
    return `https://drive.google.com/file/d/${driveOpenMatch[1]}/preview`;
  }
  return resolved;
}

function buildPdfPreviewUrl(itemOrUrl, title) {
  const rawUrl   = typeof itemOrUrl === 'string' ? itemOrUrl : (itemOrUrl?.url || '#');
  const rawTitle = title || itemOrUrl?.name || 'PDF Preview';
  const safeUrl = sanitizeResourceUrl(rawUrl, '');
  if (!safeUrl) return '#';
  return `pdf-viewer.html?title=${encodeURIComponent(rawTitle)}&url=${encodeURIComponent(safeUrl)}`;
}

function addFooterLegalLinks() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  if (['privacy.html', 'terms.html', 'disclaimer.html'].includes(currentPage)) return;

  const footerLinks = document.querySelector('.footer-links');
  if (!footerLinks) return;

  const allH4s = footerLinks.querySelectorAll('.footer-col h4');
  const hasLegal = Array.from(allH4s).some(h => /legal/i.test(h.textContent));
  if (!hasLegal) {
    const legalCol = document.createElement('div');
    legalCol.className = 'footer-col';
    legalCol.setAttribute('data-legal-links', 'true');
    legalCol.innerHTML = `
      <h4>Legal</h4>
      <a href="privacy.html">Privacy Policy</a>
      <a href="terms.html">Terms &amp; Conditions</a>
      <a href="disclaimer.html">Disclaimer</a>
    `;
    footerLinks.appendChild(legalCol);
  }

  const footerBottom = document.querySelector('.footer-bottom');
  if (footerBottom && !footerBottom.querySelector('[data-social-icons="true"]')) {
    const socialDiv = document.createElement('div');
    socialDiv.setAttribute('data-social-icons', 'true');
    socialDiv.style.cssText = 'display:flex;align-items:center;gap:12px;';
    socialDiv.innerHTML = `
      <a href="https://www.instagram.com/examready.co/" target="_blank" rel="noopener noreferrer" title="Follow us on Instagram"
        style="display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045);color:#fff;text-decoration:none;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
      </a>
      <a href="https://www.youtube.com/@EXAMREADY_STUDY" target="_blank" rel="noopener noreferrer" title="Subscribe on YouTube"
        style="display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:10px;background:#ff0000;color:#fff;text-decoration:none;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
      </a>
    `;
    footerBottom.appendChild(socialDiv);
  }
}

function applyFooterBranding() {
  const footerBrandLogo = sanitizeImageAssetUrl(localStorage.getItem('er_footer_brand_logo') || 'footer-brand-logo.png', 'footer-brand-logo.png');
  document.querySelectorAll('.footer-brand').forEach(brand => {
    let brandMark = brand.querySelector('.footer-brand-mark');
    if (!brandMark) {
      const firstBlock = brand.firstElementChild;
      if (firstBlock && firstBlock.tagName !== 'P') firstBlock.remove();
      brandMark = document.createElement('div');
      brandMark.className = 'footer-brand-mark';
      brandMark.style.marginBottom = '14px';
      brand.insertBefore(brandMark, brand.firstChild);
    }
    brandMark.textContent = '';
    const img = document.createElement('img');
    img.src = footerBrandLogo;
    img.alt = 'ExamReady';
    img.style.cssText = 'display:block;width:min(100%, 260px);height:auto;object-fit:contain;';
    brandMark.appendChild(img);
  });
}

function initResponsiveNav() {
  const header = document.querySelector('header');
  const nav = document.getElementById('mainNav');
  const toggle = document.querySelector('.hamburger');
  if (!header || !nav || !toggle) return;

  if (!document.getElementById('sharedNavStyles')) {
    const style = document.createElement('style');
    style.id = 'sharedNavStyles';
    style.textContent = `
      header {
        position: fixed !important;
        top: 0;
        left: 0;
        right: 0;
        width: 100%;
        z-index: 1400;
      }
      @media (min-width: 769px) {
        #mainNav {
          display: flex !important;
          flex-wrap: nowrap;
          margin-left: auto;
          overflow-x: auto;
          overflow-y: hidden;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        #mainNav::-webkit-scrollbar { display: none; }
      }
      @media (max-width: 768px) {
        header { overflow: visible !important; }
        #mainNav {
          display: none !important;
        }
        #mainNav.nav-open {
          display: flex !important;
          flex-direction: column;
          gap: 10px;
          position: absolute;
          top: calc(100% + 8px);
          left: 12px;
          right: 12px;
          padding: 14px;
          border-radius: 18px;
          background: rgba(13, 13, 13, 0.98);
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 20px 48px rgba(0,0,0,0.45);
          z-index: 999;
        }
        #mainNav.nav-open a {
          width: 100%;
          justify-content: flex-start;
        }
      }
    `;
    document.head.appendChild(style);
  }

  const syncHeaderOffset = () => {
    document.body.style.paddingTop = `${header.offsetHeight}px`;
  };

  const closeNav = () => {
    nav.classList.remove('nav-open');
    nav.dataset.open = '0';
  };

  const openNav = () => {
    nav.classList.add('nav-open');
    nav.dataset.open = '1';
  };

  window.toggleMenu = function toggleMenuShared() {
    if (window.innerWidth > 768) return;
    if (nav.classList.contains('nav-open')) closeNav();
    else openNav();
  };

  toggle.removeAttribute('onclick');
  toggle.onclick = window.toggleMenu;
  toggle.onkeydown = event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      window.toggleMenu();
    }
  };

  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeNav);
  });

  document.addEventListener('click', event => {
    if (window.innerWidth > 768) return;
    if (!nav.classList.contains('nav-open')) return;
    if (header.contains(event.target)) return;
    closeNav();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeNav();
    syncHeaderOffset();
  });

  window.addEventListener('load', syncHeaderOffset);
  syncHeaderOffset();
  closeNav();
}

// ===== SITE CONFIG =====
function getSiteConfig() {
  try {
    const raw = JSON.parse(localStorage.getItem('er_site_config') || '{}') || {};
    return {
      ...raw,
      siteName: String(raw.siteName || '').trim().slice(0, 80),
      siteTagline: String(raw.siteTagline || '').trim().slice(0, 240),
      colorAccent: sanitizeCssColor(raw.colorAccent, '#e8211a'),
      colorBg: sanitizeCssColor(raw.colorBg, '#0d0d0d'),
      heroBtnUrl: sanitizeAnnouncementUrl(raw.heroBtnUrl || '', '')
    };
  } catch(e) { return {}; }
}

// ===== ANNOUNCEMENT =====
function getAnnouncement() {
  try {
    const raw = JSON.parse(localStorage.getItem('er_announcement') || 'null');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    return {
      text: String(raw.text || '').trim().slice(0, 240),
      color: sanitizeCssColor(raw.color, '#e8211a'),
      enabled: raw.enabled !== false,
      link: sanitizeAnnouncementUrl(raw.link || '', '')
    };
  } catch(e) { return null; }
}

// ===== FEATURES =====
function getFeatures() {
  try { return JSON.parse(localStorage.getItem('er_features') || '{}'); } catch(e) { return {}; }
}

function isFeatureEnabled(key) {
  return getFeatures()[key] !== false;
}

// ===== NAV =====
const DEFAULT_NAV_ITEMS = [
  { label: 'Home',           url: 'index.html' },
  { label: 'Class 9',        url: 'class9.html' },
  { label: 'Class 10',       url: 'class10.html' },
  { label: 'Class 11',       url: 'class11.html' },
  { label: 'Class 12',       url: 'class12.html' },
  { label: 'Solutions',      url: 'solutions.html' },
  { label: 'Notes',          url: 'notes.html' },
  { label: 'PYQs',           url: 'pyq.html' },
  { label: 'Question Banks', url: 'questionbank.html' },
  { label: 'Quizzes',        url: 'quizzes.html' }
];

const SHARED_FOOTER_LINKS = {
  classes: [
    { label: 'Class 9',  url: 'class9.html' },
    { label: 'Class 10', url: 'class10.html' },
    { label: 'Class 11', url: 'class11.html' },
    { label: 'Class 12', url: 'class12.html' }
  ],
  resources: [
    { label: 'Solutions',      url: 'solutions.html' },
    { label: 'Short Notes',    url: 'notes.html' },
    { label: 'PYQ Papers',     url: 'pyq.html' },
    { label: 'Question Banks', url: 'questionbank.html' },
    { label: 'Quizzes',        url: 'quizzes.html' }
  ],
  legal: [
    { label: 'Privacy Policy',     url: 'privacy.html' },
    { label: 'Terms & Conditions', url: 'terms.html' },
    { label: 'Disclaimer',         url: 'disclaimer.html' }
  ]
};

function getCurrentPageName() {
  return window.location.pathname.split('/').pop() || 'index.html';
}

function getDefaultNavItems() {
  return DEFAULT_NAV_ITEMS.map(item => ({ ...item }));
}

function normalizeNavItems(items) {
  if (!Array.isArray(items)) return getDefaultNavItems();
  const normalized = items
    .map(item => ({
      label: String(item?.label || '').replace(/\s+/g, ' ').trim().slice(0, 60),
      url: sanitizeNavigationUrl(item?.url || '', '')
    }))
    .filter(item => item.label && item.url);
  return normalized.length ? normalized : getDefaultNavItems();
}

function resolveCurrentNavTarget() {
  const current = getCurrentPageName();
  const params = new URLSearchParams(window.location.search);
  const aliases = {
    'note-post.html': 'notes.html',
    'quiz.html': 'quizzes.html',
    'solution-post.html': 'solutions.html'
  };

  if (aliases[current]) return aliases[current];

  if (current === 'subject.html' || current === 'chapter.html') {
    const cls = params.get('class');
    if (['9', '10', '11', '12'].includes(cls)) return `class${cls}.html`;
  }

  if (current === 'pdf-viewer.html') {
    try {
      if (document.referrer) {
        const refUrl = new URL(document.referrer);
        if (refUrl.origin === window.location.origin) {
          const refPage = refUrl.pathname.split('/').pop() || '';
          if (aliases[refPage]) return aliases[refPage];
          if (refPage === 'subject.html' || refPage === 'chapter.html') {
            const refCls = refUrl.searchParams.get('class');
            if (['9', '10', '11', '12'].includes(refCls)) return `class${refCls}.html`;
          }
          return refPage;
        }
      }
    } catch(e) {}
  }

  return current;
}

function getNavItems() {
  try {
    const raw = localStorage.getItem('er_nav');
    return raw ? normalizeNavItems(JSON.parse(raw)) : getDefaultNavItems();
  } catch(e) { return getDefaultNavItems(); }
}

function buildSharedHeaderMarkup() {
  const logo = sanitizeImageAssetUrl(localStorage.getItem('er_logo') || 'logo.png', 'logo.png');
  const navItems = getNavItems();
  const activeUrl = resolveCurrentNavTarget();
  const navHtml = navItems.map(item => {
    const isActive = item.url === activeUrl;
    return `<a href="${escapeHtml(item.url)}"${isActive ? ' class="active"' : ''}>${escapeHtml(item.label)}</a>`;
  }).join('');

  return `
    <a class="logo-wrap" href="index.html">
      <img src="${escapeHtml(logo)}" alt="ExamReady" class="logo-img" style="height:44px;">
    </a>
    <nav id="mainNav">
      ${navHtml}
    </nav>
    <div class="hamburger" onclick="toggleMenu()" role="button" tabindex="0" aria-label="Open navigation menu">
      <span></span><span></span><span></span>
    </div>
  `;
}

function buildFooterLinks(items) {
  return items.map(item => {
    const safeUrl = sanitizeNavigationUrl(item.url, '#');
    return `<a href="${escapeHtml(safeUrl)}">${escapeHtml(item.label)}</a>`;
  }).join('');
}

function buildSharedFooterMarkup() {
  const config = getSiteConfig();
  const siteName = escapeHtml((config.siteName || 'ExamReady').trim() || 'ExamReady');
  const siteTagline = escapeHtml(
    (config.siteTagline || 'Free study resources for CBSE students in Class 9 to 12. Notes, PYQs, question banks, quizzes, and solutions - all free.').trim()
  );
  const year = new Date().getFullYear();

  return `
    <div class="footer-inner">
      <div class="footer-top">
        <div class="footer-brand">
          <div class="footer-brand-mark"></div>
          <p>${siteTagline}</p>
        </div>
        <div class="footer-links">
          <div class="footer-col">
            <h4>Classes</h4>
            ${buildFooterLinks(SHARED_FOOTER_LINKS.classes)}
          </div>
          <div class="footer-col">
            <h4>Resources</h4>
            ${buildFooterLinks(SHARED_FOOTER_LINKS.resources)}
          </div>
          <div class="footer-col" data-legal-links="true">
            <h4>Legal</h4>
            ${buildFooterLinks(SHARED_FOOTER_LINKS.legal)}
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; ${year} ${siteName}. Made with <span>&hearts;</span> for students.</p>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <p>CBSE Resources for Class 9-12</p>
          <div data-social-icons="true" style="display:flex;align-items:center;gap:12px;">
            <a href="https://www.instagram.com/examready.co/" target="_blank" rel="noopener noreferrer" title="Follow us on Instagram"
              style="display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045);color:#fff;text-decoration:none;">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </a>
            <a href="https://www.youtube.com/@EXAMREADY_STUDY" target="_blank" rel="noopener noreferrer" title="Subscribe on YouTube"
              style="display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:10px;background:#ff0000;color:#fff;text-decoration:none;">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

function syncSharedSiteChrome() {
  const header = document.querySelector('header');
  if (header && !header.hasAttribute('data-er-shared-header')) {
    header.innerHTML = buildSharedHeaderMarkup();
    header.setAttribute('data-er-shared-header', 'true');
  }

  if (getCurrentPageName() === 'pdf-viewer.html') return;

  let footer = document.querySelector('footer');
  if (!footer) {
    footer = document.createElement('footer');
    document.body.appendChild(footer);
  }
  if (!footer.hasAttribute('data-er-shared-footer')) {
    footer.innerHTML = buildSharedFooterMarkup();
    footer.setAttribute('data-er-shared-footer', 'true');
  }
}

// ===== APPLY SITE CONFIG TO PAGE =====
function applySiteConfig() {
  const config = getSiteConfig();

  if (config.colorAccent) document.documentElement.style.setProperty('--red', config.colorAccent);
  if (config.colorBg)    document.documentElement.style.setProperty('--black', config.colorBg);

  const logo = sanitizeImageAssetUrl(localStorage.getItem('er_logo') || '', '');
  if (logo) {
    document.querySelectorAll('img[alt="ExamReady"], img.logo-img').forEach(img => { img.src = logo; });
  }

  const navItems = getNavItems();
  if (navItems && Array.isArray(navItems)) {
    const nav = document.getElementById('mainNav');
    if (nav) {
      const current = resolveCurrentNavTarget();
      nav.innerHTML = navItems.map(item => {
        const isActive = item.url === current;
        return `<a href="${escapeHtml(item.url)}"${isActive ? ' class="active"' : ''}>${escapeHtml(item.label)}</a>`;
      }).join('');
    }
  }

  const ann = getAnnouncement();
  if (ann && ann.enabled && ann.text) {
    const bar = document.createElement('div');
    bar.id = 'siteAnnouncement';
    bar.style.background = ann.color || '#e8211a';
    bar.style.color = '#fff';
    bar.style.fontFamily = "'Nunito',sans-serif";
    bar.style.fontWeight = '700';
    bar.style.fontSize = '13px';
    bar.style.display = 'flex';
    bar.style.alignItems = 'center';
    bar.style.overflow = 'hidden';
    bar.style.position = 'relative';
    bar.style.zIndex = '999';
    bar.style.padding = '10px 0';

    if (!document.getElementById('er-ticker-style')) {
      const style = document.createElement('style');
      style.id = 'er-ticker-style';
      style.textContent = `
        @keyframes er-ticker {
          0%   { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
      `;
      document.head.appendChild(style);
    }

    const tickerWrap = document.createElement('div');
    tickerWrap.style.cssText = 'flex:1;overflow:hidden;position:relative;';

    const textNode = document.createTextNode(ann.text);

    let inner;
    if (ann.link) {
      inner = document.createElement('a');
      inner.href = ann.link;
      inner.rel = 'noopener noreferrer';
      inner.style.cssText = 'color:#fff;text-decoration:none;';
    } else {
      inner = document.createElement('span');
    }
    inner.style.cssText += `
      display: inline-block;
      white-space: nowrap;
      animation: er-ticker 22s linear infinite;
      padding-right: 80px;
    `;
    inner.appendChild(textNode);
    tickerWrap.appendChild(inner);
    bar.appendChild(tickerWrap);

    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'background:none;border:none;color:#fff;font-size:18px;cursor:pointer;opacity:.8;flex-shrink:0';
    closeBtn.textContent = '×';
    closeBtn.onclick = () => bar.remove();
    bar.appendChild(closeBtn);

    const header = document.querySelector('header');
    if (header) header.insertAdjacentElement('afterend', bar);
    else document.body.insertBefore(bar, document.body.firstChild);
  }
}

function collectHardeningTargets(root, selector) {
  const nodes = [];
  if (!root) return nodes;
  if (root.nodeType === 1 && typeof root.matches === 'function' && root.matches(selector)) {
    nodes.push(root);
  }
  if (typeof root.querySelectorAll === 'function') {
    root.querySelectorAll(selector).forEach(node => nodes.push(node));
  }
  return nodes;
}

function applySecurityHardening(root = document) {
  const scope = root.nodeType === 9 ? (root.documentElement || root.body || root) : root;
  if (!scope) return;

  collectHardeningTargets(scope, 'a[target="_blank"]').forEach(link => {
    link.rel = 'noopener noreferrer';
    link.referrerPolicy = 'strict-origin-when-cross-origin';
  });

  collectHardeningTargets(scope, 'a[href]').forEach(link => {
    const rawHref = link.getAttribute('href') || '';
    const safeHref = sanitizeUrlValue(rawHref, {
      fallback: '#',
      allowRelative: true,
      allowHash: true,
      allowHttp: true,
      allowMailto: true,
      allowTel: true,
      allowFileData: link.hasAttribute('download')
    });
    if (safeHref !== rawHref) {
      link.setAttribute('href', safeHref || '#');
    }
  });

  collectHardeningTargets(scope, 'iframe').forEach(frame => {
    if (!frame.getAttribute('referrerpolicy')) {
      frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    }
    if (!frame.getAttribute('loading')) {
      frame.setAttribute('loading', 'lazy');
    }
  });
}

let erSecurityObserverStarted = false;
function initSecurityHardeningObserver() {
  if (erSecurityObserverStarted || typeof MutationObserver === 'undefined' || !document.documentElement) return;
  erSecurityObserverStarted = true;
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) applySecurityHardening(node);
      });
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

// ===== SOLUTION POSTS =====
const DEFAULT_SOLUTION_POSTS = [
  {
    id: 'solpost_1',
    title: 'Class 9 Mathematics: Number Systems Solutions',
    classNum: '9', subjectKey: 'math',
    summary: 'Step-by-step worked answers for important Number Systems questions with easy exam-ready language.',
    content: `1. Rational numbers can be written in p/q form where q is not zero.

2. Irrational numbers cannot be expressed in simple p/q form. Examples include sqrt(2) and pi.

3. To compare irrational numbers in exams, first convert them into approximate decimal values and then arrange them carefully.

- Revise the definitions once.
- Write every step clearly.
- Avoid skipping simplification in board-style answers.`,
    author: 'ExamReady Team', updatedAt: '2026-04-03'
  },
  {
    id: 'solpost_2',
    title: 'Class 10 Science: Chemical Reactions and Equations Solutions',
    classNum: '10', subjectKey: 'science',
    summary: 'Balanced equations, explanation points, and answer-writing format for common textbook exercises.',
    content: `1. A chemical reaction is identified through change in color, temperature, state, or formation of a new substance.

2. While writing a balanced equation, make the number of atoms equal on both sides without changing the chemical formula.

3. For CBSE-style answers, mention the observation first and then write the balanced reaction.

- Use symbols only after naming the reactants.
- Underline key terms in long answers.
- Mention oxidation and reduction separately when asked.`,
    author: 'ExamReady Team', updatedAt: '2026-04-03'
  },
  {
    id: 'solpost_3',
    title: 'Class 11 History: Writing and City Life Solutions',
    classNum: '11', subjectKey: 'history',
    summary: 'Short and long answer support for Mesopotamian civilization topics under Humanities.',
    content: `1. Mesopotamian cities grew due to trade, irrigation, and organized administration.

2. Writing helped rulers and traders maintain accounts, records, and legal communication.

3. In descriptive answers, connect city growth with agriculture, surplus, and social organization for better marks.`,
    author: 'ExamReady Team', updatedAt: '2026-04-03'
  },
  {
    id: 'solpost_4',
    title: 'Class 12 Accountancy: Partnership Fundamentals Solutions',
    classNum: '12', subjectKey: 'accountancy',
    summary: 'Clean journal formats, adjustments, and explanation notes for partnership basics.',
    content: `1. A partnership firm is created through an agreement between two or more persons carrying on business together.

2. The partnership deed should clearly define profit-sharing ratio, salary, interest on capital, and drawings.

3. In numerical questions, write the format first and then pass journal entries in proper sequence.`,
    author: 'ExamReady Team', updatedAt: '2026-04-03'
  }
];

function getAllSolutionPosts() {
  const stored = getData('solution_posts');
  const posts = Array.isArray(stored) ? stored : DEFAULT_SOLUTION_POSTS;
  return JSON.parse(JSON.stringify(posts)).sort((a, b) =>
    new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
  );
}

function saveAllSolutionPosts(posts) {
  setData('solution_posts', Array.isArray(posts) ? posts : []);
}

function getSolutionPostsByClassAndSubject(cls, subjectKey) {
  return getAllSolutionPosts().filter(p => p.classNum === cls && p.subjectKey === subjectKey);
}

function findSolutionPostById(postId) {
  if (!postId) return null;
  return getAllSolutionPosts().find(p => p.id === postId) || null;
}

function getSolutionPostUrl(postOrId) {
  const id = typeof postOrId === 'string' ? postOrId : postOrId?.id;
  return `solution-post.html?id=${encodeURIComponent(id || '')}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getSolutionExcerpt(post, maxLength = 160) {
  const raw = (post?.summary || post?.content || '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  return raw.length > maxLength ? raw.slice(0, maxLength - 1) + '...' : raw;
}

function formatHumanDate(value) {
  if (!value) return 'Recently updated';
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return 'Recently updated';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch(e) { return 'Recently updated'; }
}

function formatSolutionContent(content) {
  const normalized = String(content || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return '<p>Content will be added soon.</p>';
  return normalized.split(/\n\s*\n/).map(block => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return '';
    if (lines.every(l => l.startsWith('- '))) {
      return `<ul>${lines.map(l => `<li>${escapeHtml(l.slice(2))}</li>`).join('')}</ul>`;
    }
    return `<p>${lines.map(l => escapeHtml(l)).join('<br>')}</p>`;
  }).join('');
}

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
  pdf_viewer:       { label:'PDF Viewer Banner',               enabled:true, adCode:'' },

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
    // ── Page override merge ──
    try {
      const page = (window.location.pathname.split('/').pop()) || 'index.html';
      const overrides = JSON.parse(localStorage.getItem('er_ad_slots_overrides') || '{}');
      const pageOvr = overrides[page] || {};
      Object.entries(pageOvr).forEach(([k, ovr]) => {
        if (merged[k]) merged[k] = { ...merged[k], ...ovr };
      });
    } catch(e) {}
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
  const slot = slots[key];
  if (!slot) return '';
  let code = (slot.adCode || '').trim();
  // ── A/B logic ──
  if (slot.abEnabled && (slot.adCodeB || '').trim()) {
    if (!sessionStorage.getItem('er_ab_group')) {
      sessionStorage.setItem('er_ab_group', Math.random() > 0.5 ? 'A' : 'B');
    }
    if (sessionStorage.getItem('er_ab_group') === 'B') code = (slot.adCodeB || '').trim();
  }
  return code;
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

function _hasManagedAdSlot(...keys) {
  return keys.some(key => !!document.querySelector(`[data-er-ad-slot="${key}"],[data-ad-slot="${key}"]`));
}

function _injectPdfViewerSlot(slots) {
  const key = 'pdf_viewer';
  if (!_slotEnabled(slots, key)) return;
  if (!_slotCode(slots, key)) return;
  if (_hasManagedAdSlot(key)) return;

  const viewer = document.getElementById('pdfViewerArea') || document.getElementById('fallbackWrap');
  if (!viewer) return;

  const wrap = _buildAdElement(slots, key, 'er-ad-shell er-ad-shell--pdf-viewer er-pdf-ad-slot');
  if (!wrap) return;
  wrap.style.cssText = 'max-width:1200px;margin:12px auto;padding:0 18px;width:100%;box-sizing:border-box;flex-shrink:0;';
  viewer.insertAdjacentElement('beforebegin', wrap);

  if (typeof window.resizeViewer === 'function') {
    setTimeout(() => window.resizeViewer(), 0);
  }
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
  if (currentPage === 'admin.html') return;
  if (document.body?.dataset?.erSmartAds === '1') return;
  document.body.dataset.erSmartAds = '1';

  const slots  = getAdSlots();
  const main   = document.querySelector('main');
  const footer = document.querySelector('footer');
  const hero   = document.querySelector('.page-hero, .hero');
  const isPdfViewer = currentPage === 'pdf-viewer.html';

  if (isPdfViewer) {
    _injectPdfViewerSlot(slots);
  }

  // 1. TOP BANNER — 'top' key (ads.js handles 'top_banner' independently)
  if (!isPdfViewer && !_hasManagedAdSlot('top', 'top_banner')) {
    const topEl = _buildAdElement(slots, 'top', 'er-ad-shell er-ad-shell--top');
    if (topEl) {
      if (hero?.parentNode) hero.insertAdjacentElement('afterend', topEl);
      else if (main) main.insertAdjacentElement('afterbegin', topEl);
    }
  }

  // 2. INLINE MID — 'inline' key (ads.js handles inline_1/2/3)
  if (!_hasManagedAdSlot('inline', 'inline_1', 'inline_2', 'inline_3')) {
    const inlineEl = _buildAdElement(slots, 'inline', 'er-ad-shell er-ad-shell--inline');
    if (inlineEl && main) {
      const kids = Array.from(main.children).filter(el => !el.dataset.erAdSlot && !el.matches('script,style'));
      const anchor = kids[Math.min(1, kids.length - 1)];
      if (anchor) anchor.insertAdjacentElement('beforebegin', inlineEl);
    }
  }

  // 3. BETWEEN SECTIONS — deferred so dynamic content has rendered
  setTimeout(() => _injectBetweenSections(slots), 200);

  // 4. PRE-FOOTER — 'footer' key (ads.js handles 'pre_footer')
  if (!isPdfViewer && !_hasManagedAdSlot('footer', 'pre_footer')) {
    const footerEl = _buildAdElement(slots, 'footer', 'er-ad-shell er-ad-shell--footer');
    if (footerEl && footer) footer.insertAdjacentElement('beforebegin', footerEl);
  }

  // 5. STICKY SIDEBAR — desktop only
  setTimeout(() => _injectStickySidebar(slots), 500);

  // 6. MOBILE STICKY BOTTOM
  _injectMobileBottom(slots);
}

// ── AdSense Auto-Ads global injection ──────────────────────────────────────
function injectAutoAdsScript() {
  try {
    if (localStorage.getItem('er_adsense_autoads_enabled') !== 'true') return;
    const code = (localStorage.getItem('er_adsense_autoads') || '').trim();
    if (!code) return;
    // Don't double-inject
    if (document.querySelector('script[data-er-autoads]')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = code;
    wrap.querySelectorAll('script').forEach(old => {
      const s = document.createElement('script');
      s.dataset.erAutoads = '1';
      if (window.erCspNonce) s.nonce = window.erCspNonce;
      Array.from(old.attributes).forEach(a => s.setAttribute(a.name, a.value));
      s.textContent = old.textContent;
      document.head.appendChild(s);
    });
    // Also inject any non-script elements (like <meta> tags)
    wrap.querySelectorAll(':not(script)').forEach(el => {
      el.dataset.erAutoads = '1';
      document.head.appendChild(el);
    });
  } catch(e) {}
}

// Auto-apply on DOMContentLoaded for all non-admin pages
if (typeof window !== 'undefined') {
  // Use requestIdleCallback where available, otherwise fallback to setTimeout
  const _defer = window.requestIdleCallback || function(cb) { setTimeout(cb, 1); };

  document.addEventListener('DOMContentLoaded', function() {
    // Security runs immediately — non-deferrable
    applySecurityHardening();
    initSecurityHardeningObserver();

    if (!window.location.pathname.includes('admin')) {
      // Wait for site-data.json hydration before rendering
      var hydrationDone = _erSiteDataReady || Promise.resolve();
      hydrationDone.then(function() {
        // Auto-ads injection runs early (injects into <head>)
        injectAutoAdsScript();

        // Chrome + ads deferred so page renders before they execute
        _defer(function() {
          syncSharedSiteChrome();
          applySiteConfig();
          initResponsiveNav();
          applyFooterBranding();
          addFooterLegalLinks();
        });

        // Ad injection deferred with lower priority
        _defer(function() {
          insertSmartAds();
          applySecurityHardening();
        });
      });
    }
  });
}

// ===== CHAPTERS =====
function getChapters(cls, subjectKey) {
  try {
    const all = JSON.parse(localStorage.getItem('er_chapters') || '{}');
    const list = all[`${cls}-${subjectKey}`] || [];
    return list.slice().sort((a, b) => (a.number || 0) - (b.number || 0));
  } catch(e) { return []; }
}

function saveChapters(cls, subjectKey, chapters) {
  try {
    const all = JSON.parse(localStorage.getItem('er_chapters') || '{}');
    all[`${cls}-${subjectKey}`] = chapters;
    localStorage.setItem('er_chapters', JSON.stringify(all));
  } catch(e) {}
}

function getAllChaptersData() {
  try { return JSON.parse(localStorage.getItem('er_chapters') || '{}'); }
  catch(e) { return {}; }
}

function getChapterLabel(cls, subjectKey, chapterId) {
  if (!chapterId) return 'Uncategorized';
  const ch = getChapters(cls, subjectKey).find(c => c.id === chapterId);
  return ch ? `Ch ${ch.number}: ${ch.name}` : 'Uncategorized';
}
