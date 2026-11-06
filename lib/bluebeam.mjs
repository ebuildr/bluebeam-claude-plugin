// Bluebeam Studio API core: config, token store, OAuth 2.0, authenticated requests, upload/download helpers.
// Zero dependencies. Node 18+ (uses global fetch). Shared by bin/bb.mjs (CLI) and server/mcp.mjs (MCP server).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const REGIONS = {
  us: 'https://api.bluebeam.com',
  de: 'https://api.bluebeamstudio.de',
  au: 'https://api.bluebeamstudio.com.au',
  uk: 'https://api.bluebeamstudio.co.uk',
  se: 'https://api.bluebeamstudio.se',
};
export const SCOPES = {
  read_prime: "Read-only access to a user's Studio Projects and Sessions (reporting)",
  full_user: 'Full access to user-owned Studio Projects and Sessions',
  jobs: 'Access automated Jobs in Studio Projects (PDF processing)',
  offline_access: 'Returns a refresh_token so the user does not have to log in again',
};
export const DEFAULT_SCOPES = 'full_user jobs offline_access';
export const DEFAULT_REDIRECT_URI = 'http://localhost:8765/callback';
export const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------- config & token storage ----------
function isSet(v) { return typeof v === 'string' && v.trim() !== '' && !v.includes('${'); }

export function configDir() {
  // One shared location for the MCP server and the bb CLI (so a login done in either is visible to both).
  if (isSet(process.env.BLUEBEAM_CONFIG_DIR)) return process.env.BLUEBEAM_CONFIG_DIR;
  const xdg = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(xdg, 'bluebeam-claude');
}
const configPath = () => path.join(configDir(), 'config.json');
const tokenPath = () => path.join(configDir(), 'tokens.json');

function readJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; } }
function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true, mode: 0o700 });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', { mode: 0o600 });
}

export function loadConfig() {
  const file = readJson(configPath());
  const env = {
    client_id: process.env.BLUEBEAM_CLIENT_ID,
    client_secret: process.env.BLUEBEAM_CLIENT_SECRET,
    region: process.env.BLUEBEAM_REGION,
    base_url: process.env.BLUEBEAM_BASE_URL,
    redirect_uri: process.env.BLUEBEAM_REDIRECT_URI,
    scopes: process.env.BLUEBEAM_SCOPES,
    pkce: process.env.BLUEBEAM_PKCE,
  };
  const cfg = { ...file };
  for (const [k, v] of Object.entries(env)) if (isSet(v)) cfg[k] = v;
  cfg.region = (cfg.region || 'us').toLowerCase();
  cfg.base_url = cfg.base_url || REGIONS[cfg.region] || (cfg.region.startsWith('http') ? cfg.region : REGIONS.us);
  cfg.redirect_uri = cfg.redirect_uri || DEFAULT_REDIRECT_URI;
  cfg.scopes = cfg.scopes || DEFAULT_SCOPES;
  cfg.pkce = String(cfg.pkce ?? 'false') === 'true';
  cfg._source = { config_file: configPath(), token_file: tokenPath() };
  return cfg;
}

export function saveConfig(patch) {
  const allowed = ['client_id', 'client_secret', 'region', 'base_url', 'redirect_uri', 'scopes', 'pkce'];
  const cur = readJson(configPath());
  for (const [k, v] of Object.entries(patch)) {
    if (!allowed.includes(k)) throw new Error(`Unknown config key "${k}". Allowed: ${allowed.join(', ')}`);
    if (k === 'region' && v && !REGIONS[String(v).toLowerCase()] && !String(v).startsWith('http')) {
      throw new Error(`Unknown region "${v}". Use one of: ${Object.keys(REGIONS).join(', ')} or a full https base URL`);
    }
    if (v === null || v === undefined || v === '') delete cur[k]; else cur[k] = String(v);
  }
  writeJson(configPath(), cur);
  return loadConfig();
}

export function loadTokens() { return readJson(tokenPath()); }
export function saveTokens(t) {
  const now = Date.now();
  const obj = {
    access_token: t.access_token,
    refresh_token: t.refresh_token ?? loadTokens().refresh_token,
    token_type: t.token_type || 'Bearer',
    scope: t.scope,
    expires_at: now + Math.max(60, Number(t.expires_in || 3600)) * 1000,
    obtained_at: now,
  };
  writeJson(tokenPath(), obj);
  return obj;
}
export function clearTokens() { try { fs.unlinkSync(tokenPath()); } catch {} }

