-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

-- Wishes: one row per guest (guest_id comes from the server's signed cookie).
create table if not exists public.wishes (
  id        bigint generated always as identity primary key,
  guest_id  text   not null unique,
  name      text   not null check (char_length(name) between 1 and 60),
  text      text   not null default '' check (char_length(text) <= 600),
  audio     text,
  ts        bigint not null
);
create index if not exists wishes_ts_idx on public.wishes (ts desc);

-- Only the server (service-role key) may touch the table. No policies = the public anon key gets nothing.
alter table public.wishes enable row level security;

-- Public bucket for voice wishes (anyone with the link can listen; only the server can upload or delete).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audio', 'audio', true, 409600, array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg'])
on conflict (id) do nothing;
