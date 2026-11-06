#!/usr/bin/env node
// Minimal MCP (Model Context Protocol) stdio server for the Bluebeam Studio API. Zero dependencies.
// Speaks JSON-RPC 2.0 over newline-delimited stdin/stdout. Implements initialize, ping, tools/list, tools/call.
import * as bb from '../lib/bluebeam.mjs';

const PROTOCOL = '2025-06-18';
const str = (d = '') => ({ type: 'string', description: d });
const bool = (d = '') => ({ type: 'boolean', description: d });
const num = (d = '') => ({ type: 'number', description: d });

const TOOLS = [
  { name: 'bluebeam_status', description: 'Show Bluebeam plugin configuration (client id, region, redirect URI, scopes; secret masked) and login/token status. Call this first when something fails.', inputSchema: { type: 'object', properties: {} } },
  { name: 'bluebeam_configure', description: 'Save Bluebeam API app credentials/settings (from the Developer Portal My Apps page) to the plugin config file. Any subset of fields may be given.', inputSchema: { type: 'object', properties: { client_id: str('Client ID from developers.bluebeam.com > My Apps'), client_secret: str('Client Secret'), region: str('us | de | au | uk | se (must match the Region the app was created in)'), redirect_uri: str('Redirect URI registered on the app. Default http://localhost:8765/callback'), scopes: str('Space-separated scopes. Default "full_user jobs offline_access"'), base_url: str('Override the API host (e.g. https://studioapi.bluebeam.com). Normally derived from region.'), auth_base_url: str('Override the OAuth host if it differs from the API host (e.g. https://api.bluebeam.com). Defaults to base_url.'), pkce: bool('Use PKCE (S256). Default false.') } } },
  { name: 'bluebeam_login', description: 'Start the OAuth 2.0 Authorization Code login. Returns the URL the user must open and sign in with their BBID. Show the URL to the user; they open it themselves (the plugin never launches programs). If redirect_uri is a localhost URL this tool waits (up to wait_seconds) for the browser callback and finishes the login itself. If the browser cannot reach this machine (remote/cloud session), the user pastes the redirected URL back and you call bluebeam_login_complete.', inputSchema: { type: 'object', properties: { wait_seconds: num('How long to wait for the browser callback. Default 240. Use 0 to just get the URL (manual mode).') } } },
  { name: 'bluebeam_login_complete', description: 'Finish a manual login: pass the full redirected URL (http://localhost:8765/callback?code=...&state=...) or the bare code the user pasted.', inputSchema: { type: 'object', properties: { code_or_url: str('Pasted redirect URL or authorization code') }, required: ['code_or_url'] } },
  { name: 'bluebeam_logout', description: 'Delete stored access/refresh tokens.', inputSchema: { type: 'object', properties: {} } },
  { name: 'bluebeam_request', description: 'Call any Bluebeam Studio API endpoint with auth handled (Bearer token + client_id header, auto refresh). path is relative to the regional base URL, e.g. /publicapi/v1/sessions. Use bluebeam_api_search to find paths and field names.', inputSchema: { type: 'object', properties: { method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] }, path: str('e.g. /publicapi/v1/projects/{id}'), query: { type: 'object', description: 'Query parameters', additionalProperties: true }, body: { description: 'JSON body for POST/PUT' } }, required: ['method', 'path'] } },
  { name: 'bluebeam_api_search', description: 'Search the bundled Bluebeam Studio API OpenAPI spec (99 endpoints: projects, folders, files, sessions, session files, users, markups v2, webhooks, PDF jobs). Returns method, path, params, request body and response fields.', inputSchema: { type: 'object', properties: { keywords: str('e.g. "session markups", "project files upload", "snapshot", "webhook"'), limit: num('Max results, default 15') }, required: ['keywords'] } },
  { name: 'bluebeam_list_projects', description: 'List Studio Projects the user owns or attends.', inputSchema: { type: 'object', properties: { search: str('Filter by name substring (server-side searchTerm)') } } },
  { name: 'bluebeam_list_sessions', description: 'List Studio Sessions the user owns or attends (Id, Name, Status, OwnerEmail, Created, SessionEndDate, InviteUrl).', inputSchema: { type: 'object', properties: { search: str('Filter by name substring'), include_deleted: bool() } } },
  { name: 'bluebeam_create_session', description: 'Create a Studio Session with sane default attendee permissions.', inputSchema: { type: 'object', properties: { name: str('Session name'), restricted: bool('Only invited emails may join. Default true'), notification: bool('Email the host about changes. Default true'), end_date: str('ISO date/time when attendees are removed (optional)'), permissions: str('Preset: review (markup+alerts+save+print, no adding docs) | open | readonly. Default review') }, required: ['name'] } },
  { name: 'bluebeam_session_files', description: 'List files in a Studio Session (Id, Name, Size, Status, Source).', inputSchema: { type: 'object', properties: { session_id: str() }, required: ['session_id'] } },
  { name: 'bluebeam_project_items', description: 'List files and folders in a Studio Project folder (folder_id 0 = root).', inputSchema: { type: 'object', properties: { project_id: str(), folder_id: num('Default 0 (root)') }, required: ['project_id'] } },
  { name: 'bluebeam_upload_file', description: 'Upload a local file: 3-step flow (create metadata, PUT to storage with AES256 header, confirm-upload). Give either session_id (PDF only) or project_id.', inputSchema: { type: 'object', properties: { local_path: str('Absolute path of the file to upload'), session_id: str('Target Studio Session'), project_id: str('Target Studio Project'), folder_id: num('Project folder id, default 0 (root)'), name: str('Override stored file name'), source: str('Session file Source label (where it came from)') }, required: ['local_path'] } },
  { name: 'bluebeam_download_file', description: 'Download a Session or Project file to a local path. For a Session file, snapshot=true downloads the latest flattened snapshot (PDF + markups).', inputSchema: { type: 'object', properties: { session_id: str(), project_id: str(), file_id: str(), dest_path: str('Local destination path (default: original file name in cwd)'), snapshot: bool('Session only: download snapshot instead of the base PDF') }, required: ['file_id'] } },
  { name: 'bluebeam_snapshot', description: 'Create a snapshot of a Session file (merges markups into the PDF), poll until Complete, optionally download it.', inputSchema: { type: 'object', properties: { session_id: str(), file_id: str(), dest_path: str('If set, download the snapshot PDF here'), wait_seconds: num('Default 180') }, required: ['session_id', 'file_id'] } },
  { name: 'bluebeam_markups', description: 'Get markups on a Session file (v2 Markups API). details=false returns the summary list (subject, type, author, status, page, label, comments, x/y, length...). details=true returns full annotation data (paginated). Optionally write CSV/JSON.', inputSchema: { type: 'object', properties: { session_id: str(), file_id: str(), details: bool('Default false'), csv_path: str('Write CSV here'), json_path: str('Write JSON here'), max_inline: num('Max rows to return inline (default 200); the rest only go to files') }, required: ['session_id', 'file_id'] } },
  { name: 'bluebeam_set_markup_status', description: 'Set the status of a Session markup (e.g. Model "Review", State "Accepted"). Use bluebeam_request GET /publicapi/v2/sessions/{s}/files/{f}/statuses to list valid Model/State pairs.', inputSchema: { type: 'object', properties: { session_id: str(), file_id: str(), markup_id: str(), model: str(), state: str() }, required: ['session_id', 'file_id', 'markup_id', 'model', 'state'] } },
  { name: 'bluebeam_invite', description: 'Invite (email invite, works for people without a Studio account) or add (existing Studio account) a user to a Session or Project.', inputSchema: { type: 'object', properties: { session_id: str(), project_id: str(), email: str(), mode: { type: 'string', enum: ['invite', 'add'], description: 'invite = email invitation; add = add known account directly (sessions and projects)' }, message: str(), send_email: bool('For add mode. Default true') }, required: ['email'] } },
  { name: 'bluebeam_finalize_session', description: 'Finalize a Session (removes attendees, PUT Status=Finalizing). Pass delete=true to also delete it after you have downloaded snapshots.', inputSchema: { type: 'object', properties: { session_id: str(), delete: bool('Also DELETE the session afterwards. Default false') }, required: ['session_id'] } },
];

