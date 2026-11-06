// Mock of the Bluebeam Studio API (auth + a few endpoints + S3-style upload URL) for local testing.
import http from 'node:http';
import crypto from 'node:crypto';
const PORT = Number(process.env.MOCK_PORT || 8990);
const state = { tokens: new Set(), refresh: new Set(), sessions: {}, files: {}, uploads: {}, log: [] };
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(obj === undefined ? '' : JSON.stringify(obj)); };
const body = (req) => new Promise((r) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => r(Buffer.concat(c))); });
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`); const p = u.pathname; const m = req.method;
  state.log.push(`${m} ${p}`);
  if (p === '/__log') return json(res, 200, state.log);
  if (p === '/oauth2/token' && m === 'POST') {
    const f = Object.fromEntries(new URLSearchParams((await body(req)).toString()));
    const basic = req.headers.authorization?.startsWith('Basic ') ? Buffer.from(req.headers.authorization.slice(6), 'base64').toString() : null;
    if (f.grant_type === 'authorization_code') {
      if (f.code !== 'GOODCODE' || f.client_id !== 'cid' || f.client_secret !== 'csecret' || f.redirect_uri !== 'http://localhost:8766/callback') return json(res, 400, { error: 'invalid_grant', error_description: 'bad code/creds/redirect' });
    } else if (f.grant_type === 'refresh_token') {
      if (basic !== 'cid:csecret') return json(res, 401, { error: 'invalid_client' });
      if (!state.refresh.has(f.refresh_token)) return json(res, 400, { error: 'invalid_grant' });
      state.refresh.delete(f.refresh_token);
    } else return json(res, 400, { error: 'unsupported_grant_type' });
    const at = 'AT' + crypto.randomBytes(6).toString('hex'); const rt = 'RT' + crypto.randomBytes(6).toString('hex');
    state.tokens.add(at); state.refresh.add(rt);
    return json(res, 200, { token_type: 'Bearer', expires_in: Number(process.env.MOCK_EXPIRES || 3600), access_token: at, refresh_token: rt, scope: f.scope || 'full_user offline_access' });
  }
  if (p.startsWith('/upload/')) { const buf = await body(req); state.uploads[p] = { len: buf.length, ct: req.headers['content-type'], sse: req.headers['x-amz-server-side-encryption'] }; res.writeHead(200); return res.end(); }
  if (p.startsWith('/download/')) { res.writeHead(200, { 'Content-Type': 'application/pdf' }); return res.end('%PDF-1.4 mock'); }
  // auth check
  const tok = (req.headers.authorization || '').replace('Bearer ', '');
  if (!state.tokens.has(tok) || tok === process.env.MOCK_REVOKED) return json(res, 401, { message: 'unauthorized' });
  if (req.headers.client_id !== 'cid') return json(res, 401, { message: 'client_id header missing' });
  if (p === '/publicapi/v1/users/me') return json(res, 200, { DisplayName: 'Mock User', Email: 'mock@example.com', UserId: 1 });
  if (p === '/publicapi/v1/sessions' && m === 'GET') { const all = Object.values(state.sessions); const off = Number(u.searchParams.get('offset') || 0), lim = Number(u.searchParams.get('limit') || 100); return json(res, 200, { Sessions: all.slice(off, off + lim), TotalCount: all.length }); }
  if (p === '/publicapi/v1/sessions' && m === 'POST') { const b = JSON.parse((await body(req)).toString()); const id = `${100 + Object.keys(state.sessions).length}-000-000`; state.sessions[id] = { Id: id, Name: b.Name, Status: 'Active', Restricted: b.Restricted, InviteUrl: 'https://studio.bluebeam.com/join/' + id, _perms: b.DefaultPermissions }; return json(res, 200, { Id: id }); }
  let mm;
  if ((mm = p.match(/^\/publicapi\/v1\/sessions\/([^/]+)$/))) { const s = state.sessions[mm[1]]; if (!s) return json(res, 404, { message: 'no session' }); if (m === 'GET') return json(res, 200, s); if (m === 'PUT') { Object.assign(s, JSON.parse((await body(req)).toString())); return json(res, 200, s); } if (m === 'DELETE') { delete state.sessions[mm[1]]; return json(res, 204); } }
  if ((mm = p.match(/^\/publicapi\/v1\/sessions\/([^/]+)\/files$/))) { if (m === 'POST') { const b = JSON.parse((await body(req)).toString()); const id = 5000 + Object.keys(state.files).length; state.files[id] = { Id: id, Name: b.Name, Source: b.Source, Size: b.Size, Status: 'Pending', DownloadUrl: `http://localhost:${PORT}/download/${id}` }; return json(res, 200, { Id: id, UploadUrl: `http://localhost:${PORT}/upload/${id}`, UploadContentType: 'application/pdf' }); } return json(res, 200, { Files: Object.values(state.files), TotalCount: Object.keys(state.files).length }); }
  if ((mm = p.match(/^\/publicapi\/v1\/sessions\/([^/]+)\/files\/(\d+)\/confirm-upload$/))) { const f = state.files[mm[2]]; if (!state.uploads['/upload/' + mm[2]]) return json(res, 409, { message: 'nothing uploaded' }); f.Status = 'Active'; return json(res, 204); }
  if ((mm = p.match(/^\/publicapi\/v1\/sessions\/([^/]+)\/files\/(\d+)\/snapshot$/))) { const f = state.files[mm[2]]; if (m === 'POST') { f._snap = Date.now(); return json(res, 204); } const done = Date.now() - (f._snap || 0) > 1500; return json(res, 200, { Status: f._snap ? (done ? 'Complete' : 'InProgress') : 'NoSnapshot', DownloadUrl: done ? `http://localhost:${PORT}/download/snap-${mm[2]}` : null }); }
  if ((mm = p.match(/^\/publicapi\/v1\/sessions\/([^/]+)\/files\/(\d+)$/))) return json(res, 200, state.files[mm[2]]);
  if ((mm = p.match(/^\/publicapi\/v2\/sessions\/([^/]+)\/files\/(\d+)\/markups$/))) return json(res, 200, [{ markupId: 1, subject: 'Cloud+', displayName: 'A', status: 'Open', pageNumber: 1, comments: 'fix "this", please' }, { markupId: 2, subject: 'Length', displayName: 'B', status: 'Accepted', pageNumber: 2, length: '12.5', unit: 'ft' }]);
  if ((mm = p.match(/^\/publicapi\/v2\/sessions\/([^/]+)\/files\/(\d+)\/markups\/details$/))) { const off = Number(u.searchParams.get('offset') || 0); return json(res, 200, off === 0 ? Array.from({ length: 200 }, (_, i) => ({ markupId: i, contents: 'c' + i })) : [{ markupId: 200, contents: 'last' }]); }
  json(res, 404, { message: 'mock: no route ' + m + ' ' + p });
});
server.listen(PORT, () => console.log('mock listening', PORT));
