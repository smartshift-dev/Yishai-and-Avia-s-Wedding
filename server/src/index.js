import express from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'server', 'data'));
const CLIENT_DIR = path.join(ROOT, 'client', 'dist', 'client', 'browser');
const PORT = Number(process.env.PORT) || 3000;

const NAME_MAX = 60;
const TEXT_MAX = 600;
const AUDIO_MAX_BYTES = 400 * 1024; // 30s at ~32kbps is ~120KB; leave headroom
const AUDIO_TYPES = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3' };

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
if (!ADMIN_PASSWORD) console.warn('ADMIN_PASSWORD is not set: admin login is disabled.');

const PROD = process.env.NODE_ENV === 'production';

// Supabase when configured (production); otherwise a local SQLite file and audio folder.
const store = process.env.SUPABASE_URL
  ? (await import('./store-supabase.js')).supabaseStore(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : (await import('./store-local.js')).localStore(DATA_DIR);
if (PROD && store.kind === 'local') console.warn('Production without SUPABASE_URL: wishes are stored on local disk.');

// Cookie signing secret: from env, or generated once and kept next to the data (local only).
// On hosts with an ephemeral disk it MUST come from env, or guests lose their wishes on every restart.
function loadSecret() {
  if (process.env.COOKIE_SECRET) return process.env.COOKIE_SECRET;
  if (PROD) throw new Error('COOKIE_SECRET must be set in production');
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const file = path.join(DATA_DIR, 'cookie-secret');
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  return fs.readFileSync(file, 'utf8').trim();
}

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(cookieParser(loadSecret()));
app.use(express.json({ limit: '1mb' }));

const cookieOpts = { httpOnly: true, sameSite: 'lax', secure: PROD, signed: true };

// Health check for Render and the keep-awake pinger; touches the database so Supabase stays active too.
app.get('/api/health', async (req, res) => {
  await store.ping();
  res.json({ ok: true });
});

/* ---------- identity ---------- */
// Every browser gets an anonymous, server-signed guest id. A guest can only touch the wish stored under it.
function guest(req, res, next) {
  let gid = req.signedCookies.gid;
  if (typeof gid !== 'string' || !/^[0-9a-f-]{36}$/.test(gid)) {
    gid = crypto.randomUUID();
    res.cookie('gid', gid, { ...cookieOpts, maxAge: 400 * 24 * 3600 * 1000 });
  }
  req.gid = gid;
  req.isAdmin = req.signedCookies.adm === '1';
  next();
}
function requireAdmin(req, res, next) {
  if (!req.isAdmin) return res.status(403).json({ error: 'forbidden' });
  next();
}
app.use('/api', guest);

/* ---------- live updates (SSE) ---------- */
const listeners = new Set();
function notify() {
  for (const res of listeners) res.write('event: wishes\ndata: changed\n\n');
}
app.get('/api/wishes/stream', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  res.write('retry: 5000\n\n');
  listeners.add(res);
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => { clearInterval(ping); listeners.delete(res); });
});

/* ---------- wishes ---------- */
function publicWish(w, req) {
  return {
    id: w.id,
    name: w.name,
    text: w.text,
    audio: w.audio ? store.audioUrl(w.audio) : null,
    ts: w.ts,
    mine: w.guest_id === req.gid,
  };
}

app.get('/api/session', (req, res) => {
  res.json({ isAdmin: req.isAdmin });
});

app.get('/api/wishes', async (req, res) => {
  res.json((await store.listWishes()).map((w) => publicWish(w, req)));
});

function removeAudio(file) {
  store.removeAudio(file).catch((e) => console.error('audio cleanup failed', e));
}

