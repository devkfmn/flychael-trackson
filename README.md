# Flychael Trackson

Paragliding flight log, equipment, maintenance and expenses. Vite + React PWA with Firebase Auth and Firestore. Production web app: [https://flychael-trackson.vercel.app](https://flychael-trackson.vercel.app).

User data lives under `users/{uid}`:

| Path | Meaning |
| --- | --- |
| `users/{uid}` | Profile / settings |
| `users/{uid}/equipment/{id}` | Gear (`paraglider`, `harness`, `reserve`, `other`; status `active`, `borrowed`, `sold`) |
| `users/{uid}/flights/{id}` | Flights (`dateISO`, `airtimeMinutes`, wing/harness ids, …) |
| `users/{uid}/expenses/{id}` | Extra costs (`amount`, `currency`, `category`, optional `equipmentId`) |

## MCP (Grok Bot / Cursor)

Stateless Streamable HTTP MCP at **`https://flychael-trackson.vercel.app/api/mcp`**. A Grok Bot or Cursor connector can log flights, gear and expenses while you are out flying. All reads and writes are scoped to a single owner (`MCP_USER_UID`).

The SPA is also configured for Firebase Hosting, but **`/api/mcp` only exists on Vercel**. Use the Vercel production URL above, not a `web.app` / `firebaseapp.com` host.

### Connect a Grok Bot or Cursor connector

- **URL:** `https://flychael-trackson.vercel.app/api/mcp`
- **Transport:** Streamable HTTP (stateless)
- **Header:** `Authorization: Bearer <MCP_TOKEN>`

Cursor example (`.cursor/mcp.json` or a Grok Bot connector):

```json
{
  "mcpServers": {
    "flychael-trackson": {
      "url": "https://flychael-trackson.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer <MCP_TOKEN>"
      }
    }
  }
}
```

Requests without a bearer token, or with the wrong token, receive `401 {"error":"unauthorized"}`.

### Env vars (set on the Vercel project)

Set these in the Vercel dashboard for project **flychael-trackson**, team **mysteriousflyingsquirrel's projects**, on **Production** and **Preview** (same pattern as tradex). Do not put them in `VITE_*` — they must stay server-side.

| Variable | Where | Purpose |
| --- | --- | --- |
| `MCP_TOKEN` | Vercel → Project → Settings → Environment Variables (Production + Preview), **Sensitive** | Bearer token. Generate a long random secret; Grok Bot / Cursor send it as `Authorization: Bearer …`. |
| `MCP_USER_UID` | Same | Firebase Auth uid of the owner (Andreas). Every tool reads/writes only `users/{MCP_USER_UID}/…`. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Same, **Sensitive** | Full JSON of a Firebase Admin service account keyed for project `flychael-trackson`. Firestore Admin access for that uid only in application code. |

`FIREBASE_STORAGE_BUCKET` is **not** required. The app does not store IGC files or photos in Cloud Storage (only optional IGC filename / track stats on the flight document).

The existing `VITE_FIREBASE_*` variables stay as they are for the SPA build. They are unrelated to MCP auth.

After setting the three MCP variables, redeploy so the function sees them.

### Tools

Dates are `yyyy-MM-dd`. Default timezone for “today” is **Europe/Zurich**. Airtime is whole minutes. Money is a number plus `currency` (default profile currency, usually `CHF`).

| Tool | What it does |
| --- | --- |
| `list_flights` | List newest first. Filters: `date_from`, `date_to`, `paraglider_id`, `harness_id`, `source` (`manual` \| `igc` \| `import`), `takeoff` / `landing` substring. `limit` (default 50, max 200), `offset`. |
| `get_flight` | One flight by `id`. |
| `create_flight` | Log a flight. Required: `airtimeMinutes`. `dateISO` defaults to today (Zurich). `takeoff` / `landing` / `paragliderId` / `harnessId` default from profile defaults. |
| `update_flight` | Patch by `id`. |
| `delete_flight` | Preview unless `confirm: true`. |
| `list_equipment` | Filters: `type` (`paraglider` \| `harness` \| `reserve` \| `other`), `status` (`active` \| `borrowed` \| `sold`). |
| `get_equipment` | One item by `id`. |
| `create_equipment` | Required: `type`, `producer`, `model`. `status` defaults to `active`. |
| `update_equipment` | Patch including status transitions (`active` / `borrowed` / `sold`). |
| `delete_equipment` | Preview unless `confirm: true`. |
| `list_expenses` | Filters: `date_from`, `date_to`, `equipment_id`, `category` (`purchase` \| `sale` \| `repair` \| `check` \| `gear` \| `other`). |
| `get_expense` | One expense by `id`. |
| `create_expense` | Required: `amount` (≥ 0). `currency`, `dateISO`, `category` default like the UI. |
| `update_expense` | Patch by `id` (the UI has no expense-edit form; included for full CRUD). |
| `delete_expense` | Preview unless `confirm: true`. |
| `get_profile` | Pilot, defaults, currency, maintenance defaults. |
| `update_profile` | Same fields the Settings UI can edit. `importedAt` is preserved. |
| `get_stats` | Same totals as the Dashboard (flights, airtime, this year, net spend, cost per flight/hour, by wing, top takeoffs, maintenance, warnings) plus spend/flights by year. |

Destructive tools (`delete_*`) return `{ confirm_required: true, preview: … }` unless `confirm: true` is passed.

### Intentionally excluded (gap list)

- Sign-in, password, or Firebase Auth account deletion
- Firebase project / web-app config changes
- Settings “delete all data” wipe
- Backup import/export JSON restore (Import page)
- IGC **file** upload (flight docs can still store `igc.filename` / `track` metadata)
- Public or multi-user access (single owner token only)

### Local Vite app

```bash
cp .env.example .env   # fill VITE_FIREBASE_*
npm install
npm run dev
```

```bash
npm test
npm run typecheck
npm run lint
npm run build
```