export function mask(s) { if (!s) return '(not set)'; s = String(s); return s.length <= 8 ? '****' : s.slice(0, 4) + '…' + s.slice(-4); }

export function status() {
  const cfg = loadConfig();
  const tok = loadTokens();
  const now = Date.now();
  return {
    config_file: cfg._source.config_file,
    token_file: cfg._source.token_file,
    region: cfg.region,
    base_url: cfg.base_url,
    client_id: cfg.client_id || null,
    client_secret: mask(cfg.client_secret),
    redirect_uri: cfg.redirect_uri,
    scopes: cfg.scopes,
    pkce: cfg.pkce,
    configured: Boolean(cfg.client_id && cfg.client_secret),
    logged_in: Boolean(tok.access_token || tok.refresh_token),
    access_token_valid: Boolean(tok.access_token && tok.expires_at > now + 30_000),
    access_token_expires_in_s: tok.expires_at ? Math.max(0, Math.round((tok.expires_at - now) / 1000)) : null,
    has_refresh_token: Boolean(tok.refresh_token),
    token_scope: tok.scope || null,
    refresh_token_last_used: tok.obtained_at ? new Date(tok.obtained_at).toISOString() : null,
    note: tok.refresh_token ? 'Refresh tokens expire if unused for 7 days; access tokens last 60 minutes.' : undefined,
  };
}

function requireCreds(cfg) {
  if (!cfg.client_id || !cfg.client_secret) {
    throw new Error('Bluebeam client_id/client_secret not configured. Run: bb config set client_id=... client_secret=... region=us  (or /bluebeam:setup in Claude Code)');
  }
}

// ---------- OAuth 2.0 (Authorization Code, optional PKCE, refresh) ----------
export function buildAuthorizeUrl(cfg = loadConfig(), opts = {}) {
  requireCreds(cfg);
  const state = opts.state || crypto.randomBytes(16).toString('hex');
  const u = new URL('/oauth2/authorize', cfg.base_url);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', cfg.client_id);
  u.searchParams.set('redirect_uri', cfg.redirect_uri);
  u.searchParams.set('scope', cfg.scopes);
  u.searchParams.set('state', state);
  let code_verifier;
  if (cfg.pkce) {
    code_verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(code_verifier).digest('base64url');
    u.searchParams.set('code_challenge', challenge);
    u.searchParams.set('code_challenge_method', 'S256');
  }
  return { url: u.toString(), state, code_verifier };
}

async function tokenRequest(cfg, form, { basicAuth = false } = {}) {
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
  if (basicAuth) headers.Authorization = 'Basic ' + Buffer.from(`${cfg.client_id}:${cfg.client_secret}`).toString('base64');
  const res = await fetch(new URL('/oauth2/token', cfg.base_url), { method: 'POST', headers, body: new URLSearchParams(form).toString() });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`Token endpoint ${res.status}: ${json.error_description || json.error || text.slice(0, 300)}`);
    err.status = res.status; err.body = json; throw err;
  }
  return json;
}

export async function exchangeCode(code, { code_verifier, cfg = loadConfig() } = {}) {
  requireCreds(cfg);
  const form = { grant_type: 'authorization_code', code, client_id: cfg.client_id, client_secret: cfg.client_secret, redirect_uri: cfg.redirect_uri, scope: cfg.scopes };
  if (code_verifier) form.code_verifier = code_verifier;
  const json = await tokenRequest(cfg, form);
  return saveTokens(json);
}

export async function refreshTokens(cfg = loadConfig()) {
  requireCreds(cfg);
  const tok = loadTokens();
  if (!tok.refresh_token) throw new Error('No refresh_token stored. Log in again (bb auth login).');
  let json;
  try {
    // Documented form: client credentials in Basic header, body = grant_type + refresh_token
    json = await tokenRequest(cfg, { grant_type: 'refresh_token', refresh_token: tok.refresh_token }, { basicAuth: true });
  } catch (e) {
    if (e.status === 400 || e.status === 401) {
      // Fallback: credentials in the body (Postman "send client credentials in body" style)
      json = await tokenRequest(cfg, { grant_type: 'refresh_token', refresh_token: tok.refresh_token, client_id: cfg.client_id, client_secret: cfg.client_secret });
    } else throw e;
  }
  return saveTokens(json);
}