// body: { name, text, audio: "keep" | null | "data:audio/...;base64,..." }
app.put('/api/wishes/mine', async (req, res) => {
  const body = req.body || {};
  const name = String(body.name ?? '').trim();
  const text = String(body.text ?? '').trim();
  if (!name || name.length > NAME_MAX) return res.status(400).json({ error: 'name' });
  if (text.length > TEXT_MAX) return res.status(400).json({ error: 'text' });

  const existing = await store.getByGuest(req.gid);
  let audio = null;
  let newFile = null;

  if (body.audio === 'keep') {
    audio = existing?.audio ?? null;
  } else if (typeof body.audio === 'string') {
    const m = /^data:(audio\/[a-z0-9]+)(?:;[^,]*)?;base64,([A-Za-z0-9+/=]+)$/.exec(body.audio);
    const ext = m && AUDIO_TYPES[m[1]];
    if (!ext) return res.status(400).json({ error: 'audio' });
    const buf = Buffer.from(m[2], 'base64');
    if (!buf.length || buf.length > AUDIO_MAX_BYTES) return res.status(413).json({ error: 'audio_size' });
    newFile = `${crypto.randomUUID()}.${ext}`;
    await store.putAudio(newFile, buf, m[1]);
    audio = newFile;
  } else if (body.audio != null) {
    return res.status(400).json({ error: 'audio' });
  }

  if (!text && !audio) {
    if (newFile) removeAudio(newFile);
    return res.status(400).json({ error: 'empty' });
  }

  try {
    await store.saveWish(req.gid, { name, text, audio });
  } catch (e) {
    if (newFile) removeAudio(newFile);
    throw e;
  }
  if (existing?.audio && existing.audio !== audio) removeAudio(existing.audio);
  notify();
  res.json(publicWish(await store.getByGuest(req.gid), req));
});

app.delete('/api/wishes/mine', async (req, res) => {
  const existing = await store.getByGuest(req.gid);
  if (!existing) return res.status(404).json({ error: 'not_found' });
  await store.deleteByGuest(req.gid);
  removeAudio(existing.audio);
  notify();
  res.status(204).end();
});

app.delete('/api/wishes/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'not_found' });
  const existing = await store.getById(id);
  if (!existing) return res.status(404).json({ error: 'not_found' });
  await store.deleteById(existing.id);
  removeAudio(existing.audio);
  notify();
  res.status(204).end();
});

if (store.audioDir) app.use('/audio', express.static(store.audioDir, { maxAge: '30d', immutable: true, index: false }));

/* ---------- admin ---------- */
const attempts = new Map(); // ip -> { n, until }
app.post('/api/admin/login', (req, res) => {
  const ip = req.ip;
  const a = attempts.get(ip) || { n: 0, until: 0 };
  if (a.until > Date.now()) return res.status(429).json({ error: 'too_many' });
  const given = Buffer.from(String(req.body?.password ?? ''));
  const want = Buffer.from(ADMIN_PASSWORD);
  const ok = ADMIN_PASSWORD && given.length === want.length && crypto.timingSafeEqual(given, want);
  if (!ok) {
    a.n++;
    if (a.n >= 5) { a.n = 0; a.until = Date.now() + 5 * 60 * 1000; }
    attempts.set(ip, a);
    return res.status(401).json({ error: 'bad_password' });
  }
  attempts.delete(ip);
  res.cookie('adm', '1', { ...cookieOpts, maxAge: 30 * 24 * 3600 * 1000 });
  res.json({ isAdmin: true });
});
app.post('/api/admin/logout', (req, res) => {
  res.clearCookie('adm', { ...cookieOpts, maxAge: undefined });
  res.json({ isAdmin: false });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'not_found' }));
// Express 5 forwards rejected async handlers here (e.g. a Supabase outage).
app.use('/api', (err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'server' });
});

/* ---------- Angular app ---------- */
if (fs.existsSync(CLIENT_DIR)) {
  app.use(express.static(CLIENT_DIR, { index: false, maxAge: '1h' }));
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    res.sendFile(path.join(CLIENT_DIR, 'index.html'));
  });
} else {
  console.warn(`Client build not found at ${CLIENT_DIR}. Run "npm run build" in client/.`);
}

app.listen(PORT, () => console.log(`Wedding server on http://localhost:${PORT} (storage: ${store.kind})`));
