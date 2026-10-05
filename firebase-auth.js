(function (global) {
  'use strict';

  const SESSION_KEY = 'er_firebase_admin_session';
  const AUTH_URL = 'https://identitytoolkit.googleapis.com/v1/accounts';
  const TOKEN_URL = 'https://securetoken.googleapis.com/v1/token';

  function config() {
    const value = global.ExamReadyConfig && global.ExamReadyConfig.firebase;
    return value && typeof value === 'object' ? value : {};
  }

  function isConfigured() {
    const value = config();
    return typeof value.apiKey === 'string' && value.apiKey.length > 0 &&
      typeof value.adminUid === 'string' && value.adminUid.length > 0 &&
      !value.adminUid.includes('REPLACE_');
  }

  function readSession() {
    try {
      const value = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
      return value && typeof value === 'object' ? value : null;
    } catch (_) {
      return null;
    }
  }

  function saveSession(response) {
    const value = {
      idToken: response.idToken || response.id_token,
      refreshToken: response.refreshToken || response.refresh_token,
      expiresAt: Date.now() + Math.max(0, Number(response.expiresIn || response.expires_in) || 0) * 1000,
      uid: response.localId || response.user_id,
      email: response.email || (readSession() || {}).email || ''
    };
    if (!value.idToken || !value.refreshToken || value.uid !== config().adminUid) {
      throw new Error('Firebase did not authorize the configured admin account.');
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
    return value;
  }

  async function request(url, body, formEncoded) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': formEncoded ? 'application/x-www-form-urlencoded' : 'application/json' },
      body: formEncoded
        ? Object.keys(body).map(key => encodeURIComponent(key) + '=' + encodeURIComponent(body[key])).join('&')
        : JSON.stringify(body),
      cache: 'no-store',
      credentials: 'omit'
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const code = result && result.error && result.error.message;
      throw new Error(code ? String(code).replace(/_/g, ' ').toLowerCase() : 'Firebase Authentication request failed.');
    }
    return result;
  }

  async function signIn(email, password) {
    if (!isConfigured()) throw new Error('Firebase admin authentication is not configured.');
    const result = await request(AUTH_URL + ':signInWithPassword?key=' + encodeURIComponent(config().apiKey), {
      email: String(email || '').trim(),
      password: String(password || ''),
      returnSecureToken: true
    });
    if (result.localId !== config().adminUid) {
      throw new Error('This Firebase account is not authorized as the site admin.');
    }
    result.email = String(email || '').trim();
    return saveSession(result);
  }

  async function getIdToken() {
    if (!isConfigured()) throw new Error('Firebase admin authentication is not configured.');
    const appSessionExpiry = Number(sessionStorage.getItem('er_admin_auth_exp') || 0);
    if (sessionStorage.getItem('er_admin_auth') !== '1' || !appSessionExpiry || appSessionExpiry <= Date.now()) {
      signOut();
      sessionStorage.removeItem('er_admin_auth');
      sessionStorage.removeItem('er_admin_auth_exp');
      throw new Error('Admin session expired. Sign in again.');
    }
    const current = readSession();
    if (!current || current.uid !== config().adminUid || !current.refreshToken) {
      throw new Error('Sign in with the configured Firebase admin account first.');
    }
    if (current.idToken && current.expiresAt > Date.now() + 60000) return current.idToken;
    const result = await request(TOKEN_URL + '?key=' + encodeURIComponent(config().apiKey), {
      grant_type: 'refresh_token',
      refresh_token: current.refreshToken
    }, true);
    result.email = current.email;
    return saveSession(result).idToken;
  }

  async function changePassword(currentPassword, newPassword) {
    const current = readSession();
    if (!current || !current.email) throw new Error('Sign in again before changing the password.');
    await signIn(current.email, currentPassword);
    const idToken = await getIdToken();
    const result = await request(AUTH_URL + ':update?key=' + encodeURIComponent(config().apiKey), {
      idToken,
      password: String(newPassword || ''),
      returnSecureToken: true
    });
    result.email = current.email;
    saveSession(result);
  }

  function signOut() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  global.ExamReadyFirebaseAuth = Object.freeze({ isConfigured, signIn, getIdToken, changePassword, signOut });
}(window));
