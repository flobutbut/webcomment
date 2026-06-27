-- Extension & webapp activity tracking
alter table profiles
  add column if not exists extension_version     text,
  add column if not exists extension_last_active timestamptz,
  add column if not exists last_seen_webapp_at   timestamptz;