async function call(name, a = {}) {
  switch (name) {
    case 'bluebeam_status': return bb.status();
    case 'bluebeam_configure': { const patch = {}; for (const k of ['client_id', 'client_secret', 'region', 'redirect_uri', 'scopes', 'base_url', 'auth_base_url']) if (a[k] !== undefined) patch[k] = a[k]; if (a.pkce !== undefined) patch.pkce = String(a.pkce); bb.saveConfig(patch); return { saved: Object.keys(patch), ...bb.status() }; }
    case 'bluebeam_login': {
      const wait = a.wait_seconds ?? 240;
      if (wait === 0) { const { url, state, code_verifier } = bb.buildAuthorizeUrl(); bb.savePendingLogin({ state, code_verifier, created: Date.now() }); return { open_this_url: url, next: 'User signs in with BBID and clicks Allow Access. Browser lands on the redirect_uri (may show a connection error, that is OK). Ask the user to paste the full URL from the address bar, then call bluebeam_login_complete.' }; }
      let shown; const r = await bb.login({ timeoutMs: wait * 1000, onUrl: (u) => { shown = u; } });
      return { ...r, url: shown };
    }
    case 'bluebeam_login_complete': return bb.completeLogin(a.code_or_url);
    case 'bluebeam_logout': bb.clearTokens(); return { logged_out: true };
    case 'bluebeam_request': return bb.api(a.method, a.path, { query: a.query, body: a.body });
    case 'bluebeam_api_search': return bb.searchSpec(a.keywords, { limit: a.limit || 15 });
    case 'bluebeam_list_projects': return (await bb.apiAll('/publicapi/v1/projects', { key: 'Projects', query: { searchTerm: a.search } })).map(({ Id, Name, OwnerEmail, Created, Restricted, InviteUrl }) => ({ Id, Name, OwnerEmail, Created, Restricted, InviteUrl }));
    case 'bluebeam_list_sessions': { const items = await bb.apiAll('/publicapi/v1/sessions', { key: 'Sessions', query: { includeDeleted: a.include_deleted } }); const f = a.search ? items.filter((s) => s.Name?.toLowerCase().includes(a.search.toLowerCase())) : items; return f.map(({ Id, Name, Status, OwnerEmail, Created, SessionEndDate, Restricted, InviteUrl }) => ({ Id, Name, Status, OwnerEmail, Created, SessionEndDate, Restricted, InviteUrl })); }
    case 'bluebeam_create_session': return bb.createSession({ name: a.name, restricted: a.restricted ?? true, notification: a.notification ?? true, endDate: a.end_date, permissions: a.permissions || 'review' });
    case 'bluebeam_session_files': return bb.apiAll(`/publicapi/v1/sessions/${a.session_id}/files`, { key: 'Files' });
    case 'bluebeam_project_items': return bb.api('GET', `/publicapi/v1/projects/${a.project_id}/folders/${a.folder_id ?? 0}/items`, { query: { limit: 500 } });
    case 'bluebeam_upload_file': if (a.session_id) return bb.uploadSessionFile(a.session_id, a.local_path, { name: a.name, source: a.source }); if (a.project_id) return bb.uploadProjectFile(a.project_id, a.local_path, { name: a.name, parentFolderId: a.folder_id ?? 0 }); throw new Error('Give session_id or project_id');
    case 'bluebeam_download_file': if (a.session_id) return bb.downloadSessionFile(a.session_id, a.file_id, a.dest_path, { snapshot: Boolean(a.snapshot) }); if (a.project_id) return bb.downloadProjectFile(a.project_id, a.file_id, a.dest_path); throw new Error('Give session_id or project_id');
    case 'bluebeam_snapshot': return bb.snapshotSessionFile(a.session_id, a.file_id, { dest: a.dest_path, waitMs: (a.wait_seconds || 180) * 1000 });
    case 'bluebeam_markups': { const rows = await bb.getMarkups(a.session_id, a.file_id, { details: Boolean(a.details) }); const fs = await import('node:fs'); if (a.csv_path) fs.writeFileSync(a.csv_path, bb.toCsv(rows)); if (a.json_path) fs.writeFileSync(a.json_path, JSON.stringify(rows, null, 2)); const max = a.max_inline ?? 200; return { count: rows.length, csv_path: a.csv_path, json_path: a.json_path, markups: rows.slice(0, max), truncated: rows.length > max }; }
    case 'bluebeam_set_markup_status': return bb.api('PUT', `/publicapi/v2/sessions/${a.session_id}/files/${a.file_id}/markups/${a.markup_id}/status`, { body: { Model: a.model, State: a.state } });
    case 'bluebeam_invite': { const base = a.session_id ? `/publicapi/v1/sessions/${a.session_id}` : a.project_id ? `/publicapi/v1/projects/${a.project_id}` : null; if (!base) throw new Error('Give session_id or project_id'); if ((a.mode || 'invite') === 'invite') return bb.api('POST', `${base}/invite`, { body: { Email: a.email, Message: a.message } }); return bb.api('POST', `${base}/users`, { body: { Email: a.email, SendEmail: a.send_email !== false, Message: a.message } }); }
    case 'bluebeam_finalize_session': { const r = await bb.api('PUT', `/publicapi/v1/sessions/${a.session_id}`, { body: { Status: 'Finalizing' } }); if (a.delete) { await bb.api('DELETE', `/publicapi/v1/sessions/${a.session_id}`); return { finalized: true, deleted: true }; } return { finalized: true, session: r }; }
    default: throw new Error(`Unknown tool ${name}`);
  }
}

