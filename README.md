# Bluebeam Studio plugin for Claude Code

Talk to Bluebeam Studio (Projects, Sessions, files, markups, PDF jobs, webhooks) from Claude Code, using the official Bluebeam Studio REST API with OAuth 2.0. No npm install needed: Node 18+ only.

What's inside

| Piece | Path | Purpose |
|---|---|---|
| MCP server | `server/mcp.mjs` | 19 tools (`bluebeam_login`, `bluebeam_request`, `bluebeam_markups`, `bluebeam_upload_file`, ...) |
| CLI | `bin/bb.mjs` | Same functionality from the shell: `node bin/bb.mjs help` |
| Skills | `skills/*` | `/bluebeam:setup`, plus knowledge skills for sessions, projects, markups and the API reference |
| Spec | `spec/bluebeam-studio-api.json` | The OpenAPI 3.0.1 spec published in the Bluebeam Developer Portal (99 endpoints), searchable via `bluebeam_api_search` |

## Install

Try it for one session:

```bash
claude --plugin-dir /path/to/bluebeam-claude-plugin
```

Install permanently (this repo is also a one-plugin marketplace):

```bash
claude plugin marketplace add /path/to/bluebeam-claude-plugin   # or a GitHub URL / owner/repo
claude plugin install bluebeam@ebuildr-plugins
```

Then in Claude Code run `/bluebeam:setup`.

## Bluebeam Developer Portal: what your app needs

1. Sign in at https://developers.bluebeam.com with your BBID (needs an active Core, Complete or Max plan).
2. My Apps > your app (or Create Application). Make sure:
   - Region matches where your Studio account lives (US, DE, AU, UK, SE). The plugin's `region` setting must match.
   - Redirect URL(s) includes `http://localhost:8765/callback` (add it; Enter or comma separated). Keep `https://oauth.pstmn.io/v1/callback` if you also use Postman.
   - Grant types: Authorization Code and Refresh Token (the only ones Bluebeam offers).
3. Click the app row to open its detail page and copy Client ID and Client Secret.
4. Sandbox apps only allow the account that owns the app to log in. Request Production Approval from the app detail page when other users need access.

## Configure and log in

```bash
node bin/bb.mjs config set client_id=YOUR_ID client_secret=YOUR_SECRET region=us
node bin/bb.mjs auth login            # opens browser, waits for the callback on localhost:8765
node bin/bb.mjs whoami
```

Headless or remote machine (the browser cannot reach localhost on the machine running Claude):

```bash
node bin/bb.mjs auth login --manual   # prints the URL
# sign in, click Allow Access, copy the full URL the browser lands on, then:
node bin/bb.mjs auth code "http://localhost:8765/callback?code=...&state=..."
```

Config and tokens live in `~/.config/bluebeam-claude/` (override with `BLUEBEAM_CONFIG_DIR`). Values set with `/plugin configure bluebeam@ebuildr-plugins` (client ID, secret in secure storage, region, redirect URI) take precedence for the MCP server, then env vars `BLUEBEAM_CLIENT_ID`, `BLUEBEAM_CLIENT_SECRET`, `BLUEBEAM_REGION`, `BLUEBEAM_REDIRECT_URI`, `BLUEBEAM_SCOPES`, then the config file. If OAuth and data calls live on different hosts (some sandbox apps), set `base_url` (API) and `auth_base_url` (OAuth) separately with `bb config set`. Access tokens last 60 minutes and are refreshed automatically; refresh tokens die if unused for 7 days.

## Quick examples

```bash
node bin/bb.mjs sessions list
node bin/bb.mjs sessions create --name "Addendum 3 review" --end 2026-12-15
node bin/bb.mjs upload --session 123-456-789 ./A101.pdf
node bin/bb.mjs sessions invite 123-456-789 someone@example.com
node bin/bb.mjs markups 123-456-789 4567890 --csv markups.csv
node bin/bb.mjs snapshot 123-456-789 4567890 --out A101-marked.pdf
node bin/bb.mjs projects list
node bin/bb.mjs api GET /publicapi/v1/projects/{id}/folders/0/items
node bin/bb.mjs search "webhook subscription"
```

## Test

```bash
node test/run.mjs   # spins up a mock Bluebeam API on localhost and exercises CLI + MCP end to end
```

Sources: Bluebeam Authentication Guide, Get started in the Developer Portal, Studio Session Guide (support.bluebeam.com/developer) and the OpenAPI document served by developers.bluebeam.com, captured 2026-11-06.
