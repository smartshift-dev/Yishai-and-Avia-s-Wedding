import { createClient } from '@supabase/supabase-js';

const COLS = 'id, guest_id, name, text, audio, ts';
const BUCKET = 'audio';

// Uses the service-role key, so this must only ever run on the server.
// Row-level security is on with no policies: the public anon key cannot read or write anything.
export function supabaseStore(url, serviceKey) {
  const sb = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const wishes = () => sb.from('wishes');
  const ok = ({ data, error }) => {
    if (error) throw error;
    return data;
  };

  return {
    kind: 'supabase',
    listWishes: async () => ok(await wishes().select(COLS).order('ts', { ascending: false }).limit(1000)),
    getByGuest: async (gid) => ok(await wishes().select(COLS).eq('guest_id', gid).maybeSingle()),
    getById: async (id) => ok(await wishes().select(COLS).eq('id', id).maybeSingle()),
    saveWish: async (gid, { name, text, audio }) =>
      ok(await wishes().upsert({ guest_id: gid, name, text, audio: audio ?? null, ts: Date.now() }, { onConflict: 'guest_id' })),
    deleteByGuest: async (gid) => ok(await wishes().delete().eq('guest_id', gid)),
    deleteById: async (id) => ok(await wishes().delete().eq('id', id)),

    putAudio: async (name, buf, contentType) =>
      ok(await sb.storage.from(BUCKET).upload(name, buf, { contentType, cacheControl: '2592000', upsert: false })),
    removeAudio: async (name) => {
      if (name) await sb.storage.from(BUCKET).remove([name]);
    },
    audioUrl: (name) => sb.storage.from(BUCKET).getPublicUrl(name).data.publicUrl,

    /** Cheap query used by the health check; also keeps the free Supabase project from pausing. */
    ping: async () => ok(await wishes().select('id').limit(1)),
  };
}
