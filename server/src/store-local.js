import fs from 'node:fs';
import path from 'node:path';
import { openDb } from './db.js';

// Local development: SQLite file plus an audio folder. Not for hosts with an ephemeral disk.
export function localStore(dataDir) {
  const audioDir = path.join(dataDir, 'audio');
  fs.mkdirSync(audioDir, { recursive: true });
  const db = openDb(dataDir);

  return {
    kind: 'local',
    audioDir,
    listWishes: async () => db.listWishes(),
    getByGuest: async (gid) => db.getByGuest(gid) ?? null,
    getById: async (id) => db.getById(id) ?? null,
    saveWish: async (gid, wish) => db.saveWish(gid, wish),
    deleteByGuest: async (gid) => db.deleteByGuest(gid),
    deleteById: async (id) => db.deleteById(id),

    putAudio: async (name, buf) => fs.promises.writeFile(path.join(audioDir, name), buf),
    removeAudio: async (name) => {
      if (name) await fs.promises.rm(path.join(audioDir, path.basename(name)), { force: true });
    },
    audioUrl: (name) => `/audio/${name}`,
    ping: async () => db.listWishes(),
  };
}
