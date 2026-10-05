const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = __dirname;
let htmlCount = 0;
let inlineScriptCount = 0;
let localReferenceCount = 0;

for (const name of fs.readdirSync(root).filter(file => file.endsWith('.html'))) {
  htmlCount += 1;
  const html = fs.readFileSync(path.join(root, name), 'utf8');
  const scripts = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  for (const match of html.matchAll(scripts)) {
    if (/\bsrc\s*=/.test(match[1])) continue;
    if (/\btype\s*=\s*["'](?:application\/(?:ld\+)?json|importmap)["']/i.test(match[1])) continue;
    const code = match[2].trim();
    if (!code) continue;
    new vm.Script(code, { filename: name + ':inline-script-' + (++inlineScriptCount) });
  }

  const refs = /\b(?:src|href)\s*=\s*(["'])(.*?)\1/gi;
  for (const match of html.matchAll(refs)) {
    const value = match[2].trim();
    if (!value || value.includes('…') || value.includes('+') || value.includes('${') || value.startsWith('#') || value.startsWith('//') || /^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(value)) continue;
    const pathname = decodeURIComponent(value.split(/[?#]/, 1)[0]);
    if (!pathname) continue;
    localReferenceCount += 1;
    assert.ok(fs.existsSync(path.resolve(root, pathname)), name + ' references missing local file: ' + value);
  }
}

const rules = JSON.parse(fs.readFileSync(path.join(root, 'database.rules.json'), 'utf8')).rules;
assert.equal(rules['.read'], false);
assert.equal(rules['.write'], false);
assert.equal(rules.siteData['.read'], true);
assert.match(rules.siteData['.write'], /auth\.uid/);
JSON.parse(fs.readFileSync(path.join(root, 'firebase.json'), 'utf8'));
JSON.parse(fs.readFileSync(path.join(root, 'site-data.json'), 'utf8'));

const admin = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
const retiredAuthMarkers = ['DEFAULT_' + 'ADMIN_PASSWORD', 'Exam' + 'Ready@Admin25', 'er_write_' + 'token'].join('|');
assert.doesNotMatch(admin, new RegExp(retiredAuthMarkers));
assert.match(admin, /ExamReadyFirebaseAuth\.signIn/);
assert.match(admin, /ExamReadyFirebaseAuth\.getIdToken/);
assert.doesNotMatch(admin, /src=["']security\.js["']/);

console.log('PASS site audit: ' + htmlCount + ' HTML files, ' + inlineScriptCount + ' inline scripts, ' + localReferenceCount + ' local references');
