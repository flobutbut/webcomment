-- WebComment — contacts table
-- Note: this table was created manually on the prod DB before this migration file existed.
-- Running this on a fresh DB recreates the identical schema.

create table contacts (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null,
  addressee_id  uuid not null,
  status        text not null default 'pending',
  created_at    timestamptz default now(),

  constraint contacts_requester_id_fkey foreign key (requester_id) references profiles(id) on delete cascade,
  constraint contacts_addressee_id_fkey foreign key (addressee_id) references profiles(id) on delete cascade,
  constraint contacts_no_self           check (requester_id != addressee_id),
  constraint contacts_status_check      check (status = any (array['pending', 'accepted', 'declined']))
);

create unique index contacts_unique   on contacts (requester_id, addressee_id);
create        index contacts_requester_idx on contacts (requester_id);
create        index contacts_addressee_idx on contacts (addressee_id);

alter table contacts enable row level security;

create policy "contacts_select" on contacts
  for select using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "contacts_insert" on contacts
  for insert with check (requester_id = auth.uid());

create policy "contacts_update" on contacts
  for update using (addressee_id = auth.uid());

create policy "contacts_delete" on contacts
  for delete using (requester_id = auth.uid() or addressee_id = auth.uid());

alter publication supabase_realtime add table contacts;
