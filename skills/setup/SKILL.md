---
name: setup
description: Configure the Bluebeam plugin - walk the user through the Developer Portal app settings (region, redirect URI, client ID/secret), save them, and complete the OAuth login. Use when the user says "set up bluebeam", "connect bluebeam", "bluebeam login", or any Bluebeam tool reports "not configured" / "Not logged in".
argument-hint: "[client_id] [client_secret] [region]"
---

# Bluebeam setup

Goal: a working login so every `bluebeam_*` tool and `bb` command succeeds. Arguments (optional, in order): `$ARGUMENTS` = client_id client_secret region.

The CLI is at `${CLAUDE_PLUGIN_ROOT}/bin/bb.mjs`. Run it as `node "${CLAUDE_PLUGIN_ROOT}/bin/bb.mjs" ...`. The MCP tools (`bluebeam_status`, `bluebeam_configure`, `bluebeam_login`, `bluebeam_login_complete`) do the same things; prefer the MCP tools when they are available, fall back to the CLI.

## Steps

1. **Check current state**: call `bluebeam_status` (or `bb config show`). If `configured` and `logged_in` are both true and `access_token_valid` or `has_refresh_token`, run `bb whoami` and stop: already set up.

2. **Make sure the Developer Portal app is right.** Tell the user exactly this (short, as a checklist), unless they already gave you a client ID and secret:
   - Open https://developers.bluebeam.com and sign in with your BBID (Core/Complete/Max plan required; Basics is not eligible).
   - My Apps. Open your app (or Create Application: name, description, Region, Redirect URL).
   - Region must match your Studio account region: US, DE, AU, UK or SE. Tell me which.
   - Redirect URL(s) must include `http://localhost:8765/callback`. Add it with the Edit action if missing. If port 8765 is taken on this machine, pick another port and register that instead.
   - Grant types: Authorization Code and Refresh Token (Bluebeam supports only these; no client-credentials/machine login exists).
   - Click the app row to open its detail page; copy the Client ID and Client Secret.
   - While the app is in Sandbox only the owning BBID can log in. Other users need Production Approval (button on the app detail page, 5 business day review).

3. **Save credentials**: `bluebeam_configure` with client_id, client_secret, region (and redirect_uri if not default), or
   `node "${CLAUDE_PLUGIN_ROOT}/bin/bb.mjs" config set client_id=... client_secret=... region=us`.
   Never echo the secret back; the status output masks it.

4. **Log in**.
   - Normal (Claude Code runs on the user's own machine): call `bluebeam_login` (waits up to 4 minutes) or run `bb auth login`. Show the user the URL; they open it in their browser. The callback completes the login automatically.
   - Remote / cloud / headless (browser cannot reach localhost on the machine running Claude): call `bluebeam_login` with `wait_seconds: 0` (or `bb auth login --manual`), give the user the URL, and tell them: sign in, click Allow Access, the browser will land on a localhost page that fails to load, copy the entire URL from the address bar and paste it here. Then call `bluebeam_login_complete` with that URL (or `bb auth code "<url>"`). Authorization codes expire after 5 minutes, so do this promptly.

5. **Verify**: `bb whoami` (GET /publicapi/v1/users/me) and `bb sessions list`. Report DisplayName/Email and the count of sessions and projects.

## Troubleshooting

- `redirect_uri mismatch` / `invalid_request` at the Bluebeam login page: the redirect URI saved here is not on the app. Compare `bluebeam_status.redirect_uri` with the portal, fix one side.
- `401` after login: wrong region (token issued by one regional instance does not work on another) or missing scopes. Default scopes: `full_user jobs offline_access`. `read_prime` is read-only.
- `invalid_client`: client secret wrong or app deleted. Re-copy from the portal.
- Login works for you but not a colleague: app is in Sandbox; request Production Approval.
- "Could not listen on http://localhost:8765/callback": port busy. `bb config set redirect_uri=http://localhost:8790/callback`, add the same URI in the portal.
- Refresh token expired (unused 7+ days): just log in again.
- Login succeeds but every data call 401/404s, or the portal says your (sandbox) app's data host differs from the OAuth host: set them separately, e.g. `bb config set base_url=https://studioapi.bluebeam.com auth_base_url=https://api.bluebeam.com` (or `bluebeam_configure` with the same keys). Test with `bb whoami` against each host before settling.
- The MCP server's `/plugin configure` values override `bb config set` values. Keep region and redirect URI empty in `/plugin configure` unless you want them to win.
