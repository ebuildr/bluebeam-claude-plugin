---
name: markups
description: Pull, summarize, export and update Bluebeam Studio Session markups (annotations) - list markups on a session file, export to CSV/JSON, group by author/subject/status/page, set markup status (accept/reject/review), or export markups from Project PDFs via jobs. Use when the user asks about comments, redlines, punch items, markup lists, markup summaries, or review status in Bluebeam.
argument-hint: "<session id> <file id>"
allowed-tools: Bash(node *) mcp__plugin_bluebeam_bluebeam__*
---

# Markups

Tools: `bluebeam_markups`, `bluebeam_set_markup_status`, `bluebeam_session_files`, `bluebeam_request`. CLI: `node "${CLAUDE_PLUGIN_ROOT}/bin/bb.mjs" markups <sessionId> <fileId> [--details] [--csv out.csv] [--json out.json]`.

Markups via the REST API are available only for files inside a Studio Session (v2 Markups API). For a Project PDF, either check the file out to a Session (`checkout-to-session`) or run the `exportmarkups` / `markuplist` job (see the `projects` skill).

## Recipes

**Locate the file**: if the user gives only a session, `bluebeam_session_files` and pick the file (ask if several).

**Summary list** (default): `bluebeam_markups` with `details: false`. Each row has: markupId, subject, type, label, status, author `displayName`/`email`, `pageNumber`, `comments`, `layer`, `length`/`unit`/`scaleRatio` (measurements), `x`/`y`, `created`/`modified`, `parentName` (reply threads), `lock`. Good for counts, who-did-what, open items.

**Full detail**: `details: true` (paginated, large) returns geometry, colors, line styles, `contents`, `attachments`, caption data, custom columns. Use only when the user needs those fields. Always write to `json_path`/`csv_path` for big files and summarize inline.

**Export**: set `csv_path` (and/or `json_path`); the CSV is flat (nested arrays JSON-encoded). Tell the user the absolute path.

**Analyze**: typical asks are counts by `status`, by `displayName`, by `subject`/`type`, by `pageNumber`; open vs closed; measurement totals by `subject` (sum `length` when `unit` matches). Do the math from the JSON rows; show a small table.

**Change status**: first `bluebeam_request GET /publicapi/v2/sessions/{sessionId}/files/{fileId}/statuses` to see valid `{Model, State}` pairs (for example Model "Review" with States Accepted/Rejected/Cancelled/Completed, or custom models). Then `bluebeam_set_markup_status` per markup. Confirm with the user before bulk status changes.

**Markups report PDF**: not an API feature; instead `bluebeam_snapshot` produces the PDF with markups merged, and the CSV above serves as the markup list.
