# Bluebeam authentication and Developer Portal notes (from support.bluebeam.com/developer, 2026-11-06)

## Portal (developers.bluebeam.com)
- Login with BBID via Okta. Access is automatic with an active Core, Complete or Max subscription in US, AU, DE, UK or SE. Basics plan is not eligible. Software partners request access via Bluebeam Partnerships.
- All new apps start in Sandbox. Sandbox credentials stay the same when promoted to Production. In Sandbox only the owning account can authenticate through the app. Rate limits change on promotion.
- Create Application form: Application name (<= 90 chars), Description (<= 300), Region (API instance: US/DE/AU/UK/SE), Redirect URL(s) (comma separated or Enter; paginated list). Grant types offered: Authorization Code, Refresh Token.
- After creating, you get a MuleSoft "Application registration approved" email: ignore it.
- My Apps table columns: Name, Client ID, Environment (Sandbox/Pending/Production), Created Date, Region, Actions (edit, delete, view credentials, request Production Approval). Click a row for the detail page with Client ID and Client Secret.
- API docs have endpoint search and an in-browser Test Request panel. Markups API endpoints are out of beta for all developers.
- Production approval: app detail page > Request Production Approval > form > disclaimer > Submit > Confirm. Status Pending; Integrations Partnerships team replies within 5 business days with PRODUCTION / PENDING / SANDBOX.
- Postman testing: redirect URI `https://oauth.pstmn.io/v1/callback`, Auth URL `https://api.bluebeam.com/oauth2/authorize`, Access Token URL `https://api.bluebeam.com/oauth2/token`, client authentication "send client credentials in body", minimum scope `offline_access`.

## OAuth 2.0
- Authorization endpoint: `GET {base}/oauth2/authorize` with `response_type=code`, `client_id`, `redirect_uri`, `scope` (space separated), `state`.
- Callback: `{redirect_uri}?code=...&state=...` or `?error=...`. Code valid 5 minutes.
- Token endpoint: `POST {base}/oauth2/token`, form-encoded: `grant_type=authorization_code`, `code`, `client_id`, `client_secret`, `redirect_uri`, `scope`. Response: `token_type` (Bearer), `expires_in` (3600), `access_token` (JWT), `refresh_token`, `scope`. The OpenAPI document also lists `code_verifier` (PKCE) as an optional token parameter.
- Refresh: `POST {base}/oauth2/token` with header `Authorization: Basic base64(client_id:client_secret)` and body `grant_type=refresh_token&refresh_token=...`. Returns a new access token and a new refresh token. Refresh tokens stay valid as long as they are used at least once every 7 days.
- API calls: `Authorization: Bearer <access_token>` (capital B) and `client_id` header. 401 after a valid token means expired token, wrong scopes, or wrong regional base URL. Support contact: integrations@bluebeam.com.
- Scopes: `read_prime` read-only Projects/Sessions reporting; `full_user` full access to user-owned Projects/Sessions; `jobs` automated Jobs in Projects; `offline_access` to receive a refresh_token.
