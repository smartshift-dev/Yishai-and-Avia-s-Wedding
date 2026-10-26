import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export function openDb(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, 'wedding.db'));
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS wishes (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_id TEXT NOT NULL UNIQUE,
      name     TEXT NOT NULL,
      text     TEXT NOT NULL DEFAULT '',
      audio    TEXT,
      ts       INTEGER NOT NULL
    );
  `);

  const q = {
    list: db.prepare('SELECT id, guest_id, name, text, audio, ts FROM wishes ORDER BY ts DESC LIMIT 1000'),
    byGuest: db.prepare('SELECT id, guest_id, name, text, audio, ts FROM wishes WHERE guest_id = ?'),
    byId: db.prepare('SELECT id, guest_id, name, text, audio, ts FROM wishes WHERE id = ?'),
    upsert: db.prepare(`
      INSERT INTO wishes (guest_id, name, text, audio, ts) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(guest_id) DO UPDATE SET name = excluded.name, text = excluded.text, audio = excluded.audio, ts = excluded.ts
    `),
    deleteByGuest: db.prepare('DELETE FROM wishes WHERE guest_id = ?'),
    deleteById: db.prepare('DELETE FROM wishes WHERE id = ?'),
  };

  return {
    listWishes: () => q.list.all(),
    getByGuest: (gid) => q.byGuest.get(gid),
    getById: (id) => q.byId.get(id),
    saveWish: (gid, { name, text, audio }) => q.upsert.run(gid, name, text, audio ?? null, Date.now()),
    deleteByGuest: (gid) => q.deleteByGuest.run(gid),
    deleteById: (id) => q.deleteById.run(id),
  };
}
