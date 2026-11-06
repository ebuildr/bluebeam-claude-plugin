#!/usr/bin/env node
// bb — Bluebeam Studio API command line, used by the bluebeam Claude Code plugin skills.
import fs from 'node:fs';
import * as bb from '../lib/bluebeam.mjs';

const argv = process.argv.slice(2);
const flags = {}; const pos = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) { const [k, v] = a.slice(2).split(/=(.*)/s); if (v !== undefined) flags[k] = v; else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) flags[k] = argv[++i]; else flags[k] = true; }
  else pos.push(a);
}
const out = (x) => { process.stdout.write((typeof x === 'string' ? x : JSON.stringify(x, null, 2)) + '\n'); };
const die = (m) => { process.stderr.write(`error: ${m}\n`); process.exit(1); };
const parseBody = (s) => { if (s === undefined) return undefined; if (s.startsWith('@')) s = fs.readFileSync(s.slice(1), 'utf8'); try { return JSON.parse(s); } catch { die('--body must be JSON (or @file.json)'); } };
const kv = (arr) => Object.fromEntries((Array.isArray(arr) ? arr : [arr]).filter(Boolean).map((s) => { const [k, v] = String(s).split(/=(.*)/s); return [k, v ?? ''];
}));

const HELP = `bb — Bluebeam Studio API CLI (zero dependencies)

Setup / auth
  bb config show                              show config (secret masked) and file locations
  bb config set client_id=... client_secret=... [region=us|de|au|uk|se] [redirect_uri=...] [scopes="full_user jobs offline_access"] [base_url=https://...] [auth_base_url=https://...] [pkce=true|false]
                                              base_url = API host (default from region); auth_base_url = OAuth host if different (default = base_url)
  bb auth login [--manual] [--timeout 300]   OAuth login: prints the URL to open, waits for the localhost callback; --manual = URL only (then: bb auth code)
  bb auth code "<pasted redirect URL or code>"             finish a manual login
  bb auth status | bb auth refresh | bb auth logout
  bb whoami                                   GET /publicapi/v1/users/me

Generic
  bb api <GET|POST|PUT|DELETE> <path> [--query k=v ...] [--body '<json>' | --body @file.json]
  bb search <keywords>                        search the bundled OpenAPI spec (methods, params, body/response fields)

Sessions
  bb sessions list [--all] [--search text]    bb sessions get <id>
  bb sessions create --name "..." [--restricted true] [--notification true] [--end 2026-12-31] [--perms review|open|readonly]
  bb sessions finalize <id>   (PUT Status=Finalizing)      bb sessions delete <id>
  bb sessions files <id>      bb sessions users <id>       bb sessions invite <id> <email> [--message ...]
  bb sessions adduser <id> <email> [--send-email true]
  bb upload --session <id> <file.pdf> [--name x.pdf] [--source origin]
  bb download --session <id> --file <fileId> [--out path] [--snapshot]
  bb snapshot <sessionId> <fileId> [--out path] [--wait 180]
  bb markups <sessionId> <fileId> [--details] [--csv out.csv] [--json out.json]
  bb markups statuses <sessionId> <fileId>    bb markups set-status <sessionId> <fileId> <markupId> --model <m> --state <s>

Projects
  bb projects list [--search text]   bb projects get <id>   bb projects create --name "..."
  bb projects files <projectId> [--folder 0]   (lists folder items; --folder 0 = root)
  bb projects file <projectId> <fileId> | bb projects by-path <projectId> "/Drawings/A101.pdf"
  bb upload --project <id> <file> [--folder 0] [--name x.pdf]
  bb download --project <id> --file <fileId> [--out path]
  bb projects checkout <projectId> <fileId> | checkin <projectId> <fileId> <localfile> [--comment ...] | revoke <projectId> <fileId>
  bb projects checkout-to-session <projectId> <fileId> <sessionId>
  bb jobs list | bb jobs get <id> | bb jobs run <projectId> <fileId> <jobname> --body '<json>'   (e.g. flatten, exportmarkups, pagecount)
`;