export async function getAccessToken(cfg = loadConfig()) {
  const tok = loadTokens();
  if (tok.access_token && tok.expires_at > Date.now() + 60_000) return tok.access_token;
  if (tok.refresh_token) return (await refreshTokens(cfg)).access_token;
  if (tok.access_token) return tok.access_token; // may be expired; let the API answer 401
  throw new Error('Not logged in to Bluebeam. Run: bb auth login   (or ask Claude to run the bluebeam_login tool)');
}

/** Parse a pasted redirect URL or bare code into {code,state}. */
export function parseCallback(input) {
  const s = String(input).trim();
  if (/^https?:\/\//i.test(s) || s.includes('code=')) {
    const u = new URL(s.startsWith('http') ? s : 'http://x/?' + s.replace(/^\?/, ''));
    const code = u.searchParams.get('code'); const state = u.searchParams.get('state'); const error = u.searchParams.get('error');
    if (error) throw new Error(`Authorization failed: ${error} ${u.searchParams.get('error_description') || ''}`.trim());
    if (!code) throw new Error('No code= parameter found in the pasted URL');
    return { code, state };
  }
  return { code: s, state: null };
}

const PENDING = path.join(os.tmpdir(), 'bluebeam-claude-pending-login.json');
export function savePendingLogin(p) { writeJson(PENDING, p); }
export function loadPendingLogin() { return readJson(PENDING); }
export function clearPendingLogin() { try { fs.unlinkSync(PENDING); } catch {} }


/**
 * Interactive login. Starts a local HTTP listener on the redirect_uri port (if it is a localhost URI),
 * hands the authorize URL to onUrl (the user opens it themselves), waits up to timeoutMs for the callback, exchanges the code.
 */
export async function login({ cfg = loadConfig(), timeoutMs = 300_000, onUrl } = {}) {
  requireCreds(cfg);
  const { url, state, code_verifier } = buildAuthorizeUrl(cfg);
  savePendingLogin({ state, code_verifier, created: Date.now() });
  const ru = new URL(cfg.redirect_uri);
  const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(ru.hostname);
  if (onUrl) onUrl(url); // the caller shows the URL; this module never launches a browser or any external program
  if (!isLocal) {
    return { completed: false, url, message: `redirect_uri ${cfg.redirect_uri} is not a localhost URL, so no local listener was started. After approving, paste the full redirected URL into: bb auth code "<url>"` };
  }
  return await new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const u = new URL(req.url, `http://${ru.host}`);
      if (u.pathname !== ru.pathname) { res.writeHead(404); res.end('Not found'); return; }
      const q = Object.fromEntries(u.searchParams);
      const html = (t, b) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(`<!doctype html><title>${t}</title><body style="font-family:system-ui;padding:2rem"><h2>${t}</h2><p>${b}</p></body>`); };
      try {
        if (q.error) throw new Error(`${q.error}: ${q.error_description || ''}`);
        if (q.state !== state) throw new Error('state mismatch (possible CSRF or stale login attempt)');
        const tokens = await exchangeCode(q.code, { code_verifier, cfg });
        html('Bluebeam login complete', 'You can close this tab and return to Claude Code.');
        clearPendingLogin(); clearTimeout(timer); server.close();
        resolve({ completed: true, url, scope: tokens.scope, expires_at: new Date(tokens.expires_at).toISOString(), has_refresh_token: Boolean(tokens.refresh_token) });
      } catch (e) {
        html('Bluebeam login failed', String(e.message));
        clearTimeout(timer); server.close(); reject(e);
      }
    });
    server.on('error', (e) => { clearTimeout(timer); reject(new Error(`Could not listen on ${cfg.redirect_uri}: ${e.message}. Is the port in use? Change with: bb config set redirect_uri=http://localhost:PORT/callback (and add it in the Developer Portal)`)); });
    const timer = setTimeout(() => { server.close(); resolve({ completed: false, url, message: `Timed out after ${Math.round(timeoutMs / 1000)}s waiting for the browser callback. Open the URL, approve, then paste the redirected URL into: bb auth code "<url>"` }); }, timeoutMs);
    server.listen(Number(ru.port || 80), ru.hostname === '[::1]' ? '::1' : ru.hostname);
  });
}

