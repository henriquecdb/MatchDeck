import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRustAudit } from './check-rust-audit.mjs';

const metadata = {
  resolve: { root: 'app', nodes: [{ id: 'app', deps: [{ pkg: 'windows' }] }, { id: 'windows', deps: [] }, { id: 'linux', deps: [] }] },
  packages: [{ id: 'app', name: 'matchdeck', version: '0.4.3' }, { id: 'windows', name: 'windows-api', version: '1.0.0' }, { id: 'linux', name: 'linux-api', version: '1.0.0' }],
};
const report = name => ({ vulnerabilities: { found: false }, warnings: { unsound: [{ package: { name, version: '1.0.0' }, advisory: { id: 'TEST-001' } }] } });

test('rejects known vulnerabilities regardless of target', () => {
  assert.throws(() => checkRustAudit({ vulnerabilities: { found: true } }, metadata), /known vulnerabilities/);
});
test('rejects unsound dependencies reachable in the Windows graph', () => {
  assert.throws(() => checkRustAudit(report('windows-api'), metadata), /Unsound Windows dependency/);
});
test('keeps excluded platform warnings visible without claiming they ship on Windows', () => {
  assert.match(checkRustAudit(report('linux-api'), metadata)[0], /not in the Windows build/);
});
test('fails closed when the scanner report or target graph is unavailable', () => {
  assert.throws(() => checkRustAudit({}, metadata), /Invalid RustSec/);
  assert.throws(() => checkRustAudit(report('linux-api'), { resolve: null }), /Missing Windows/);
});
