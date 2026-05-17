# ExamReady — Security Hardening Guide

## What was secured and why

---

### How to apply (2 steps)

```bash
# 1. Copy both files to your project root
#    security.js
#    security-patch.sh

# 2. Run the patcher
bash security-patch.sh
```

The patcher injects `security.js` as the **first** script in every page's `<head>`, so it runs before everything else.

---

## What security.js protects against

### 1 · Prototype Pollution (`__proto__` attacks)
**Threat:** An attacker injects `{"__proto__": {"isAdmin": true}}` into a JSON string saved to localStorage, corrupting JavaScript's object inheritance and silently granting elevated access.

**Fix:** Freezes `__proto__` on `Object.prototype`, `Array.prototype`, and other core prototypes. `erParseJson()` scans all parsed JSON for prototype-poisoning keys before they enter the application.

---

### 2 · Clickjacking / UI Redressing
**Threat:** An attacker loads your site inside an invisible `<iframe>` on their phishing page, tricking students into clicking buttons they can't see (e.g. submitting a payment).

**Fix:** Frame-busting code runs immediately on page load. If the site detects it's inside a cross-origin frame, it hides the page and redirects `window.top` to the real URL. The patch script also adds `X-Frame-Options: SAMEORIGIN` as a meta tag.

---

### 3 · Cross-Site Scripting (XSS)
**Threat:** Malicious data stored in localStorage (e.g. a tampered quiz title or navigation URL containing `<script>…</script>`) gets inserted into the DOM via `innerHTML`, executing attacker code in students' browsers.

**Fix:**
- `erSanitize.sanitize(html)` — a built-in DOM sanitizer that strips `<script>`, event handlers (`onclick=`, `onload=`), dangerous URLs (`javascript:`), and non-whitelisted tags/attributes before any `innerHTML` write.
- `erSetHtml(el, html)` — a safe wrapper to use instead of `el.innerHTML = html` in your own code.
- `erSanitize.isDangerous(str)` — quick pattern check against 20+ known XSS signatures.

---

### 4 · localStorage Tampering
**Threat:** A student opens DevTools and edits `er_ad_slots`, `er_nav`, or `er_admin_pass_hash` directly, injecting malicious code or removing the admin password.

**Fix:**
- `erStorage` module signs protected keys with a per-device HMAC-SHA256 signature stored alongside each value.
- On every page load, `erStorage.checkAll()` verifies all protected keys.
- If tampering is detected, a bright red banner appears in the admin panel and the event is logged.

**Protected keys:** `er_admin_pass_hash`, `er_ad_slots`, `er_nav`, `er_announcement`, `er_site_config`, `er_features`.

---

### 5 · URL Injection
**Threat:** Admin-configured URLs for navigation links, announcements, or PDF sources could contain `javascript:` or `data:text/html` schemes that execute code when clicked.

**Fix:** `erValidateUrl()` validates every URL against a strict allowlist of schemes (`http`, `https`, relative paths, `mailto`, `tel`). Anything else is blocked and replaced with the fallback value.

---

### 6 · Script Injection Monitoring
**Threat:** A XSS payload or browser extension injects a `<script src="https://evil.com/steal.js">` tag into the live page after load.

**Fix:** A `MutationObserver` watches for dynamically added `<script>` elements. Any external script not on the trusted-origins list is logged immediately. Injected `<form>` elements pointing to external URLs are removed automatically.

---

### 7 · Admin Session Hardening
- **Session timeout warning** — a toast appears 5 minutes before the 30-minute admin session expires, so admins save work before being logged out.
- **Dangerous paste blocking** — if an admin pastes content longer than 10,000 chars that contains executable code patterns, the paste is blocked with an alert.
- **DevTools detection** — when DevTools are open during an admin session, a console warning tells the admin not to paste unknown code there (social engineering defence).
- **Unsaved-changes warning** — the browser warns before navigating away from the admin panel with unsaved edits.

---

### 8 · Prototype-Safe JSON Parsing
**Threat:** `JSON.parse('{"__proto__":{"isAdmin":true}}')` silently poisons the global prototype.

**Fix:** Replace `JSON.parse()` calls on untrusted data with `erParseJson()`, which scans the result for prototype-pollution keys and returns the fallback value if found.

---

### 9 · External Link Safety
All external links (`href` pointing to a different domain) automatically get:
- `target="_blank"` — opens in new tab
- `rel="noopener noreferrer"` — prevents the new page accessing `window.opener` (tab-napping defence)
- `referrerpolicy="strict-origin-when-cross-origin"` — limits referrer info sent to external sites

Applied both at page load and for any links added dynamically.

---

### 10 · iframe Sandboxing
All `<iframe>` elements (including PDF previews) get:
- `sandbox="allow-scripts allow-same-origin allow-forms allow-popups-to-escape-sandbox"` — restricts what the embedded content can do
- `referrerpolicy="strict-origin-when-cross-origin"`
- `loading="lazy"` — performance bonus

---

### 11 · Rate Limiting
`erSec.rateLimit(action, maxCalls, windowMs)` — a sliding-window rate limiter you can use on any repeated action. Prevents rapid brute-force of admin functions or localStorage flooding.

---

### 12 · CSP Violation Logging
Any Content-Security-Policy violation (e.g. an ad code trying to load from a non-allowed origin) is caught and logged to `erSec.getLogs()` so you can diagnose and tighten your CSP.

---

## Developer API

```js
// View all security events
erSec.getLogs()

// View only errors
erSec.getLogs('error')

// Sanitize HTML before innerHTML
element.innerHTML = erSanitize.sanitize(untrustedHtml)

// Check if a string looks dangerous
if (erSanitize.isDangerous(userInput)) { /* block it */ }

// Validate a URL
const safe = erValidateUrl(rawUrl, { allowHttp: true })

// Rate limit any action (10 calls per 10s)
if (!erSec.rateLimit('my-action', 10, 10000)) {
  console.warn('Too many requests')
}

// Safe JSON parse (prototype-pollution resistant)
const data = erParseJson(localStorage.getItem('my-key'), {})

// Check security version
console.log(erSecVersion) // "1.0.0"
```

---

## What cannot be fully secured on a static client-side site

| Threat | Status |
|---|---|
| Admin panel compromise via stolen password | ⚠ Mitigated (PBKDF2, lockout, session TTL). Cannot prevent if device is physically compromised. |
| localStorage data loss from browser clear | ℹ By design — all data is local. Export backups regularly. |
| Ad code injection (malicious AdSense) | ⚠ Intentional feature — ad codes bypass sanitisation. Only paste code from trusted sources. |
| DDoS | ℹ No server to protect — static hosting handles this. |
| SQL injection | ✅ N/A — no database. |
| Server-side RCE | ✅ N/A — no server. |

---

## Ongoing recommendations

1. **Use HTTPS** — deploy only on HTTPS hosting (Netlify, Vercel, GitHub Pages all do this for free).
2. **Export data weekly** — Admin → Settings → Export All Data. Store the JSON backup safely.
3. **Change the default admin password immediately** — Admin → Settings → Change Password. Use 12+ characters with uppercase, lowercase, numbers, and symbols.
4. **Review ad codes before pasting** — Only paste code from Google AdSense or verified ad networks.
5. **Keep `security.js` as the first script** — do not move it below other scripts.
