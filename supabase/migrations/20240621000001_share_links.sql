-- Liens de partage — permettent à un utilisateur de partager une page
-- avec un lien pré-configuré qui adresse les commentaires vers lui.

create table share_links (
  id          uuid primary key default gen_random_uuid(),
  token       text unique not null default encode(gen_random_bytes(8), 'hex'),
  created_by  uuid not null references profiles(id) on delete cascade,
  url         text,             -- URL exacte cible (null si scope = 'domain')
  domain      text not null,    -- domaine extrait de l'URL
  scope       text not null default 'page' check (scope in ('page', 'domain')),
  expires_at  timestamptz,      -- null = permanent
  created_at  timestamptz default now()
);

create index share_links_token_idx on share_links (token);

alter table share_links enable row level security;

-- Lecture : propriétaire uniquement (pour gérer ses propres liens)
create policy "share_links_select" on share_links
  for select using (auth.uid() = created_by);

-- Création : tout utilisateur connecté
create policy "share_links_insert" on share_links
  for insert with check (auth.uid() = created_by);

-- Suppression : propriétaire uniquement
create policy "share_links_delete" on share_links
  for delete using (auth.uid() = created_by);

-- Note : la résolution d'un token (resolve-share-link) utilise le service role,
-- elle n'est donc pas soumise au RLS.