// ---- JSON-RPC plumbing ----
const send = (msg) => process.stdout.write(JSON.stringify(msg) + '\n');
const text = (obj) => ({ content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) }] });
async function handle(req) {
  const { id, method, params } = req;
  if (method === 'initialize') return send({ jsonrpc: '2.0', id, result: { protocolVersion: params?.protocolVersion || PROTOCOL, capabilities: { tools: {} }, serverInfo: { name: 'bluebeam', version: '1.0.2' }, instructions: 'Bluebeam Studio API tools. If a call fails with "Not logged in" or "not configured", run bluebeam_status, then bluebeam_configure / bluebeam_login. Use bluebeam_api_search to discover endpoints before bluebeam_request.' } });
  if (method === 'notifications/initialized' || method?.startsWith('notifications/')) return;
  if (method === 'ping') return send({ jsonrpc: '2.0', id, result: {} });
  if (method === 'tools/list') return send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
  if (method === 'tools/call') {
    try { const r = await call(params.name, params.arguments || {}); return send({ jsonrpc: '2.0', id, result: text(r) }); }
    catch (e) { return send({ jsonrpc: '2.0', id, result: { ...text(`Error: ${e.message}${e.body ? '\n' + JSON.stringify(e.body, null, 2) : ''}`), isError: true } }); }
  }
  if (id !== undefined) send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
}
let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk; let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
    if (!line) continue;
    let msg; try { msg = JSON.parse(line); } catch { send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); continue; }
    handle(msg).catch((e) => send({ jsonrpc: '2.0', id: msg.id ?? null, error: { code: -32603, message: e.message } }));
  }
});
process.stdin.on('end', () => process.exit(0));