/** Complete a login manually with a pasted code or redirect URL (headless / remote use). */
export async function completeLogin(input, { cfg = loadConfig() } = {}) {
  const { code, state } = parseCallback(input);
  const pending = loadPendingLogin();
  if (state && pending.state && state !== pending.state) throw new Error('state in pasted URL does not match the login attempt started by bb auth login. Start again with bb auth login --manual');
  const tokens = await exchangeCode(code, { code_verifier: pending.code_verifier, cfg });
  clearPendingLogin();
  return { completed: true, scope: tokens.scope, expires_at: new Date(tokens.expires_at).toISOString(), has_refresh_token: Boolean(tokens.refresh_token) };
}

// ---------- authenticated API requests ----------
export class ApiError extends Error {
  constructor(status, method, url, body) { super(`${method} ${url} -> HTTP ${status}${body ? ': ' + (typeof body === 'string' ? body.slice(0, 500) : JSON.stringify(body).slice(0, 500)) : ''}`); this.status = status; this.body = body; }
}

/**
 * api('GET', '/publicapi/v1/projects', {query:{limit:50}})
 * api('POST', '/publicapi/v1/sessions', {body:{Name:'x'}})
 * Adds Authorization: Bearer, client_id header, JSON content type; refreshes token once on 401.
 */
export async function api(method, apiPath, { query, body, headers = {}, raw = false, cfg = loadConfig(), _retry = true } = {}) {
  requireCreds(cfg);
  const url = new URL(apiPath.startsWith('http') ? apiPath : apiPath.replace(/^\/?/, '/'), cfg.base_url);
  if (query) for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  const token = await getAccessToken(cfg);
  const h = { Authorization: `Bearer ${token}`, client_id: cfg.client_id, Accept: 'application/json', ...headers };
  let payload;
  if (body !== undefined && body !== null) {
    if (Buffer.isBuffer(body) || typeof body === 'string') payload = body;
    else { payload = JSON.stringify(body); h['Content-Type'] = h['Content-Type'] || 'application/json'; }
  }
  const res = await fetch(url, { method: method.toUpperCase(), headers: h, body: payload });
  if (res.status === 401 && _retry && loadTokens().refresh_token) {
    await refreshTokens(cfg);
    return api(method, apiPath, { query, body, headers, raw, cfg, _retry: false });
  }
  if (raw) return res;
  const text = await res.text();
  let data = null; if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  if (!res.ok) throw new ApiError(res.status, method.toUpperCase(), url.pathname, data);
  return data ?? { status: res.status, ok: true };
}

/** Collect every page of a paginated list endpoint ({Items..., TotalCount}). */
export async function apiAll(apiPath, { query = {}, key, pageSize = 100, max = 10_000, cfg } = {}) {
  const out = []; let offset = Number(query.offset || 0);
  for (;;) {
    const page = await api('GET', apiPath, { query: { ...query, offset, limit: pageSize }, cfg });
    const k = key || Object.keys(page).find((x) => Array.isArray(page[x]));
    const items = Array.isArray(page) ? page : (page[k] || []);
    out.push(...items);
    if (Array.isArray(page) || items.length < pageSize || out.length >= max || (page.TotalCount != null && out.length >= page.TotalCount)) break;
    offset += items.length;
  }
  return out;
}

