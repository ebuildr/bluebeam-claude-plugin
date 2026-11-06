---
name: sessions
description: Run Bluebeam Studio Session workflows - create a review session, upload PDFs, invite or add attendees, check attendees and files, snapshot marked-up PDFs, finalize/close and download results, or link Project files into a Session. Use when the user mentions a Studio Session, session ID (123-456-789), inviting reviewers, or getting marked-up drawings back.
argument-hint: "[session id or name]"
allowed-tools: Bash(node *) mcp__plugin_bluebeam_bluebeam__*
---

# Studio Sessions

Tools: `bluebeam_list_sessions`, `bluebeam_create_session`, `bluebeam_session_files`, `bluebeam_upload_file`, `bluebeam_invite`, `bluebeam_snapshot`, `bluebeam_download_file`, `bluebeam_finalize_session`, `bluebeam_request`. CLI equivalent: `node "${CLAUDE_PLUGIN_ROOT}/bin/bb.mjs" sessions ...`. Background: `../api-reference/reference/session-lifecycle.md`.

If any tool says not configured / not logged in, run the `setup` skill first.

## Recipes

**Find a session**: `bluebeam_list_sessions` (optionally `search`). Show Id, Name, Status, OwnerEmail, SessionEndDate. Ask which one only if several match.

**Start a review**:
1. `bluebeam_create_session` with name, `restricted: true`, `end_date` if given, `permissions: review` (attendees can mark up, alert, save and print; cannot add documents). Use `open` to let attendees add documents, `readonly` for view-only.
2. For each PDF: `bluebeam_upload_file` with `session_id` and `local_path` (PDF only; PDF/A fails). Report the file Id returned.
3. For each person: `bluebeam_invite` mode `invite` (email, works without an account) or `add` (existing Studio users, immediate). Include a short message if the user gave one.
4. Report the session Id, the InviteUrl from `bluebeam_request GET /publicapi/v1/sessions/{id}`, files uploaded, people invited.

**Status check**: `bluebeam_session_files` and `bluebeam_request GET /publicapi/v1/sessions/{id}/users` (attendee Status), `GET /publicapi/v1/sessions/{sessionId}/activities` for recent activity.

**Get marked-up PDFs back (session stays open)**: for each file `bluebeam_snapshot` with `dest_path`. Snapshots merge markups into the PDF; they can take a minute or two for big sheets.

**Close out**: 1) `bluebeam_finalize_session` (Status Finalizing, attendees removed); 2) snapshot and download every file as above; 3) only after confirming downloads succeeded, and only if the user asked to delete, `bluebeam_finalize_session` with `delete: true` (or `bluebeam_request DELETE /publicapi/v1/sessions/{id}`). Deleting is irreversible: confirm with the user first.

**Project <-> Session round trip**: `bluebeam_request POST /publicapi/v1/projects/{projectId}/files/{fileId}/checkout-to-session` body `{ "SessionId": "123-456-789" }` puts a Project PDF in the Session; when done `POST /publicapi/v1/sessions/{sessionId}/files/{fileId}/checkin` body `{ "Comment": "..." }` writes the marked-up copy back as a new Project revision.

**Change session settings**: `bluebeam_request PUT /publicapi/v1/sessions/{id}` with any of `Name`, `Restricted`, `Notification`, `SessionEndDate`, `OwnerEmailOrId`. Attendee permissions: `GET|PUT /publicapi/v1/sessions/{sessionId}/permissions` and per user `.../users/{userId}/permissions`.

Keep output compact: tables of Id/Name/Status, never dump raw JSON longer than ~30 lines unless asked.
