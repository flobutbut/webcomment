-- Fix SECURITY DEFINER function: set explicit search_path to prevent search_path injection
-- Also add ON CONFLICT (id) DO NOTHING to handle GoTrue retries gracefully
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  insert into public.profiles (id, username, email, initials)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(trim(new.raw_user_meta_data->>'initials'), '')
  )
  ON CONFLICT (id) DO NOTHING;
  return new;
end;
$$;
