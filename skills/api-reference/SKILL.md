---
name: api-reference
description: Bluebeam Studio REST API knowledge - auth model, regions, required headers, every endpoint (projects, folders, files, sessions, markups v2, webhooks, PDF jobs) with request/response fields. Use whenever building or debugging a call to api.bluebeam.com, choosing an endpoint, or when bluebeam_request/bb api needs the right path and body.
user-invocable: false
---

# Bluebeam Studio API reference

Full endpoint list with fields: `reference/api-endpoints.md` in this skill folder (generated from the portal's OpenAPI document). For live lookup use the `bluebeam_api_search` tool or `node "${CLAUDE_PLUGIN_ROOT}/bin/bb.mjs" search <keywords>`.

## Essentials

- Base URL by region: US `https://api.bluebeam.com`, DE `https://api.bluebeamstudio.de`, AU `https://api.bluebeamstudio.com.au`, UK `https://api.bluebeamstudio.co.uk`, SE `https://api.bluebeamstudio.se`. The plugin picks it from `region`.
- Every request: `Authorization: Bearer <access_token>` (capital B) AND `client_id: <client id>` header. JSON bodies: `Content-Type: application/json`. HTTPS only.
- OAuth 2.0 Authorization Code only (plus refresh_token grant). Authorize `GET /oauth2/authorize?response_type=code&client_id&redirect_uri&scope&state`; token `POST /oauth2/token` (form-encoded). Scopes: `read_prime`, `full_user`, `jobs`, `offline_access` (needed for a refresh_token). Codes last 5 min, access tokens 60 min, refresh tokens expire after 7 idle days; refreshing returns a new refresh token (Basic auth header `client_id:client_secret`, body `grant_type=refresh_token&refresh_token=`). The plugin handles all of this; `bluebeam_request` / `bb api` just need method, path, query, body.
- Field names are PascalCase in v1 (`Name`, `Id`, `TotalCount`), camelCase in v2 markups/webhooks (`markupId`, `callbackURI`).
- Lists are paginated with `offset` and `limit`, and return `{ <Items>: [...], TotalCount }`. `bb` and the MCP list tools already page through everything.
- Common codes: 204 success with no body (most POST/PUT/DELETE), 401 token expired or wrong region/scope, 403 no permission on that project/session, 404 wrong id, 409 conflict (e.g. file locked/checked out).
- IDs: Session Id is a 9-digit string like `123-456-789`; Project Id is also a string; file/folder/markup ids are integers; project root folder id is `0`.

## Endpoint families (v1 unless noted)

- Users: `GET /publicapi/v1/users/me`.
- Projects: `GET|POST /publicapi/v1/projects`, `GET|PUT|DELETE /projects/{id}`, users `/projects/{projectId}/users[/{id}]`, `invite`, `permissions`, `users/{userId}/permissions`, `sharedlinks[/{id}]`.
- Project folders: `/projects/{projectId}/folders`, `/folders/{id}`, `/folders/{id}/items` (files+folders in a folder; 0 = root), `/folders/{folderId}/permissions`.
- Project files: `/projects/{projectId}/files` (GET all recursive, POST metadata -> `UploadUrl`), `/files/by-path?path=`, `/files/{id}` (GET has `DownloadUrl`; PUT rename/move via `ParentFolderId`), `checkout`, `checkin` (-> `UploadUrl`) + `confirm-checkin`, `DELETE checkout` (revoke), `checkout-to-session` (`SessionId`), `confirm-upload`, `copy`, `revisions[/{id}[/restore]]`.
- Project file jobs (PDF processing, scope `jobs`): `POST /projects/{projectId}/files/{fileId}/jobs/<job>` with `{ Options, OutputFileName, OutputPath, Priority, CurrentPassword }` -> `{ Id }`; poll `GET /publicapi/v1/jobs/{id}`, results `/jobs/{id}/results`. Jobs: flatten, unflatten, exportmarkups, importmarkups, markuplist(+GET /{jobId}), pagecount, pagesize, pagerotation, rotatepage, deletepages, extractpages, insertpages, insertblankpages, replacepages, reversepages, splitpages, combine, balancepages, stamp, headerandfooter, reducefilesize, repair, saveaspdfa, createpdfareport, pdfsecurity, openpassword, processcolors, fileproperties, fileproperty, filepropertyvalue, exportformdata, exportcustomcolumns, importcustomcolumns, dwg2pdf, excel2pdf, word2pdf, image2pdf, ps2pdf.
- Sessions: `GET|POST /publicapi/v1/sessions`, `GET|PUT|DELETE /sessions/{id}` (PUT `Status: "Finalizing"` to end; `Name`, `Restricted`, `Notification`, `SessionEndDate`, `OwnerEmailOrId`), `activities`, `permissions`, users `/sessions/{sessionId}/users[/{id}]`, `invite`, `users/{userId}/permissions`.
- Session files: `/sessions/{sessionId}/files` (GET list; POST `{Name*, Source*, Size, CRC}` -> `UploadUrl`), `/files/{id}` (GET has `DownloadUrl`, `SnapshotDownloadUrl`, `Status`), `confirm-upload`, `checkin` (push session copy back to its Project file, `{Comment}`), `snapshot` (POST start, GET status `NoSnapshot|Requested|InProgress|Complete|Error` + `DownloadUrl`).
- Markups (v2): `GET /publicapi/v2/sessions/{sessionId}/files/{fileId}/markups` (summary rows), `/markups/details?offset&limit` (full annotation data), `GET /statuses` (valid `{Model, State}` pairs), `PUT /markups/{markupId}/status` `{Model, State}`.
- Webhooks (v2): `GET|POST|PUT /publicapi/v2/subscriptions` (`{callbackURI*, resourceId*, sourceType*}`; sourceType is Project or Session), `GET|DELETE /subscriptions/{subscriptionId}`.
- Misc: `GET /publicapi/v1/healthcheck`, `GET /publicapi/api/version`.

## File upload/download pattern

Upload = 3 calls: POST metadata (get `Id`, `UploadUrl`, `UploadContentType`), `PUT` the bytes to `UploadUrl` with headers `Content-Type: <UploadContentType>` and `x-amz-server-side-encryption: AES256` (URL valid 10 min), then POST `confirm-upload` (or `confirm-checkin` for a check-in). Sessions accept PDF only, not PDF/A. Download = GET the file metadata and fetch its `DownloadUrl` (pre-signed, no auth header). `bluebeam_upload_file` / `bluebeam_download_file` / `bb upload|download` implement this.
