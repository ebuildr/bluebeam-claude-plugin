// End-to-end test against the mock server: config, token exchange, API calls with auth headers, pagination,
// 3-step upload, snapshot polling, markups CSV, refresh on 401, and the MCP stdio handshake.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)); const root = path.resolve(here, '..');
const tmp = path.join(here, 'tmp'); fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp);
const PORT = 8990;
const env = { ...process.env, BLUEBEAM_CONFIG_DIR: path.join(tmp, 'cfg'), MOCK_PORT: String(PORT), MOCK_EXPIRES: '3600' };
const mock = spawn(process.execPath, [path.join(here, 'mock-server.mjs')], { env, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((r) => mock.stdout.once('data', r));
const bb = (...args) => JSON.parse(execFileSync(process.execPath, [path.join(root, 'bin/bb.mjs'), ...args], { env, encoding: 'utf8' }));
const bbFail = (...args) => { try { execFileSync(process.execPath, [path.join(root, 'bin/bb.mjs'), ...args], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); throw new Error('expected failure'); } catch (e) { return String(e.stderr || e.message); } };
let passed = 0; const ok = (name) => { passed++; console.log('  ok', name); };
try {
  // config
  const st = bb('config', 'set', 'client_id=cid', 'client_secret=csecret', `base_url=http://localhost:${PORT}`, 'redirect_uri=http://localhost:8766/callback');
  assert.equal(st.configured, true); assert.equal(st.client_secret.includes('csecret'), false); ok('config set masks secret');
  assert.match(bbFail('whoami'), /Not logged in/); ok('unauthenticated call errors clearly');
  // manual login: url then code
  const u = bb('auth', 'login', '--manual'); const url = new URL(u.open_this_url);
  assert.equal(url.pathname, '/oauth2/authorize'); assert.equal(url.searchParams.get('client_id'), 'cid'); assert.equal(url.searchParams.get('response_type'), 'code'); assert.equal(url.searchParams.get('scope'), 'full_user jobs offline_access'); ok('authorize URL built');
  assert.match(bbFail('auth', 'code', `http://localhost:8766/callback?code=GOODCODE&state=WRONG`), /state/); ok('state mismatch rejected');
  const done = bb('auth', 'code', `http://localhost:8766/callback?code=GOODCODE&state=${url.searchParams.get('state')}`);
  assert.equal(done.completed, true); assert.equal(done.has_refresh_token, true); ok('code exchange + token store');
  // api call with headers
  const me = bb('whoami'); assert.equal(me.Email, 'mock@example.com'); ok('whoami (Bearer + client_id headers accepted)');
  // sessions create/list/pagination
  const s = bb('sessions', 'create', '--name', 'Test review', '--perms', 'review'); assert.match(s.Id, /-000-000$/); assert.equal(s._perms.find((p) => p.Type === 'AddDocuments').Allow, 'Deny'); ok('session create with permission preset');
  for (let i = 0; i < 3; i++) bb('sessions', 'create', '--name', 'S' + i);
  const list = bb('sessions', 'list'); assert.equal(list.length, 4); ok('session list');
  // upload 3-step
  const pdf = path.join(tmp, 'a.pdf'); fs.writeFileSync(pdf, '%PDF-1.4 test content');
  const up = bb('upload', '--session', s.Id, pdf); assert.equal(up.file_id, 5000); ok('3-step upload + confirm');
  const files = bb('sessions', 'files', s.Id); assert.equal(files[0].Status, 'Active'); ok('uploaded file active');
  assert.match(bbFail('upload', '--session', s.Id, path.join(root, 'README.md')), /pdf/i); ok('non-pdf rejected for sessions');
  // snapshot poll + download
  const snap = bb('snapshot', s.Id, '5000', '--out', path.join(tmp, 'snap.pdf'), '--wait', '20'); assert.equal(snap.Status, 'Complete'); assert.equal(fs.existsSync(path.join(tmp, 'snap.pdf')), true); ok('snapshot polled and downloaded');
  // markups csv + details pagination
  const mk = bb('markups', s.Id, '5000', '--csv', path.join(tmp, 'm.csv')); assert.equal(mk.count, 2); const csv = fs.readFileSync(path.join(tmp, 'm.csv'), 'utf8'); assert.match(csv, /"fix ""this"", please"/); ok('markups CSV with quoting');
  const det = bb('markups', s.Id, '5000', '--details'); assert.equal(det.length, 201); ok('markups details paginated');
  // generic api + search
  const g = bb('api', 'GET', `/publicapi/v1/sessions/${s.Id}`); assert.equal(g.Name, 'Test review'); ok('generic api GET');
  const sr = bb('search', 'snapshot'); assert.ok(sr.some((r) => r.path.endsWith('/snapshot'))); ok('spec search');
  // finalize + delete
  bb('sessions', 'finalize', s.Id); assert.equal(bb('sessions', 'get', s.Id).Status, 'Finalizing'); bb('sessions', 'delete', s.Id); assert.match(bbFail('sessions', 'get', s.Id), /404/); ok('finalize and delete');
  // refresh flow: force expiry by editing token file
  const tp = path.join(tmp, 'cfg', 'tokens.json'); const t = JSON.parse(fs.readFileSync(tp, 'utf8')); const oldAt = t.access_token; t.expires_at = Date.now() - 1000; fs.writeFileSync(tp, JSON.stringify(t));
  bb('whoami'); const t2 = JSON.parse(fs.readFileSync(tp, 'utf8')); assert.notEqual(t2.access_token, oldAt); assert.ok(t2.refresh_token && t2.refresh_token !== t.refresh_token); ok('expired access token refreshed (Basic auth, rotated refresh token)');
  // MCP handshake
  const mcp = spawn(process.execPath, [path.join(root, 'server/mcp.mjs')], { env, stdio: ['pipe', 'pipe', 'inherit'] });
  const replies = []; let buf = ''; mcp.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { replies.push(JSON.parse(buf.slice(0, i))); buf = buf.slice(i + 1); } });
  const rpc = (o) => mcp.stdin.write(JSON.stringify(o) + '\n');
  rpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '0' } } });
  rpc({ jsonrpc: '2.0', method: 'notifications/initialized' });
  rpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  rpc({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'bluebeam_status', arguments: {} } });
  rpc({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'bluebeam_list_sessions', arguments: { search: 'S1' } } });
  rpc({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'bluebeam_request', arguments: { method: 'GET', path: '/publicapi/v1/nope' } } });
  rpc({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'bluebeam_api_search', arguments: { keywords: 'webhook', limit: 3 } } });
  await new Promise((r) => { const iv = setInterval(() => { if (replies.length >= 6) { clearInterval(iv); r(); } }, 50); setTimeout(() => { clearInterval(iv); r(); }, 8000); });
  mcp.stdin.end();
  assert.equal(replies.length, 6, 'mcp replies'); const R = Object.fromEntries(replies.map((r) => [r.id, r.result])); // async tool calls may answer out of order
  assert.equal(R[1].serverInfo.name, 'bluebeam'); ok('mcp initialize');
  assert.ok(R[2].tools.length >= 15 && R[2].tools.every((t) => t.inputSchema.type === 'object')); ok(`mcp tools/list (${R[2].tools.length} tools)`);
  assert.match(R[3].content[0].text, /"logged_in": true/); ok('mcp bluebeam_status');
  assert.equal(JSON.parse(R[4].content[0].text).length, 1); ok('mcp bluebeam_list_sessions filter');
  assert.equal(R[5].isError, true); assert.match(R[5].content[0].text, /404/); ok('mcp error surfaced as isError');
  assert.ok(JSON.parse(R[6].content[0].text).some((r) => r.path.includes('subscriptions'))); ok('mcp api search');
  console.log(`\nALL ${passed} TESTS PASSED`);
} finally { mock.kill(); }
