-- RGPD: supprimer l'exposition de l'email des profils tiers
-- Art. 5(1)(f) + Art. 25 — confidentialité et protection dès la conception

-- Mettre à jour get_group_members : ne plus retourner email
create or replace function get_group_members(p_group_id uuid)
returns table (
  user_id    uuid,
  username   text,
  avatar_url text,
  initials   text,
  role       group_role,
  joined_at  timestamptz
)
language sql security definer
set search_path = public
as $$
  select
    p.id        as user_id,
    p.username,
    p.avatar_url,
    p.initials,
    gm.role,
    gm.joined_at
  from group_members gm
  join profiles p on p.id = gm.user_id
  where gm.group_id = p_group_id
    and exists (
      select 1 from group_members caller
      where caller.group_id = p_group_id
        and caller.user_id  = auth.uid()
    )
  order by
    case gm.role when 'owner' then 0 else 1 end,
    p.username;
$$;

-- RPC de recherche d'utilisateurs : recherche par username OU email (côté serveur)
-- mais ne retourne jamais l'email dans les résultats
create or replace function search_profiles(query text)
returns table (id uuid, username text, avatar_url text, initials text)
language plpgsql security definer
set search_path = public
as $$
begin
  return query
  select p.id, p.username, p.avatar_url, p.initials
  from profiles p
  where (
    p.username ilike '%' || query || '%'
    or p.email ilike '%' || query || '%'
  )
  and p.id != auth.uid()
  limit 10;
end;
$$;

grant execute on function search_profiles(text) to authenticated;
