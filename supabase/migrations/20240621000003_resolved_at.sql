-- Colonne resolved_at pour marquer un commentaire reçu comme résolu
alter table comment_recipients
  add column if not exists resolved_at timestamptz;

-- Vue comment_inbox mise à jour avec resolved_at
create or replace view comment_inbox as
select
  cr.id               as recipient_id,
  c.id                as comment_id,
  c.from_user_id,
  p.username          as from_username,
  p.email             as from_email,
  c.url,
  c.screenshot_url,
  c.pin_x,
  c.pin_y,
  c.anchor_selector,
  c.anchor_x,
  c.anchor_y,
  c.body,
  c.created_at,
  cr.read_at,
  case
    when cr.recipient_type = 'user'  then cr.recipient_id
    when cr.recipient_type = 'group' then gm.user_id
  end as for_user_id,
  cr.resolved_at
from comment_recipients cr
join comments c    on c.id  = cr.comment_id
join profiles p    on p.id  = c.from_user_id
left join group_members gm
  on cr.recipient_type = 'group' and gm.group_id = cr.recipient_id;
