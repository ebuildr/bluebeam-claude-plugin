---
name: projects
description: Work with Bluebeam Studio Projects - browse folders and files, upload/download, check out/in with revisions, invite users, manage permissions and shared links, and run server-side PDF jobs (flatten, export markups, page count, combine, stamp, convert DWG/Word/Excel to PDF). Use when the user mentions a Studio Project, project files/folders, document control, or batch PDF processing in Bluebeam.
argument-hint: "[project id or name]"
---

# Studio Projects

Tools: `bluebeam_list_projects`, `bluebeam_project_items`, `bluebeam_upload_file`, `bluebeam_download_file`, `bluebeam_invite`, `bluebeam_request`, `bluebeam_api_search`. CLI: `node "${CLAUDE_PLUGIN_ROOT}/bin/bb.mjs" projects ...` and `bb jobs ...`.

If a tool says not configured / not logged in, run the `setup` skill first. Project file operations need the `full_user` scope; jobs need `jobs`.

## Recipes

**Browse**: `bluebeam_list_projects` (search by name) then `bluebeam_project_items` with `folder_id: 0` for the root; recurse into `ProjectFolders` ids as needed. Whole tree flat: `bluebeam_request GET /publicapi/v1/projects/{projectId}/files?limit=500` (recursive, includes `Path`, `IsLocked`, `LockOwnerEmail`, `InSession`). By path: `GET /publicapi/v1/projects/{projectId}/files/by-path?path=/Drawings/A101.pdf`.

**Upload**: `bluebeam_upload_file` with `project_id`, `local_path`, `folder_id` (0 root). Any file type is accepted in Projects. Create folders with `bluebeam_request POST /publicapi/v1/projects/{projectId}/folders` body `{ "Name": "...", "ParentFolderId": 0 }`.

**Download**: `bluebeam_download_file` with `project_id`, `file_id`, `dest_path`.

**Revise a file (check out / check in)**: 1) `bluebeam_request POST .../files/{id}/checkout`; 2) edit locally; 3) CLI `bb projects checkin <projectId> <fileId> <localfile> --comment "..."` (does checkin -> PUT upload -> confirm-checkin). Undo a checkout: `DELETE .../files/{id}/checkout` (warns: conflicts in Revu if the owner had local changes). Revisions: `GET .../files/{fileId}/revisions`, restore `POST .../revisions/{id}/restore`.

**People and permissions**: `bluebeam_invite` with `project_id` (mode invite or add). `GET|PUT /publicapi/v1/projects/{projectId}/permissions` (allow/deny/default), per user `.../users/{userId}/permissions` (types include CreateSessions and others; check `bluebeam_api_search "project user permissions"`), per folder `.../folders/{folderId}/permissions` (Hidden, Read, ReadWrite, ...). Shared links: `GET|POST /publicapi/v1/projects/{projectId}/sharedlinks`.

**PDF jobs (server side, async)**: `bluebeam_request POST /publicapi/v1/projects/{projectId}/files/{fileId}/jobs/<job>` with body `{ "Options": {...}, "OutputFileName": "x.pdf", "OutputPath": "/Folder", "Priority": 0 }` -> `{ Id }`. Poll `GET /publicapi/v1/jobs/{id}` until Status is finished, then `GET /publicapi/v1/jobs/{id}/results`. Look up each job's Options with `bluebeam_api_search "<job>"` (e.g. `flatten`, `exportmarkups`, `markuplist`, `pagecount`, `combine` needs `Options.FileIDs`, `deletepages`/`extractpages` need `Options.PageRange`, `stamp`, `headerandfooter`, `dwg2pdf`, `word2pdf`, `excel2pdf`, `image2pdf`, `saveaspdfa`, `reducefilesize`, `pdfsecurity`). Query-type jobs (`pagecount`, `pagesize`, `pagerotation`, `markuplist`, `fileproperties`, `filepropertyvalue`) have a matching `GET .../jobs/<job>/{jobId}` to read the value.

**Webhooks**: `POST /publicapi/v2/subscriptions` `{ "callbackURI": "https://...", "resourceId": "<projectId or sessionId>", "sourceType": "Project" | "Session" }`; list/delete via `GET /publicapi/v2/subscriptions`, `DELETE /publicapi/v2/subscriptions/{subscriptionId}`.

Deleting projects, files or folders is irreversible: confirm with the user before any DELETE.
