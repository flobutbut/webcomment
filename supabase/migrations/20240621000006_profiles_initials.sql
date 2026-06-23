alter table profiles
  add column if not exists initials text check (char_length(initials) <= 2);

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, email, initials)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(trim(new.raw_user_meta_data->>'initials'), '')
  );
  return new;
end;
$$ language plpgsql security definer;
