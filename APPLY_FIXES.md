# ExamReady — Ad Manager Fix Guide

## What was broken

|#|Bug|Symptom|
|-|-|-|
|1|`const adMgr` is block-scoped in admin.html|Clicking "Save Slot", "Save All", "Enable All" etc. does nothing — `ReferenceError: adMgr is not defined` in console|
|2|`insertSmartAds` looked for keys `top` / `footer` / `between` / `sticky` but admin saves under `top\\\_banner` / `pre\\\_footer` / `between\\\_sections` / `sidebar\\\_sticky`|Real ad code saved in admin never injected on live pages|
|3|Two ad systems (shared.js + ads.js) both injected sticky/mobile-bottom without proper guards|Occasional duplicate ad elements|

\---

## Fix A — Admin panel buttons (CRITICAL — do this first)

### Option 1: Drop-in patch file (2 minutes, no code editing)

1. Copy `adfix\\\_patch.js` to your project root (same folder as `admin.html`).
2. Open `admin.html`, find the very last `</body>` tag.
3. Add **one line** just before it:

```html
    <script src="adfix\\\_patch.js"></script>
  </body>
</html>
```

Done. All Ad Manager buttons will work immediately.

### Option 2: Direct code edit (30 seconds)

Open `admin.html`. Search for this exact line (\~line 850 inside the inline `<script>`):

```js
// Ad Manager public API
const adMgr = {
```

Change `const adMgr` → `window.adMgr`:

```js
// Ad Manager public API
window.adMgr = {
```

Save. Done.

\---

## Fix B — Live pages don't show saved ads

Open `shared.js`. Find the `insertSmartAds()` function.

Inside it, the injection calls use fixed key names (`top`, `footer`, `sticky`, `between`).
The fixed version in `shared\\\_ad\\\_section.js` resolves key aliases so that if you've saved
code under `top\\\_banner` (the ads.js key) it still gets injected, and vice-versa.

### How to apply

Replace the entire **`// ===== AD SYSTEM =====`** block in `shared.js` with the
contents of `shared\\\_ad\\\_section.js`.

The block starts at:

```js
// ===== AD SYSTEM =====
```

and ends just before:

```js
// Auto-apply on DOMContentLoaded
```

Paste the full contents of `shared\\\_ad\\\_section.js` in place of that block.

\---

## Fix C — native-ads.js (optional but recommended)

If you want ads visible even before AdSense is approved (native placeholder cards),
add `native-ads.js` to every public page after `animations.js`:

```html
<script src="animations.js"></script>
<script src="native-ads.js"></script>   ← add this
```

Or run the one-liner from your project root:

```bash
for f in \\\*.html; do
  \\\[\\\[ "$f" == "admin.html" ]] \\\&\\\& continue
  grep -q 'native-ads.js' "$f" \\\&\\\& continue
  grep -q 'animations.js' "$f" || continue
  sed -i 's|<script src="animations.js"></script>|<script src="animations.js"></script>\\\\n<script src="native-ads.js"></script>|' "$f"
  echo "Patched: $f"
done
```

\---

## Slot key reference

|Admin saves under|Injected by|
|-|-|
|`top`|shared.js (insertSmartAds)|
|`top\\\_banner`|ads.js|
|`footer`|shared.js|
|`pre\\\_footer`|ads.js|
|`inline`|shared.js|
|`inline\\\_1/2/3`|ads.js|
|`between`|shared.js (also accepts `between\\\_sections`)|
|`between\\\_sections`|ads.js|
|`results`|shared.js (getManagedAdSlotHtml)|
|`results\\\_banner`|ads.js|
|`solution\\\_mid`|ads.js|
|`quiz\\\_sidebar`|ads.js|
|`sticky`|shared.js (also accepts `sidebar\\\_sticky`)|
|`sidebar\\\_sticky`|ads.js|
|`mobile\\\_bottom`|both systems|

**Tip:** For slots that appear in both columns, paste the same AdSense code into both keys in Admin → Ad Manager so both systems inject it.

