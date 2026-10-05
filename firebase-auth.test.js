const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(__dirname + '/firebase-auth.js', 'utf8');

function createAuth(config, responder) {
  const values = new Map();
  const calls = [];
  const sessionStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
  const window = { ExamReadyConfig: { firebase: config } };
  const fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return responder(String(url), options);
  };
  vm.runInNewContext(source, {
    window, sessionStorage, fetch, Date, JSON, String, Number,
    encodeURIComponent, Promise, Error
  }, { filename: 'firebase-auth.js' });
  return { auth: window.ExamReadyFirebaseAuth, values, calls };
}

function response(body, ok = true) {
  return { ok, json: async () => body };
}

async function testFailsClosedWithoutConfig() {
  const instance = createAuth({ apiKey: '', adminUid: '' }, () => response({}));
  assert.equal(instance.auth.isConfigured(), false);
  await assert.rejects(instance.auth.signIn('admin@example.com', 'password'), /not configured/i);
  assert.equal(instance.calls.length, 0);
}

async function testRejectsNonAdminUid() {
  const instance = createAuth({ apiKey: 'web-key', adminUid: 'admin-uid' }, () => response({
    localId: 'other-uid', idToken: 'id', refreshToken: 'refresh', expiresIn: '3600'
  }));
  await assert.rejects(instance.auth.signIn('user@example.com', 'password'), /not authorized/i);
  assert.equal(instance.values.size, 0);
}

async function testAdminTokenAndRefresh() {
  let calls = 0;
  const instance = createAuth({ apiKey: 'web-key', adminUid: 'admin-uid' }, (url, options) => {
    calls += 1;
    if (url.includes('signInWithPassword')) {
      return response({ localId: 'admin-uid', email: 'admin@example.com', idToken: 'first-token', refreshToken: 'refresh-token', expiresIn: '0' });
    }
    assert.match(options.headers['Content-Type'], /application\/x-www-form-urlencoded/);
    assert.match(options.body, /grant_type=refresh_token/);
    return response({ user_id: 'admin-uid', id_token: 'renewed-token', refresh_token: 'rotated-refresh', expires_in: '3600' });
  });
  await instance.auth.signIn('admin@example.com', 'secret-password');
  instance.values.set('er_admin_auth', '1');
  instance.values.set('er_admin_auth_exp', String(Date.now() + 30 * 60 * 1000));
  assert.equal(await instance.auth.getIdToken(), 'renewed-token');
  assert.equal(calls, 2);
  const stored = [...instance.values.values()].join(' ');
  assert.equal(stored.includes('secret-password'), false);
  assert.equal(stored.includes('renewed-token'), true);
}

async function testRejectsExpiredAdminSession() {
  const instance = createAuth({ apiKey: 'web-key', adminUid: 'admin-uid' }, () => response({
    localId: 'admin-uid', email: 'admin@example.com', idToken: 'token', refreshToken: 'refresh', expiresIn: '3600'
  }));
  await instance.auth.signIn('admin@example.com', 'password');
  instance.values.set('er_admin_auth', '1');
  instance.values.set('er_admin_auth_exp', String(Date.now() - 1));
  await assert.rejects(instance.auth.getIdToken(), /session expired/i);
  assert.equal(instance.values.has('er_firebase_admin_session'), false);
}

(async () => {
  for (const test of [testFailsClosedWithoutConfig, testRejectsNonAdminUid, testAdminTokenAndRefresh, testRejectsExpiredAdminSession]) {
    await test();
    console.log('PASS ' + test.name);
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
