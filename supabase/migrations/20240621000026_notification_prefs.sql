-- Notification preferences on profiles
alter table profiles
  add column if not exists notify_on_comment boolean not null default true,
  add column if not exists notify_on_contact boolean not null default true;