// ---------- file helpers (3-step upload, download, snapshot) ----------
async function putToUploadUrl(uploadUrl, contentType, buf) {
  const res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType || 'application/pdf', 'x-amz-server-side-encryption': 'AES256', 'Content-Length': String(buf.length) }, body: buf });
  if (!res.ok) throw new Error(`Upload to storage failed: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
}

export async function uploadSessionFile(sessionId, localPath, { name, source, cfg } = {}) {
  const buf = fs.readFileSync(localPath);
  const fileName = name || path.basename(localPath);
  if (!/\.pdf$/i.test(fileName)) throw new Error('Studio Sessions only accept .pdf files (and not PDF/A).');
  const meta = await api('POST', `/publicapi/v1/sessions/${sessionId}/files`, { body: { Name: fileName, Source: source || path.resolve(localPath), Size: buf.length }, cfg });
  await putToUploadUrl(meta.UploadUrl, meta.UploadContentType, buf);
  await api('POST', `/publicapi/v1/sessions/${sessionId}/files/${meta.Id}/confirm-upload`, { cfg });
  return { session_id: sessionId, file_id: meta.Id, name: fileName, size: buf.length };
}

export async function uploadProjectFile(projectId, localPath, { name, parentFolderId = 0, cfg } = {}) {
  const buf = fs.readFileSync(localPath);
  const fileName = name || path.basename(localPath);
  const meta = await api('POST', `/publicapi/v1/projects/${projectId}/files`, { body: { Name: fileName, ParentFolderId: Number(parentFolderId), Size: buf.length }, cfg });
  await putToUploadUrl(meta.UploadUrl, meta.UploadContentType, buf);
  await api('POST', `/publicapi/v1/projects/${projectId}/files/${meta.Id}/confirm-upload`, { cfg });
  return { project_id: projectId, file_id: meta.Id, name: fileName, size: buf.length, parent_folder_id: Number(parentFolderId) };
}

/** Check out a project file, upload a new revision, confirm check-in. */
export async function checkinProjectFile(projectId, fileId, localPath, { comment = '', cfg } = {}) {
  const buf = fs.readFileSync(localPath);
  const meta = await api('POST', `/publicapi/v1/projects/${projectId}/files/${fileId}/checkin`, { cfg });
  await putToUploadUrl(meta.UploadUrl, meta.UploadContentType, buf);
  await api('POST', `/publicapi/v1/projects/${projectId}/files/${fileId}/confirm-checkin`, { body: { Comment: comment, Size: buf.length }, cfg });
  return { project_id: projectId, file_id: fileId, size: buf.length, comment };
}

async function downloadUrlTo(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(path.resolve(dest)), { recursive: true });
  fs.writeFileSync(dest, buf);
  return { path: path.resolve(dest), bytes: buf.length };
}

export async function downloadProjectFile(projectId, fileId, dest, { cfg } = {}) {
  const meta = await api('GET', `/publicapi/v1/projects/${projectId}/files/${fileId}`, { cfg });
  if (!meta.DownloadUrl) throw new Error('No DownloadUrl on file metadata');
  return { ...(await downloadUrlTo(meta.DownloadUrl, dest || meta.Name)), name: meta.Name };
}

export async function downloadSessionFile(sessionId, fileId, dest, { snapshot = false, cfg } = {}) {
  const meta = await api('GET', `/publicapi/v1/sessions/${sessionId}/files/${fileId}`, { cfg });
  const url = snapshot ? meta.SnapshotDownloadUrl : meta.DownloadUrl;
  if (!url) throw new Error(snapshot ? 'No snapshot exists yet. Run a snapshot first (bb snapshot <session> <file>).' : 'No DownloadUrl on file metadata');
  return { ...(await downloadUrlTo(url, dest || meta.Name)), name: meta.Name, snapshot };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Start a snapshot (PDF + markups flattened into one PDF), poll until Complete/Error, optionally download. */
export async function snapshotSessionFile(sessionId, fileId, { dest, waitMs = 180_000, pollMs = 3000, cfg } = {}) {
  await api('POST', `/publicapi/v1/sessions/${sessionId}/files/${fileId}/snapshot`, { cfg });
  const start = Date.now(); let st;
  for (;;) {
    st = await api('GET', `/publicapi/v1/sessions/${sessionId}/files/${fileId}/snapshot`, { cfg });
    if (st.Status === 'Complete' || st.Status === 'Error') break;
    if (Date.now() - start > waitMs) return { ...st, timed_out: true };
    await sleep(pollMs);
  }
  if (st.Status === 'Error') throw new Error(`Snapshot failed: ${JSON.stringify(st)}`);
  if (dest) return { ...st, downloaded: await downloadUrlTo(st.DownloadUrl, dest) };
  return st;
}

/** Create a session; permissions preset: 'review' (markup+alerts+save+print, no add docs), 'open' (all allow), 'readonly' (all deny). */
export function sessionPermissions(preset = 'review') {
  const T = ['SaveCopy', 'PrintCopy', 'Markup', 'MarkupAlert', 'AddDocuments', 'FullControl'];
  const allow = { review: ['SaveCopy', 'PrintCopy', 'Markup', 'MarkupAlert'], open: ['SaveCopy', 'PrintCopy', 'Markup', 'MarkupAlert', 'AddDocuments'], readonly: [] }[preset];
  if (!allow) throw new Error(`Unknown permissions preset "${preset}" (review|open|readonly)`);
  return T.filter((t) => t !== 'FullControl').map((t) => ({ Type: t, Allow: allow.includes(t) ? 'Allow' : 'Deny' }));
}

export async function createSession({ name, restricted = true, notification = true, endDate, permissions = 'review', cfg } = {}) {
  if (!name) throw new Error('Session name is required');
  const body = { Name: name, Restricted: Boolean(restricted), Notification: Boolean(notification), DefaultPermissions: Array.isArray(permissions) ? permissions : sessionPermissions(permissions) };
  if (endDate) body.SessionEndDate = new Date(endDate).toISOString();
  const r = await api('POST', '/publicapi/v1/sessions', { body, cfg });
  const meta = await api('GET', `/publicapi/v1/sessions/${r.Id}`, { cfg }).catch(() => ({}));
  return { Id: r.Id, ...meta };
}

// ---------- markups ----------
export async function getMarkups(sessionId, fileId, { details = false, cfg } = {}) {
  const p = `/publicapi/v2/sessions/${sessionId}/files/${fileId}/markups${details ? '/details' : ''}`;
  if (!details) return api('GET', p, { cfg });
  const out = []; let offset = 0; const limit = 200;
  for (;;) {
    const page = await api('GET', p, { query: { offset, limit }, cfg });
    const items = Array.isArray(page) ? page : (page.markups || page.Markups || []);
    out.push(...items); if (items.length < limit) break; offset += items.length;
  }
  return out;
}

export function toCsv(rows) {
  if (!rows?.length) return '';
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const esc = (v) => { if (v === null || v === undefined) return ''; const s = typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n') + '\n';
}

// ---------- OpenAPI spec search ----------
let _spec;
export function loadSpec() { return (_spec ||= JSON.parse(fs.readFileSync(path.join(PLUGIN_ROOT, 'spec', 'bluebeam-studio-api.json'), 'utf8'))); }
function deref(spec, s) { if (s && s.$ref) return spec.components.schemas[s.$ref.split('/').pop()] || {}; return s || {}; }
function schemaSummary(spec, s, depth = 0) {
  s = deref(spec, s);
  if (s.type === 'array') return `array<${schemaSummary(spec, s.items, depth + 1)}>`;
  if (!s.properties) return s.type ? (s.enum ? `${s.type}(${s.enum.join('|')})` : s.type) : 'object';
  if (depth > 1) return 'object';
  const req = new Set(s.required || []);
  return '{ ' + Object.entries(s.properties).map(([k, v]) => `${k}${req.has(k) ? '*' : ''}: ${schemaSummary(spec, v, depth + 1)}`).join(', ') + ' }';
}
export function searchSpec(keyword, { limit = 15 } = {}) {
  const spec = loadSpec(); const kws = String(keyword || '').toLowerCase().split(/\s+/).filter(Boolean);
  const results = [];
  for (const [p, ops] of Object.entries(spec.paths)) for (const [m, op] of Object.entries(ops)) {
    if (!['get', 'post', 'put', 'patch', 'delete'].includes(m)) continue;
    const hay = `${m} ${p} ${(op.tags || []).join(' ')} ${op.summary || ''} ${op.description || ''} ${op.operationId || ''}`.toLowerCase();
    const score = kws.reduce((a, k) => a + (hay.includes(k) ? (p.toLowerCase().includes(k) ? 3 : 1) : 0), 0);
    if (!kws.length || score > 0) {
      const params = (op.parameters || []).map((x) => `${x.in}:${x.name}${x.required ? '*' : ''}`);
      const rb = op.requestBody?.content; const ct = rb && Object.keys(rb)[0];
      const resp = Object.entries(op.responses || {}).find(([c]) => c.startsWith('2'));
      const rc = resp?.[1]?.content; const rct = rc && Object.keys(rc)[0];
      results.push({ score, method: m.toUpperCase(), path: p, tag: op.tags?.[0], summary: (op.summary || op.description || '').replace(/\s+/g, ' ').trim(), params, body: ct ? schemaSummary(spec, rb[ct].schema) : undefined, response: rct ? schemaSummary(spec, rc[rct].schema).slice(0, 800) : resp?.[0] });
    }
  }
  return results.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path)).slice(0, limit).map(({ score, ...r }) => r);
}
