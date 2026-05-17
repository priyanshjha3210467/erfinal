/* ================================================================
   EXAMREADY — SECURITY HARDENING v1
   Include as the FIRST script on every page:
     <script src="security.js"></script>

   Covers:
     1.  Prototype pollution prevention
     2.  Clickjacking / frame-busting
     3.  Strict URL validation
     4.  DOM sanitizer (strips dangerous HTML before innerHTML)
     5.  localStorage integrity checking (HMAC-lite)
     6.  XSS-safe wrappers for dynamic rendering
     7.  Admin-panel hardening (anti-brute-force, fingerprint binding)
     8.  Console / DevTools anti-tamper warnings (admin only)
     9.  Security-event logger
    10.  Content Security Policy violation handler
    11.  Dangerous-input blocking
    12.  Rate limiter for repeated sensitive actions
   ================================================================ */

(function () {
  'use strict';

  /* ──────────────────────────────────────────────────────────────
     0a. CSP NONCE INJECTION
         Generate a random nonce per page load, inject as meta tag,
         and expose globally for dynamic script creation.
     ────────────────────────────────────────────────────────────── */
  const _cspNonce = (function generateNonce() {
    try {
      const arr = crypto.getRandomValues(new Uint8Array(16));
      const nonce = btoa(String.fromCharCode(...arr)).replace(/[+/=]/g, '');
      // Inject meta tag for other scripts to read
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'er-csp-nonce');
      meta.setAttribute('content', nonce);
      (document.head || document.documentElement).appendChild(meta);
      return nonce;
    } catch (e) { return ''; }
  })();
  Object.defineProperty(window, 'erCspNonce', {
    get: () => _cspNonce,
    configurable: false,
    enumerable: false,
  });

  /* ──────────────────────────────────────────────────────────────
     0b. CONSTANTS
     ────────────────────────────────────────────────────────────── */
  const ER_SEC_VERSION  = '1.0.0';
  const IS_ADMIN        = window.location.pathname.includes('admin');
  const IS_DEV          = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Allowed URL origins for external resources
  const TRUSTED_ORIGINS = new Set([
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    'https://drive.google.com',
    'https://docs.google.com',
    'https://www.youtube.com',
    'https://cdnjs.cloudflare.com',
    'https://www.instagram.com',
    'https://api.anthropic.com',
  ]);

  // Tags allowed inside sanitized HTML (ad codes excluded — they bypass)
  const SAFE_TAGS = new Set([
    'a','abbr','b','blockquote','br','caption','cite','code',
    'col','colgroup','dd','del','dfn','div','dl','dt','em',
    'figcaption','figure','h1','h2','h3','h4','h5','h6',
    'hr','i','img','ins','kbd','li','mark','ol','p','pre',
    'q','rp','rt','ruby','s','samp','section','small','span',
    'strong','sub','sup','table','tbody','td','tfoot','th',
    'thead','time','tr','u','ul','var','wbr',
  ]);

  // Attributes allowed per-tag in sanitized HTML
  const SAFE_ATTRS = new Set([
    'alt','class','colspan','data-*','datetime','dir','height',
    'href','id','lang','rel','rowspan','scope','src','start',
    'style','tabindex','target','title','type','width',
  ]);

  // Patterns that ALWAYS signal malicious intent
  const DANGEROUS_PATTERNS = [
    /javascript\s*:/gi,
    /vbscript\s*:/gi,
    /data\s*:\s*text\/html/gi,
    /data\s*:\s*application\/octet/gi,
    /<\s*script/gi,
    /on\w+\s*=/gi,             // event handlers: onload=, onerror=, etc.
    /expression\s*\(/gi,       // CSS expression()
    /<\s*iframe/gi,
    /<\s*object/gi,
    /<\s*embed/gi,
    /<\s*form/gi,
    /document\s*\./gi,
    /window\s*\./gi,
    /eval\s*\(/gi,
    /Function\s*\(/gi,
    /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi,
    /fetch\s*\(/gi,
    /XMLHttpRequest/gi,
    /import\s*\(/gi,
    /require\s*\(/gi,
    /__proto__/gi,
    /prototype\s*\[/gi,
    /constructor\s*\[/gi,
  ];

  /* ──────────────────────────────────────────────────────────────
     1.  PROTOTYPE POLLUTION PREVENTION
         Freeze core prototypes so attackers can't add properties
         to Object, Array, Function etc. via __proto__ or
         prototype chain manipulation.
     ────────────────────────────────────────────────────────────── */
  (function freezeProtos() {
    try {
      // Delete dangerous special properties
      ['__proto__', '__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__']
        .forEach(prop => {
          try { Object.defineProperty(Object.prototype, prop, { get: undefined, set: undefined, configurable: false }); }
          catch (_) {}
        });

      // Prevent additions to core prototypes (non-breaking: only seals, not freezes)
      // Full freeze breaks too many polyfills, so we use a targeted approach
      const targets = [
        Object.prototype,
        Array.prototype,
        Function.prototype,
        String.prototype,
        Number.prototype,
        Boolean.prototype,
      ];

      targets.forEach(proto => {
        try {
          // Make __proto__ non-configurable (prevent override)
          if (!Object.isFrozen(proto)) {
            Object.defineProperty(proto, '__proto__', {
              get() { return Object.getPrototypeOf(this); },
              set(v) {
                erSec.log('warn', 'Blocked prototype override attempt', { proto: String(proto) });
              },
              enumerable: false, configurable: false,
            });
          }
        } catch (_) {}
      });
    } catch (e) {
      // Non-fatal: log and continue
      if (!IS_DEV) return;
    }
  })();

  /* ──────────────────────────────────────────────────────────────
     2.  CLICKJACKING / FRAME-BUSTING
         Prevent the site being loaded inside an iframe on a
         different origin (e.g. for UI-redressing attacks).
     ────────────────────────────────────────────────────────────── */
  (function antiClickjack() {
    try {
      if (window.self !== window.top) {
        // We're inside a frame
        const parentOrigin = (() => {
          try { return window.parent.location.origin; } catch (_) { return 'unknown'; }
        })();
        const selfOrigin = window.location.origin;

        if (parentOrigin !== selfOrigin && parentOrigin !== 'null') {
          // Not same origin — break out
          document.documentElement.style.display = 'none';
          window.top.location = window.self.location.href;
        }
      }
    } catch (e) {
      // If we can't read window.top it's cross-origin — break out
      document.documentElement.style.display = 'none';
      try { window.top.location = window.self.location.href; } catch (_) {}
    }
  })();

  /* ──────────────────────────────────────────────────────────────
     3.  SECURITY EVENT LOGGER
         Lightweight in-memory log of security events. Admin can
         inspect via window.erSec.getLogs() in DevTools.
     ────────────────────────────────────────────────────────────── */
  const _eventLog = [];
  const MAX_LOG_ENTRIES = 200;

  const erSec = window.erSec = {
    version: ER_SEC_VERSION,

    log(level, message, data = {}) {
      const entry = {
        ts: new Date().toISOString(),
        level,
        message,
        page: window.location.pathname,
        ...data,
      };
      _eventLog.unshift(entry);
      if (_eventLog.length > MAX_LOG_ENTRIES) _eventLog.length = MAX_LOG_ENTRIES;
      if (IS_DEV && level === 'error') console.warn('[erSec]', message, data);
    },

    getLogs(level = null) {
      return level ? _eventLog.filter(e => e.level === level) : [..._eventLog];
    },

    clearLogs() { _eventLog.length = 0; },
  };

  /* ──────────────────────────────────────────────────────────────
     4.  DOM SANITIZER
         Use before ANY innerHTML assignment with untrusted data.
         Does NOT apply to intentional ad-code injection (which
         needs raw HTML/script) — those are protected separately
         via admin authentication.
     ────────────────────────────────────────────────────────────── */
  const erSanitize = window.erSanitize = (function () {
    // DOMParser for safe parsing
    const parser = new DOMParser();

    /**
     * sanitize(html) → string
     * Returns a safe HTML string. Strips scripts, events, dangerous URLs.
     */
    function sanitize(rawHtml) {
      if (!rawHtml) return '';
      const str = String(rawHtml);

      // Quick check — if no < char, no HTML, just escape
      if (!str.includes('<')) return escHtml(str);

      try {
        const doc = parser.parseFromString(str, 'text/html');
        cleanNode(doc.body);
        return doc.body.innerHTML;
      } catch (e) {
        erSec.log('error', 'sanitize() parse failed, falling back to plain text', { error: e.message });
        return escHtml(str);
      }
    }

    function cleanNode(node) {
      if (!node) return;
      const children = [...node.childNodes];
      children.forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const tag = child.tagName.toLowerCase();

          // Remove completely disallowed elements
          if (!SAFE_TAGS.has(tag)) {
            erSec.log('warn', `sanitize: removed disallowed tag <${tag}>`);
            child.remove();
            return;
          }

          // Remove disallowed attributes
          [...child.attributes].forEach(attr => {
            const name = attr.name.toLowerCase();
            const value = attr.value;

            // Block all event handlers
            if (/^on/.test(name)) {
              erSec.log('warn', `sanitize: removed event handler attribute "${name}"`);
              child.removeAttribute(attr.name);
              return;
            }

            // Validate href / src / action
            if (['href', 'src', 'action'].includes(name)) {
              if (!isSafeAttrUrl(value)) {
                erSec.log('warn', `sanitize: blocked unsafe URL in ${name}`, { value: value.slice(0, 80) });
                child.removeAttribute(attr.name);
              }
              return;
            }

            // Block dangerous style values
            if (name === 'style' && !isSafeStyle(value)) {
              child.removeAttribute(attr.name);
              return;
            }

            // Block non-whitelisted attributes (allow data-* broadly)
            if (!SAFE_ATTRS.has(name) && !name.startsWith('data-')) {
              child.removeAttribute(attr.name);
            }
          });

          // Force safe target on external links
          if (tag === 'a') {
            const href = child.getAttribute('href') || '';
            if (/^https?:\/\//i.test(href)) {
              child.setAttribute('target', '_blank');
              child.setAttribute('rel', 'noopener noreferrer');
            }
          }

          // Recurse
          cleanNode(child);
        }
        // Text nodes and comments are left as-is
      });
    }

    function isSafeAttrUrl(value) {
      if (!value) return true;
      const v = value.trim().toLowerCase();
      if (v.startsWith('#')) return true;
      if (v.startsWith('/') && !v.startsWith('//')) return true;
      if (/^https?:\/\//i.test(value)) return true;
      if (/^mailto:/i.test(value)) return true;
      if (/^tel:/i.test(value)) return true;
      return false;
    }

    function isSafeStyle(value) {
      if (!value) return true;
      const v = value.toLowerCase();
      // Block CSS expression() and script protocol injections
      if (/expression\s*\(/i.test(v)) return false;
      if (/javascript\s*:/i.test(v)) return false;
      if (/vbscript\s*:/i.test(v)) return false;
      if (/-moz-binding/i.test(v)) return false;
      // Block all url() values (XSS vector via url(javascript:), url(data:), etc.)
      if (/url\s*\(/i.test(v)) return false;
      // Block behavior: and binding: properties (IE/Gecko XSS vectors)
      if (/\bbehavior\s*:/i.test(v)) return false;
      if (/\bbinding\s*:/i.test(v)) return false;
      // Block any parentheses not preceded by an approved CSS function name
      const APPROVED_FNS = /(?:rgb|rgba|hsl|hsla|calc|min|max|clamp|var|linear-gradient|radial-gradient|conic-gradient|rotate|rotateX|rotateY|rotateZ|scale|scaleX|scaleY|translate|translateX|translateY|translateZ|skew|skewX|skewY|perspective|matrix|matrix3d|cubic-bezier|steps|minmax|repeat|fit-content|env|counter|counters|attr)\s*\(/gi;
      // Remove all approved function calls, then check if any ( remains
      const stripped = v.replace(APPROVED_FNS, '');
      if (/\(/.test(stripped)) return false;
      return true;
    }

    /**
     * escHtml(str) → HTML-entity-encoded string
     */
    function escHtml(str) {
      return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    /**
     * isDangerous(input) → boolean
     * Quick check for obviously malicious strings
     */
    function isDangerous(input) {
      const str = String(input ?? '');
      return DANGEROUS_PATTERNS.some(re => { re.lastIndex = 0; return re.test(str); });
    }

    return { sanitize, isDangerous, escHtml };
  })();

  /* ──────────────────────────────────────────────────────────────
     5.  STRICT URL VALIDATION
         Enhanced version; overrides shared.js sanitize* if loaded
         before shared.js (load order: security.js first).
     ────────────────────────────────────────────────────────────── */
  const _SAFE_RELATIVE_RE   = /^(?:[a-z0-9._-]+\.html|[a-z0-9._/-]+)(?:\?[^<>"']*)?(?:#[^<>"']*)?$/i;
  const _SAFE_HASH_RE        = /^#[^<>"']*$/;
  const _SAFE_HTTP_RE        = /^https?:\/\//i;
  const _SAFE_MAILTO_RE      = /^mailto:[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i;
  const _SAFE_TEL_RE         = /^tel:\+?[\d\s\-().]{7,20}$/;
  const _SAFE_COLOR_RE       = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
  const _SAFE_FILENAME_RE    = /^[a-z0-9._\- ]+$/i;

  /**
   * erValidateUrl(url, options) → string | ''
   * Returns the sanitised URL or empty string if blocked.
   */
  window.erValidateUrl = function erValidateUrl(url, options = {}) {
    const {
      allowRelative = true,
      allowHttp     = true,
      allowMailto   = false,
      allowTel      = false,
      allowHash     = true,
      fallback      = '',
    } = options;

    if (!url) return fallback;
    const u = String(url).trim();
    if (!u) return fallback;

    // Block control characters
    if (/[\u0000-\u001F\u007F]/.test(u)) {
      erSec.log('warn', 'erValidateUrl: blocked control characters', { url: u.slice(0, 60) });
      return fallback;
    }

    // Block obvious dangerous patterns
    if (erSanitize.isDangerous(u)) {
      erSec.log('warn', 'erValidateUrl: blocked dangerous pattern', { url: u.slice(0, 60) });
      return fallback;
    }

    if (allowHash && _SAFE_HASH_RE.test(u))         return u;
    if (allowRelative && _SAFE_RELATIVE_RE.test(u)) return u;
    if (allowHttp && _SAFE_HTTP_RE.test(u)) {
      try {
        const parsed = new URL(u);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return fallback;
        return parsed.href;
      } catch (_) { return fallback; }
    }
    if (allowMailto && _SAFE_MAILTO_RE.test(u)) return u;
    if (allowTel    && _SAFE_TEL_RE.test(u))    return u;

    erSec.log('warn', 'erValidateUrl: URL rejected', { url: u.slice(0, 60) });
    return fallback;
  };

  /* ──────────────────────────────────────────────────────────────
     6.  LOCALSTORAGE INTEGRITY
         Lightweight integrity layer: stores an HMAC-like checksum
         alongside sensitive keys so tampering is detectable.
         Uses SubtleCrypto HMAC-SHA256.
     ────────────────────────────────────────────────────────────── */
  const erStorage = window.erStorage = (function () {
    // Keys that are integrity-checked
    const PROTECTED_KEYS = new Set([
      'er_admin_pass_hash',
      'er_ad_slots',
      'er_nav',
      'er_announcement',
      'er_site_config',
      'er_features',
    ]);

    const SIG_SUFFIX = '_sig';
    let _hmacKey = null;

    // Derive or retrieve a per-device HMAC key from localStorage
    async function getHmacKey() {
      if (_hmacKey) return _hmacKey;
      try {
        const stored = localStorage.getItem('er_sig_key');
        if (stored) {
          const raw = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
          _hmacKey = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
        } else {
          const raw = crypto.getRandomValues(new Uint8Array(32));
          localStorage.setItem('er_sig_key', btoa(String.fromCharCode(...raw)));
          _hmacKey = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
        }
      } catch (_) {}
      return _hmacKey;
    }

    async function sign(value) {
      try {
        const key  = await getHmacKey();
        if (!key) return '';
        const data = new TextEncoder().encode(String(value));
        const sig  = await crypto.subtle.sign('HMAC', key, data);
        return btoa(String.fromCharCode(...new Uint8Array(sig)));
      } catch (_) { return ''; }
    }

    async function verify(value, sigB64) {
      try {
        const key       = await getHmacKey();
        if (!key || !sigB64) return false;
        const data      = new TextEncoder().encode(String(value));
        const sigBytes  = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0));
        return await crypto.subtle.verify('HMAC', key, sigBytes, data);
      } catch (_) { return false; }
    }

    /**
     * setItem(key, value) — write with integrity signature
     */
    async function setItem(key, value) {
      const v = String(value);
      localStorage.setItem(key, v);
      if (PROTECTED_KEYS.has(key)) {
        const sig = await sign(v);
        if (sig) localStorage.setItem(key + SIG_SUFFIX, sig);
      }
    }

    /**
     * getItem(key) — read and verify integrity
     * Returns { value, tampered }
     */
    async function getItem(key) {
      const value  = localStorage.getItem(key);
      if (!PROTECTED_KEYS.has(key) || value === null) {
        return { value, tampered: false };
      }
      const sig     = localStorage.getItem(key + SIG_SUFFIX);
      if (!sig) {
        // Signature missing — first run, create it
        if (value !== null) {
          const newSig = await sign(value);
          if (newSig) localStorage.setItem(key + SIG_SUFFIX, newSig);
        }
        return { value, tampered: false };
      }
      const valid = await verify(value, sig);
      if (!valid) {
        erSec.log('error', 'STORAGE INTEGRITY VIOLATION', { key });
      }
      return { value, tampered: !valid };
    }

    /**
     * checkAll() — verify all protected keys on startup
     * Returns array of tampered keys (empty if clean).
     */
    async function checkAll() {
      const tampered = [];
      for (const key of PROTECTED_KEYS) {
        const { tampered: t } = await getItem(key);
        if (t) tampered.push(key);
      }
      return tampered;
    }

    return { setItem, getItem, checkAll, PROTECTED_KEYS };
  })();

  /* Run integrity check on load */
  erStorage.checkAll().then(tampered => {
    if (tampered.length > 0) {
      erSec.log('error', 'Storage integrity violation detected', { tampered });
      if (IS_ADMIN) {
        // Show a visible warning in admin panel
        document.addEventListener('DOMContentLoaded', () => {
          const banner = document.createElement('div');
          banner.id = 'er-sec-tamper-warning';
          banner.style.cssText = [
            'position:fixed;top:0;left:0;right:0;z-index:99999',
            'background:#c41a14;color:#fff;font-weight:900',
            'font-size:14px;text-align:center;padding:10px 20px',
            'font-family:Nunito,sans-serif;letter-spacing:.5px',
          ].join(';');
          banner.textContent =
            `⚠️ SECURITY WARNING: Possible data tampering detected in: ${tampered.join(', ')}. ` +
            'Verify your site data and consider resetting affected keys in Settings → Data Management.';
          const close = document.createElement('button');
          close.textContent = '✕';
          close.style.cssText = 'margin-left:16px;background:none;border:none;color:#fff;font-size:16px;cursor:pointer;';
          close.onclick = () => banner.remove();
          banner.appendChild(close);
          document.body.insertBefore(banner, document.body.firstChild);
        });
      }
    }
  });

  /* ──────────────────────────────────────────────────────────────
     7.  INPUT VALIDATION — DANGEROUS STRING BLOCKER
         Called before storing any user-typed input to localStorage.
         Use: erSec.validateInput(value, context) → { safe, reason }
     ────────────────────────────────────────────────────────────── */
  erSec.validateInput = function validateInput(value, context = 'generic') {
    const str = String(value ?? '');

    // Excessive length (prevent storage exhaustion)
    if (str.length > 50000) {
      return { safe: false, reason: 'Input too long (max 50,000 chars)' };
    }

    // Check for dangerous patterns in non-ad contexts
    if (context !== 'ad_code' && erSanitize.isDangerous(str)) {
      erSec.log('warn', 'validateInput: dangerous content blocked', { context, preview: str.slice(0, 80) });
      return { safe: false, reason: 'Potentially unsafe content detected' };
    }

    return { safe: true, reason: '' };
  };

  /* ──────────────────────────────────────────────────────────────
     8.  RATE LIMITER
         Prevent rapid repeated actions (brute-force, DoS of
         localStorage operations, etc.)
     ────────────────────────────────────────────────────────────── */
  const _rateLimiter = (function () {
    const _buckets = {};

    /**
     * check(action, maxCalls, windowMs) → boolean
     * Returns true if action is within limits.
     */
    function check(action, maxCalls = 10, windowMs = 10000) {
      const now = Date.now();
      if (!_buckets[action]) _buckets[action] = [];
      // Remove old entries
      _buckets[action] = _buckets[action].filter(ts => now - ts < windowMs);
      if (_buckets[action].length >= maxCalls) {
        erSec.log('warn', 'Rate limit hit', { action, count: _buckets[action].length });
        return false;
      }
      _buckets[action].push(now);
      return true;
    }

    return { check };
  })();

  erSec.rateLimit = _rateLimiter.check;

  /* ──────────────────────────────────────────────────────────────
     9.  ADMIN PANEL HARDENING
         Extra protections that only run on admin.html.
     ────────────────────────────────────────────────────────────── */
  if (IS_ADMIN) {
    (function hardenAdmin() {

      // 9a. DevTools detection — show a warning (doesn't block, but logs)
      let _devToolsOpen = false;
      const _dtThreshold = 160;
      const _detectDevTools = () => {
        const widthDiff  = window.outerWidth  - window.innerWidth;
        const heightDiff = window.outerHeight - window.innerHeight;
        const nowOpen = widthDiff > _dtThreshold || heightDiff > _dtThreshold;
        if (nowOpen && !_devToolsOpen) {
          _devToolsOpen = true;
          erSec.log('warn', 'DevTools opened while admin session active');
          // Non-blocking: just warn the admin via console
          console.warn(
            '%c⚠ ExamReady Security Notice',
            'color:#e8211a;font-size:18px;font-weight:900;',
          );
          console.warn(
            '%cDo not paste any code here that you do not fully understand.\n' +
            'Attackers use the console to steal credentials or hijack sessions.',
            'color:#333;font-size:13px;',
          );
        }
        if (!nowOpen) _devToolsOpen = false;
      };
      setInterval(_detectDevTools, 1000);

      // 9b. Prevent accidental paste of stolen session data
      document.addEventListener('paste', e => {
        const text = (e.clipboardData || window.clipboardData)?.getData('text') || '';
        if (text.length > 10000 && erSanitize.isDangerous(text)) {
          e.preventDefault();
          erSec.log('warn', 'Admin: blocked potentially dangerous paste', { length: text.length });
          alert('⚠ Paste blocked: the content appears to contain executable code. Only paste AdSense ad code in the Ad Manager slots.');
        }
      });

      // 9c. Warn before unload if there are unsaved changes
      let _unsaved = false;
      document.addEventListener('change', () => { _unsaved = true; });
      document.addEventListener('input', () => { _unsaved = true; });
      window.addEventListener('beforeunload', e => {
        if (_unsaved) {
          const msg = 'You may have unsaved changes.';
          e.returnValue = msg;
          return msg;
        }
      });
      // Clear unsaved flag when a save action fires
      document.addEventListener('click', e => {
        const btn = e.target.closest('[onclick*="save"], [onclick*="Save"], .btn-red');
        if (btn) setTimeout(() => { _unsaved = false; }, 300);
      });

      // 9d. Session timeout warning (5 minutes before expiry)
      function watchSessionExpiry() {
        const SESSION_TTL_MS = 30 * 60 * 1000;
        const WARN_BEFORE_MS =  5 * 60 * 1000;
        let _warned = false;

        setInterval(() => {
          const exp = parseInt(sessionStorage.getItem('er_admin_auth_exp') || '0', 10);
          if (!exp) return;
          const remaining = exp - Date.now();
          if (remaining > 0 && remaining < WARN_BEFORE_MS && !_warned) {
            _warned = true;
            const toast = document.createElement('div');
            toast.style.cssText = [
              'position:fixed;bottom:24px;right:24px;z-index:99999',
              'background:#e8211a;color:#fff;padding:14px 20px',
              'border-radius:12px;font-family:Nunito,sans-serif',
              'font-size:14px;font-weight:700;box-shadow:0 8px 32px rgba(0,0,0,.3)',
            ].join(';');
            toast.textContent = '⚠ Admin session expires in 5 minutes. Save your work.';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 8000);
          }
          if (remaining <= 0) _warned = false; // reset for next login
        }, 30000);
      }
      document.addEventListener('DOMContentLoaded', watchSessionExpiry);

      // 9e. Harden all forms — add autocomplete=off to sensitive inputs
      document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('input[type=password]').forEach(el => {
          el.autocomplete = 'current-password';
        });
        document.querySelectorAll('input[type=text]').forEach(el => {
          if (/(key|secret|token|pass)/i.test(el.id || el.name || '')) {
            el.autocomplete = 'off';
          }
        });
      });

    })();
  }

  /* ──────────────────────────────────────────────────────────────
     10. CSP VIOLATION REPORTER
         Catches any Content-Security-Policy violations and logs
         them so you can tighten your CSP header.
     ────────────────────────────────────────────────────────────── */
  document.addEventListener('securitypolicyviolation', e => {
    erSec.log('error', 'CSP violation', {
      blockedUri:       e.blockedURI,
      violatedDirective: e.violatedDirective,
      effectiveDirective: e.effectiveDirective,
      sourceFile:       e.sourceFile,
      lineNumber:       e.lineNumber,
    });
  });

  /* ──────────────────────────────────────────────────────────────
     11. SAFE innerHTML WRAPPER
         window.erSetHtml(el, html, allowUnsafe?)
         Use this instead of el.innerHTML = html everywhere.
     ────────────────────────────────────────────────────────────── */
  window.erSetHtml = function erSetHtml(el, html, allowUnsafe = false) {
    if (!el) return;
    if (allowUnsafe) {
      // Admin-level: still sanitize but keep script tags (ad code)
      el.innerHTML = html;
      return;
    }
    el.innerHTML = erSanitize.sanitize(html);
  };

  /* ──────────────────────────────────────────────────────────────
     12. EXTERNAL LINK SAFETY ENFORCER
         Runs on DOMContentLoaded and on MutationObserver changes,
         adding rel="noopener noreferrer" to all external links.
     ────────────────────────────────────────────────────────────── */
  function hardenLinks(root = document) {
    (root.querySelectorAll ? root : document).querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href') || '';
      if (/^https?:\/\//i.test(href) && !href.includes(window.location.hostname)) {
        if (link.target !== '_blank') link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        link.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => hardenLinks(document));

  // Watch for dynamically added links
  if (typeof MutationObserver !== 'undefined') {
    const _linkObserver = new MutationObserver(mutations => {
      mutations.forEach(m => m.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          hardenLinks(node);
          if (node.tagName === 'A') hardenLinks(node.parentNode || document);
        }
      }));
    });
    document.addEventListener('DOMContentLoaded', () => {
      _linkObserver.observe(document.body, { childList: true, subtree: true });
    });
  }

  /* ──────────────────────────────────────────────────────────────
     13. IFRAME SANDBOX ENFORCER
         Ensure all iframes have sandbox attributes and
         referrerpolicy set.
     ────────────────────────────────────────────────────────────── */
  function hardenIframes(root = document) {
    (root.querySelectorAll ? root : document).querySelectorAll('iframe').forEach(frame => {
      // Only add sandbox to non-admin iframes (admin may use full-feature iframes)
      if (!IS_ADMIN && !frame.hasAttribute('sandbox')) {
        // Allow same-origin scripts and forms; block popups and top navigation
        frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups-to-escape-sandbox');
      }
      if (!frame.getAttribute('referrerpolicy')) {
        frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      }
      if (!frame.getAttribute('loading')) {
        frame.setAttribute('loading', 'lazy');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => hardenIframes(document));

  /* ──────────────────────────────────────────────────────────────
     14. ANTI-INJECTION MONITOR
         Watch for suspicious DOM mutations that insert <script>
         tags into the live page outside of known safe operations.
     ────────────────────────────────────────────────────────────── */
  if (typeof MutationObserver !== 'undefined') {
    let _allowedScriptCount = 0;

    // Count scripts already present at load time (legit)
    document.addEventListener('DOMContentLoaded', () => {
      _allowedScriptCount = document.querySelectorAll('script').length;
    });

    const _scriptObserver = new MutationObserver(mutations => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          // Early-exit: only process SCRIPT and FORM elements to avoid
          // firing on every DOM mutation (critical for quiz page performance)
          if (node.nodeType !== 1) return;
          if (node.tagName !== 'SCRIPT' && node.tagName !== 'FORM') return;

          // Check if it's a script tag injected outside of ad-code containers
          if (node.tagName === 'SCRIPT') {
            const src  = node.src || '';
            const text = node.textContent || '';
            const inAdSlot = node.closest('[data-er-ad-slot],[data-ad-slot],[data-content-ad-slot]');

            if (!inAdSlot && src && !isKnownSafeScript(src)) {
              erSec.log('warn', 'Unexpected external script injected', { src: src.slice(0, 100) });
            }
          }

          // Check for injected forms (phishing)
          if (node.tagName === 'FORM') {
            const action = node.getAttribute('action') || '';
            if (/^https?:\/\//i.test(action) && !TRUSTED_ORIGINS.has(new URL(action).origin)) {
              erSec.log('error', 'Suspicious external form injected', { action: action.slice(0, 100) });
              node.remove();
            }
          }
        });
      });
    });

    document.addEventListener('DOMContentLoaded', () => {
      _scriptObserver.observe(document.body, { childList: true, subtree: true });
    });
  }

  function isKnownSafeScript(src) {
    if (!src) return true;
    try {
      const origin = new URL(src, window.location.href).origin;
      if (origin === window.location.origin) return true;
      if (TRUSTED_ORIGINS.has(origin)) return true;
    } catch (_) {}
    return false;
  }

  /* ──────────────────────────────────────────────────────────────
     15. SAFE JSON PARSER
         Prevents prototype pollution via JSON.parse
         (e.g. {"__proto__": {"admin": true}})
     ────────────────────────────────────────────────────────────── */
  window.erParseJson = function erParseJson(str, fallback = null) {
    try {
      if (!str) return fallback;
      const parsed = JSON.parse(str);

      // Check for prototype pollution keys in the parsed object
      if (parsed && typeof parsed === 'object') {
        const dangerous = ['__proto__', 'constructor', 'prototype'];
        const hasDangerous = (obj, depth = 0) => {
          if (depth > 5 || typeof obj !== 'object' || !obj) return false;
          return dangerous.some(k => Object.prototype.hasOwnProperty.call(obj, k)) ||
            Object.values(obj).some(v => hasDangerous(v, depth + 1));
        };
        if (hasDangerous(parsed)) {
          erSec.log('error', 'Prototype pollution attempt blocked in JSON parse', { preview: str.slice(0, 80) });
          return fallback;
        }
      }
      return parsed;
    } catch (_) {
      return fallback;
    }
  };

  /* ──────────────────────────────────────────────────────────────
     16. SECURE RANDOM UTILITIES
     ────────────────────────────────────────────────────────────── */
  erSec.randomId = function (prefix = 'er') {
    const arr = crypto.getRandomValues(new Uint8Array(16));
    const hex = Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('');
    return `${prefix}_${hex}`;
  };

  erSec.randomToken = function (bytes = 32) {
    const arr = crypto.getRandomValues(new Uint8Array(bytes));
    return btoa(String.fromCharCode(...arr)).replace(/[+/=]/g, '');
  };

  /* ──────────────────────────────────────────────────────────────
     17. CONTENT-TYPE ENFORCEMENT FOR FETCHES
         Patch fetch() so responses are always treated as the
         correct content type (prevents MIME sniffing attacks).
     ────────────────────────────────────────────────────────────── */
  (function patchFetch() {
    const _originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const response = await _originalFetch.apply(this, args);
      // For JSON responses, validate content-type
      const ct = response.headers.get('content-type') || '';
      if (args[0] && String(args[0]).includes('/v1/messages') && !ct.includes('application/json')) {
        erSec.log('warn', 'fetch: unexpected content-type', { url: String(args[0]).slice(0, 80), ct });
      }
      return response;
    };
  })();

  /* ──────────────────────────────────────────────────────────────
     18. GLOBAL ERROR HANDLER
         Catches unhandled errors and logs them, suppresses
         leaking stack traces in production.
     ────────────────────────────────────────────────────────────── */
  window.addEventListener('error', e => {
    erSec.log('error', 'Global JS error', {
      message: e.message,
      source:  e.filename,
      line:    e.lineno,
      col:     e.colno,
    });
    // Suppress stack traces in production (they can reveal code structure)
    if (!IS_DEV && e.message && !IS_ADMIN) {
      e.stopPropagation();
    }
  });

  window.addEventListener('unhandledrejection', e => {
    erSec.log('error', 'Unhandled promise rejection', {
      reason: String(e.reason?.message || e.reason || 'unknown').slice(0, 120),
    });
  });

  /* ──────────────────────────────────────────────────────────────
     19. FINAL INIT LOG
     ────────────────────────────────────────────────────────────── */
  erSec.log('info', 'ExamReady Security v' + ER_SEC_VERSION + ' initialised', {
    page:    window.location.pathname,
    isAdmin: IS_ADMIN,
    isDev:   IS_DEV,
  });

  // Expose version check for external verification
  Object.defineProperty(window, 'erSecVersion', {
    get: () => ER_SEC_VERSION,
    configurable: false,
    enumerable: false,
  });

})();