async function main() {
  const [cmd, sub, ...rest] = pos;
  switch (cmd) {
    case undefined: case 'help': case '--help': return out(HELP);
    case 'config': {
      if (sub === 'show') return out(bb.status());
      if (sub === 'set') { const cfg = bb.saveConfig(kv(rest)); return out({ saved: true, ...bb.status(), _cfg: undefined }); }
      if (sub === 'path') return out(bb.loadConfig()._source);
      return die('config show|set|path');
    }
    case 'auth': {
      if (sub === 'status') return out(bb.status());
      if (sub === 'logout') { bb.clearTokens(); return out({ logged_out: true }); }
      if (sub === 'refresh') { const t = await bb.refreshTokens(); return out({ refreshed: true, expires_at: new Date(t.expires_at).toISOString(), scope: t.scope }); }
      if (sub === 'url') return out(bb.buildAuthorizeUrl());
      if (sub === 'login') {
        if (flags.manual) { const { url, state, code_verifier } = bb.buildAuthorizeUrl(); bb.savePendingLogin({ state, code_verifier, created: Date.now() }); return out({ open_this_url: url, then: 'After you click Allow Access, the browser lands on your redirect_uri (it may show "can\'t connect"; that is fine). Copy the full URL from the address bar and run:  bb auth code "<that url>"' }); }
        const r = await bb.login({ timeoutMs: Number(flags.timeout || 300) * 1000, onUrl: (u) => process.stderr.write(`Open this URL in your browser to sign in to Bluebeam:\n${u}\n\nWaiting for the callback on the redirect URI...\n`) });
        return out(r);
      }
      if (sub === 'code') { if (!rest[0]) die('usage: bb auth code "<redirect url or code>"'); return out(await bb.completeLogin(rest[0])); }
      return die('auth login|code|status|refresh|logout|url');
    }
    case 'whoami': return out(await bb.api('GET', '/publicapi/v1/users/me'));
    case 'api': { if (!sub || !rest[0]) die('usage: bb api <METHOD> <path> [--query k=v] [--body json]'); return out(await bb.api(sub, rest[0], { query: flags.query ? kv(flags.query) : undefined, body: parseBody(flags.body) })); }
    case 'search': return out(bb.searchSpec([sub, ...rest].join(' '), { limit: Number(flags.limit || 15) }));
    case 'sessions': {
      const id = rest[0];
      switch (sub) {
        case 'list': { const q = { ownedOrAttending: flags.all ? undefined : undefined, orderby: flags.orderby }; const items = await bb.apiAll('/publicapi/v1/sessions', { query: q, key: 'Sessions' }); const f = flags.search ? items.filter((s) => s.Name?.toLowerCase().includes(String(flags.search).toLowerCase())) : items; return out(f.map(({ Id, Name, Status, OwnerEmail, Created, SessionEndDate, Restricted, InviteUrl }) => ({ Id, Name, Status, OwnerEmail, Created, SessionEndDate, Restricted, InviteUrl }))); }
        case 'get': return out(await bb.api('GET', `/publicapi/v1/sessions/${id}`));
        case 'create': return out(await bb.createSession({ name: flags.name, restricted: flags.restricted !== 'false', notification: flags.notification !== 'false', endDate: flags.end, permissions: flags.perms || 'review' }));
        case 'finalize': return out(await bb.api('PUT', `/publicapi/v1/sessions/${id}`, { body: { Status: 'Finalizing' } }));
        case 'update': return out(await bb.api('PUT', `/publicapi/v1/sessions/${id}`, { body: parseBody(flags.body) }));
        case 'delete': return out(await bb.api('DELETE', `/publicapi/v1/sessions/${id}`));
        case 'files': return out(await bb.apiAll(`/publicapi/v1/sessions/${id}/files`, { key: 'Files', query: { includeDeleted: flags['include-deleted'] } }));
        case 'users': return out(await bb.apiAll(`/publicapi/v1/sessions/${id}/users`, { key: 'SessionUsers' }));
        case 'invite': return out(await bb.api('POST', `/publicapi/v1/sessions/${id}/invite`, { body: { Email: rest[1], Message: flags.message } }));
        case 'adduser': return out(await bb.api('POST', `/publicapi/v1/sessions/${id}/users`, { body: { Email: rest[1], SendEmail: flags['send-email'] !== 'false', Message: flags.message } }));
        case 'permissions': return out(await bb.api('GET', `/publicapi/v1/sessions/${id}/permissions`));
        default: return die('sessions list|get|create|finalize|update|delete|files|users|invite|adduser|permissions');
      }
    }
    case 'upload': {
      const file = sub; if (!file) die('usage: bb upload --session <id> <file.pdf>  |  bb upload --project <id> <file> [--folder 0]');
      if (flags.session) return out(await bb.uploadSessionFile(flags.session, file, { name: flags.name, source: flags.source }));
      if (flags.project) return out(await bb.uploadProjectFile(flags.project, file, { name: flags.name, parentFolderId: flags.folder || 0 }));
      return die('specify --session <id> or --project <id>');
    }
    case 'download': {
      if (flags.session) return out(await bb.downloadSessionFile(flags.session, flags.file, flags.out, { snapshot: Boolean(flags.snapshot) }));
      if (flags.project) return out(await bb.downloadProjectFile(flags.project, flags.file, flags.out));
      return die('specify --session <id> --file <fileId> or --project <id> --file <fileId>');
    }
    case 'snapshot': { if (!sub || !rest[0]) die('usage: bb snapshot <sessionId> <fileId> [--out file.pdf]'); return out(await bb.snapshotSessionFile(sub, rest[0], { dest: flags.out, waitMs: Number(flags.wait || 180) * 1000 })); }
    case 'markups': {
      if (sub === 'statuses') return out(await bb.api('GET', `/publicapi/v2/sessions/${rest[0]}/files/${rest[1]}/statuses`));
      if (sub === 'set-status') return out(await bb.api('PUT', `/publicapi/v2/sessions/${rest[0]}/files/${rest[1]}/markups/${rest[2]}/status`, { body: { Model: flags.model, State: flags.state } }));
      if (!sub || !rest[0]) die('usage: bb markups <sessionId> <fileId> [--details] [--csv out.csv] [--json out.json]');
      const rows = await bb.getMarkups(sub, rest[0], { details: Boolean(flags.details) });
      if (flags.csv) fs.writeFileSync(flags.csv, bb.toCsv(rows));
      if (flags.json) fs.writeFileSync(flags.json, JSON.stringify(rows, null, 2));
      if (flags.csv || flags.json) return out({ count: rows.length, csv: flags.csv, json: flags.json });
      return out(rows);
    }
    case 'projects': {
      const id = rest[0];
      switch (sub) {
        case 'list': return out((await bb.apiAll('/publicapi/v1/projects', { key: 'Projects', query: { searchTerm: flags.search } })).map(({ Id, Name, OwnerEmail, Created, Restricted, InviteUrl }) => ({ Id, Name, OwnerEmail, Created, Restricted, InviteUrl })));
        case 'get': return out(await bb.api('GET', `/publicapi/v1/projects/${id}`));
        case 'create': return out(await bb.api('POST', '/publicapi/v1/projects', { body: { Name: flags.name, Restricted: flags.restricted !== 'false', Notification: flags.notification !== 'false' } }));
        case 'delete': return out(await bb.api('DELETE', `/publicapi/v1/projects/${id}`));
        case 'files': return out(await bb.api('GET', `/publicapi/v1/projects/${id}/folders/${flags.folder ?? 0}/items`, { query: { limit: 500, offset: flags.offset } }));
        case 'allfiles': return out(await bb.apiAll(`/publicapi/v1/projects/${id}/files`, { key: 'ProjectFiles' }));
        case 'folders': return out(await bb.apiAll(`/publicapi/v1/projects/${id}/folders`, { key: 'ProjectFolders' }));
        case 'mkdir': return out(await bb.api('POST', `/publicapi/v1/projects/${id}/folders`, { body: { Name: flags.name || rest[1], ParentFolderId: Number(flags.folder || 0) } }));
        case 'file': return out(await bb.api('GET', `/publicapi/v1/projects/${id}/files/${rest[1]}`));
        case 'by-path': return out(await bb.api('GET', `/publicapi/v1/projects/${id}/files/by-path`, { query: { path: rest[1] } }));
        case 'checkout': return out(await bb.api('POST', `/publicapi/v1/projects/${id}/files/${rest[1]}/checkout`));
        case 'revoke': return out(await bb.api('DELETE', `/publicapi/v1/projects/${id}/files/${rest[1]}/checkout`));
        case 'checkin': return out(await bb.checkinProjectFile(id, rest[1], rest[2], { comment: flags.comment || '' }));
        case 'checkout-to-session': return out(await bb.api('POST', `/publicapi/v1/projects/${id}/files/${rest[1]}/checkout-to-session`, { body: { SessionId: rest[2] } }));
        case 'users': return out(await bb.apiAll(`/publicapi/v1/projects/${id}/users`, { key: 'ProjectUsers' }));
        case 'invite': return out(await bb.api('POST', `/publicapi/v1/projects/${id}/invite`, { body: { Email: rest[1], Message: flags.message } }));
        default: return die('projects list|get|create|delete|files|allfiles|folders|mkdir|file|by-path|checkout|revoke|checkin|checkout-to-session|users|invite');
      }
    }
    case 'jobs': {
      if (sub === 'list') return out(await bb.api('GET', '/publicapi/v1/jobs', { query: { limit: flags.limit || 50, status: flags.status } }));
      if (sub === 'get') return out(await bb.api('GET', `/publicapi/v1/jobs/${rest[0]}`));
      if (sub === 'results') return out(await bb.api('GET', `/publicapi/v1/jobs/${rest[0]}/results`));
      if (sub === 'cancel') return out(await bb.api('PUT', `/publicapi/v1/jobs/${rest[0]}/cancel`));
      if (sub === 'run') { const [pid, fid, name] = rest; if (!name) die('usage: bb jobs run <projectId> <fileId> <jobname> --body json'); return out(await bb.api('POST', `/publicapi/v1/projects/${pid}/files/${fid}/jobs/${name}`, { body: parseBody(flags.body) ?? {} })); }
      return die('jobs list|get|results|cancel|run');
    }
    default: die(`unknown command "${cmd}". Run: bb help`);
  }
}
main().catch((e) => { process.stderr.write(`error: ${e.message}\n`); if (e.body && typeof e.body === 'object') process.stderr.write(JSON.stringify(e.body, null, 2) + '\n'); process.exit(1); });
