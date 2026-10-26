# ישי ואביה: דף החתונה

Angular (client/) + Node/Express (server/).

## Running

```powershell
npm run install:all
npm run build                      # builds Angular into client/dist
$env:ADMIN_PASSWORD = "<password>"
npm start                          # http://localhost:3000
```

During development, run `npm run dev:server` and `npm run dev:client` (http://localhost:4200, with a proxy to the server).

## Configuration

| Variable | Meaning |
|---|---|
| `ADMIN_PASSWORD` | Admin password at `/admin`. Without it, admin login is disabled. |
| `PORT` | Default 3000 |
| `DATA_DIR` | Location of the database and recordings. Default `server/data` |
| `COOKIE_SECRET` | Required in production. Locally, if not set, one is generated and saved in `DATA_DIR` |
| `NODE_ENV=production` | Cookies marked `Secure` (requires HTTPS) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | When set, data is stored in Supabase instead of locally |

All event details (time, venue, dates) are in [shared/event.json](shared/event.json).

## Identity and permissions

- Each browser receives an anonymous `gid` cookie signed by the server. A guest can only edit or delete the wish saved under their own identifier, and this is enforced on the server.
- Admins sign in at `/admin` with a password and receive a signed cookie. Only they can delete someone else's wish (`DELETE /api/wishes/:id`).
- Updates to the wishes list are pushed live over SSE (`/api/wishes/stream`).

## Storage

- **Locally** (no `SUPABASE_URL`): SQLite at `server/data/wedding.db`, recordings in `server/data/audio`.
- **In production**: Supabase. The `wishes` table plus the public `audio` bucket in Storage. Setup script: [supabase/schema.sql](supabase/schema.sql). The server uses the service-role key, and RLS blocks everyone else.

## Deployment (free): Render + Supabase

1. **Supabase**: create a project, then in SQL Editor run [supabase/schema.sql](supabase/schema.sql). Under Project Settings → API, copy the `Project URL` and the `service_role` key.
2. **GitHub**: push this repository.
3. **Render**: New → Blueprint → choose the repository. Render reads [render.yaml](render.yaml) and asks for `ADMIN_PASSWORD`, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. `COOKIE_SECRET` is generated automatically. Do not change it afterwards, or guests will lose the link to their wishes.
4. **Keep awake**: Render's free server sleeps after 15 minutes. At [cron-job.org](https://cron-job.org), set up a call to `https://<address>.onrender.com/api/health` every 10 minutes. This also keeps the Supabase project from pausing.

Every push to `main` deploys automatically.
