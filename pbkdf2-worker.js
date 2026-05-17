/* ================================================================
   EXAMREADY — PBKDF2 Web Worker
   Offloads password hash derivation from the main thread.
   ================================================================ */
self.addEventListener('message', async function(e) {
  const { id, password, salt, iterations } = e.data;
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(String(password)), { name: 'PBKDF2' }, false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits({
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: iterations,
      hash: 'SHA-256'
    }, key, 256);
    const hex = Array.from(new Uint8Array(bits))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    self.postMessage({ id: id, hash: hex, error: null });
  } catch (err) {
    self.postMessage({ id: id, hash: null, error: err.message || 'PBKDF2 failed' });
  }
});
