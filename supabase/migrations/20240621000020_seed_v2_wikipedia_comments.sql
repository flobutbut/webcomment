-- Seed v2 — new profiles, follows, contacts, funny Wikipedia comments
-- All comments land in flobutbut's inbox (b38c37cf-e40b-4ab9-8ac7-95fae3875c68)
-- Exercises: user / follow / public recipient types, and @mentions

-- ── New seed profiles ─────────────────────────────────────────────────────────
-- profiles.id → auth.users.id FK bypassed for fake accounts
SET session_replication_role = replica;

INSERT INTO profiles (id, username, email, initials, baseline, is_seed) VALUES
  ('a0000000-0000-0000-0000-000000000005', 'elena_rossi', 'elena_rossi@example.com', NULL, 'Graphic novelist · Rome',  true),
  ('a0000000-0000-0000-0000-000000000006', 'kevin_lee',   'kevin_lee@example.com',   NULL, 'Indie hacker · Seoul',     true)
ON CONFLICT (id) DO NOTHING;

SET session_replication_role = DEFAULT;

-- ── Follows ───────────────────────────────────────────────────────────────────
-- flobutbut follows alice & bob  →  their 'follow'-type comments appear in his inbox
-- elena & kevin follow flobutbut →  they appear in his followers list
INSERT INTO follows (follower_id, followed_id) VALUES
  ('b38c37cf-e40b-4ab9-8ac7-95fae3875c68', 'a0000000-0000-0000-0000-000000000001'),
  ('b38c37cf-e40b-4ab9-8ac7-95fae3875c68', 'a0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000005', 'b38c37cf-e40b-4ab9-8ac7-95fae3875c68'),
  ('a0000000-0000-0000-0000-000000000006', 'b38c37cf-e40b-4ab9-8ac7-95fae3875c68')
ON CONFLICT (follower_id, followed_id) DO NOTHING;

-- ── Contacts ──────────────────────────────────────────────────────────────────
-- bob accepted, david pending (still in request state), elena accepted
INSERT INTO contacts (requester_id, addressee_id, status) VALUES
  ('a0000000-0000-0000-0000-000000000002', 'b38c37cf-e40b-4ab9-8ac7-95fae3875c68', 'accepted'),
  ('a0000000-0000-0000-0000-000000000004', 'b38c37cf-e40b-4ab9-8ac7-95fae3875c68', 'pending'),
  ('a0000000-0000-0000-0000-000000000005', 'b38c37cf-e40b-4ab9-8ac7-95fae3875c68', 'accepted')
ON CONFLICT DO NOTHING;

-- ── Comments ──────────────────────────────────────────────────────────────────
INSERT INTO comments
  (id, from_user_id, url, screenshot_url, screenshot_path, pin_x, pin_y, body, tags, mentions, created_at)
VALUES

-- Procrastination × alice_martin (follow)
('e0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000001',
 'https://en.wikipedia.org/wiki/Procrastination',
 'https://yhavbvgahhtlddyrycai.supabase.co/storage/v1/object/sign/screenshots/seed/e01.webp?token=seed',
 'seed/e01.webp', 18.0, 12.0,
 'J''ai mis cet article en favori il y a 3 ans. Je viens de l''ouvrir pour la première fois. La section "solutions pour éviter" me semble pertinente mais je la lirai demain.',
 '{}', '[]', NOW() - interval '13 days'),

-- Procrastination × bob_dupont (user)
('e0000000-0000-0000-0000-000000000002',
 'a0000000-0000-0000-0000-000000000002',
 'https://en.wikipedia.org/wiki/Procrastination',
 'https://yhavbvgahhtlddyrycai.supabase.co/storage/v1/object/sign/screenshots/seed/e02.webp?token=seed',
 'seed/e02.webp', 62.0, 44.0,
 'La section "Solutions" est marquée [citation needed] depuis 2007. C''est méta à un niveau que Wikipedia ne mérite pas.',
 '{}', '[]', NOW() - interval '12 days'),

-- Comic Sans × clara_chen (user + mention @flobutbut)
('e0000000-0000-0000-0000-000000000003',
 'a0000000-0000-0000-0000-000000000003',
 'https://en.wikipedia.org/wiki/Comic_Sans',
 'https://yhavbvgahhtlddyrycai.supabase.co/storage/v1/object/sign/screenshots/seed/e03.webp?token=seed',
 'seed/e03.webp', 30.0, 22.0,
 '@[b38c37cf-e40b-4ab9-8ac7-95fae3875c68] Wikipedia confirme que Comic Sans a été conçu pour imiter des bulles de BD. Ce qui ne justifie toujours pas son usage sur les menus de restaurant.',
 '{}', '[{"id":"b38c37cf-e40b-4ab9-8ac7-95fae3875c68","username":"flobutbut"}]',
 NOW() - interval '11 days'),

-- Comic Sans × david_smith (user)
('e0000000-0000-0000-0000-000000000004',
 'a0000000-0000-0000-0000-000000000004',
 'https://en.wikipedia.org/wiki/Comic_Sans',
 'https://yhavbvgahhtlddyrycai.supabase.co/storage/v1/object/sign/screenshots/seed/e04.webp?token=seed',
 'seed/e04.webp', 55.0, 68.0,
 'Confirmation officielle : Comic Sans vient de Microsoft Bob, un logiciel où un chien parlait dans des bulles de texte. Le débat est définitivement clos.',
 '{}', '[]', NOW() - interval '10 days'),

-- Coffee × alice_martin (user)
('e0000000-0000-0000-0000-000000000005',
 'a0000000-0000-0000-0000-000000000001',
 'https://en.wikipedia.org/wiki/Coffee',
 'https://yhavbvgahhtlddyrycai.supabase.co/storage/v1/object/sign/screenshots/seed/e05.webp?token=seed',
 'seed/e05.webp', 42.0, 15.0,
 'Première phrase : "Coffee is a beverage prepared from roasted coffee beans." Wikipedia au sommet ce matin.',
 '{}', '[]', NOW() - interval '9 days'),

-- Coffee × elena_rossi (user + mention @flobutbut)
('e0000000-0000-0000-0000-000000000006',
 'a0000000-0000-0000-0000-000000000005',
 'https://en.wikipedia.org/wiki/Coffee',
 'https://yhavbvgahhtlddyrycai.supabase.co/storage/v1/object/sign/screenshots/seed/e06.webp?token=seed',
 'seed/e06.webp', 71.0, 38.0,
 '@[b38c37cf-e40b-4ab9-8ac7-95fae3875c68] Section "Espresso" : 5 lignes pour couvrir toute la culture caféinée italienne. C''est une insulte nationale.',
 '{}', '[{"id":"b38c37cf-e40b-4ab9-8ac7-95fae3875c68","username":"flobutbut"}]',
 NOW() - interval '8 days'),

-- Helvetica × bob_dupont (follow)
('e0000000-0000-0000-0000-000000000007',
 'a0000000-0000-0000-0000-000000000002',
 'https://en.wikipedia.org/wiki/Helvetica',
 'https://yhavbvgahhtlddyrycai.supabase.co/storage/v1/object/sign/screenshots/seed/e07.webp?token=seed',
 'seed/e07.webp', 25.0, 55.0,
 'L''article Wikipedia sur Helvetica est rendu en Times New Roman. Je ne suis pas en colère, juste infiniment déçu.',
 '{}', '[]', NOW() - interval '7 days'),

-- Helvetica × kevin_lee (public)
('e0000000-0000-0000-0000-000000000008',
 'a0000000-0000-0000-0000-000000000006',
 'https://en.wikipedia.org/wiki/Helvetica',
 'https://yhavbvgahhtlddyrycai.supabase.co/storage/v1/object/sign/screenshots/seed/e08.webp?token=seed',
 'seed/e08.webp', 80.0, 72.0,
 'La page entière sur Helvetica ne mentionne Arial qu''une seule fois, tout en bas, dans "See also". Du courage éditorial.',
 '{}', '[]', NOW() - interval '7 days'),

-- Rubber duck debugging × david_smith (user)
('e0000000-0000-0000-0000-000000000009',
 'a0000000-0000-0000-0000-000000000004',
 'https://en.wikipedia.org/wiki/Rubber_duck_debugging',
 'https://yhavbvgahhtlddyrycai.supabase.co/storage/v1/object/sign/screenshots/seed/e09.webp?token=seed',
 'seed/e09.webp', 33.0, 28.0,
 'Wikipedia a une page dédiée au rubber duck debugging. J''ai passé 20 minutes à expliquer mon bug à un canard en plastique. Ça a marché. Je vous hais tous.',
 '{}', '[]', NOW() - interval '6 days'),

-- Nicolas Cage × alice_martin (user + mention @flobutbut)
('e0000000-0000-0000-0000-000000000010',
 'a0000000-0000-0000-0000-000000000001',
 'https://en.wikipedia.org/wiki/Nicolas_Cage',
 'https://yhavbvgahhtlddyrycai.supabase.co/storage/v1/object/sign/screenshots/seed/e10.webp?token=seed',
 'seed/e10.webp', 15.0, 33.0,
 '@[b38c37cf-e40b-4ab9-8ac7-95fae3875c68] 220 films. Nicolas Cage en a sorti 8 en 2022 seul. C''est notre benchmark de productivité maintenant ?',
 '{}', '[{"id":"b38c37cf-e40b-4ab9-8ac7-95fae3875c68","username":"flobutbut"}]',
 NOW() - interval '5 days'),

-- Nicolas Cage × elena_rossi (public)
('e0000000-0000-0000-0000-000000000011',
 'a0000000-0000-0000-0000-000000000005',
 'https://en.wikipedia.org/wiki/Nicolas_Cage',
 'https://yhavbvgahhtlddyrycai.supabase.co/storage/v1/object/sign/screenshots/seed/e11.webp?token=seed',
 'seed/e11.webp', 60.0, 48.0,
 'Section "Personal life" : il a acheté un crâne humain, un château médiéval, un îlot des Bahamas et deux cobras albinos. Wikipedia ne porte pas de jugement. Moi si.',
 '{}', '[]', NOW() - interval '5 days'),

-- Syndrome de l''imposteur × clara_chen (user + mention @flobutbut)
('e0000000-0000-0000-0000-000000000012',
 'a0000000-0000-0000-0000-000000000003',
 'https://fr.wikipedia.org/wiki/Syndrome_de_l%27imposteur',
 'https://yhavbvgahhtlddyrycai.supabase.co/storage/v1/object/sign/screenshots/seed/e12.webp?token=seed',
 'seed/e12.webp', 47.0, 61.0,
 '@[b38c37cf-e40b-4ab9-8ac7-95fae3875c68] Section "Milieu créatif" — j''ai l''impression que cet article a été écrit par quelqu''un qui nous connaît.',
 '{}', '[{"id":"b38c37cf-e40b-4ab9-8ac7-95fae3875c68","username":"flobutbut"}]',
 NOW() - interval '4 days'),

-- Syndrome de l''imposteur × alice_martin (follow)
('e0000000-0000-0000-0000-000000000013',
 'a0000000-0000-0000-0000-000000000001',
 'https://fr.wikipedia.org/wiki/Syndrome_de_l%27imposteur',
 'https://yhavbvgahhtlddyrycai.supabase.co/storage/v1/object/sign/screenshots/seed/e13.webp?token=seed',
 'seed/e13.webp', 22.0, 78.0,
 'Liste des symptômes : "peur d''être démasqué", "attribution des succès à la chance". C''est ma rétrospective hebdomadaire.',
 '{}', '[]', NOW() - interval '3 days'),

-- Times New Roman × kevin_lee (public)
('e0000000-0000-0000-0000-000000000014',
 'a0000000-0000-0000-0000-000000000006',
 'https://en.wikipedia.org/wiki/Times_New_Roman',
 'https://yhavbvgahhtlddyrycai.supabase.co/storage/v1/object/sign/screenshots/seed/e14.webp?token=seed',
 'seed/e14.webp', 50.0, 20.0,
 'Times New Roman a été commandé en 1931 parce qu''UN lecteur avait écrit pour se plaindre que la typographie était mauvaise. Un seul email a changé la typographie académique mondiale.',
 '{}', '[]', NOW() - interval '2 days'),

-- Times New Roman × bob_dupont (user)
('e0000000-0000-0000-0000-000000000015',
 'a0000000-0000-0000-0000-000000000002',
 'https://en.wikipedia.org/wiki/Times_New_Roman',
 'https://yhavbvgahhtlddyrycai.supabase.co/storage/v1/object/sign/screenshots/seed/e15.webp?token=seed',
 'seed/e15.webp', 38.0, 85.0,
 'La section "Usage in academia" justifie à elle seule un mouvement international pour bannir cette police à vie.',
 '{}', '[]', NOW() - interval '1 day');

-- ── Comment recipients ─────────────────────────────────────────────────────────
-- follow type: recipient_id = the follower (flobutbut), who follows the sender
-- user type:   recipient_id = flobutbut (direct)
-- public type: recipient_id = flobutbut (following existing seed pattern)
INSERT INTO comment_recipients (comment_id, recipient_type, recipient_id) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'follow', 'b38c37cf-e40b-4ab9-8ac7-95fae3875c68'),
  ('e0000000-0000-0000-0000-000000000002', 'user',   'b38c37cf-e40b-4ab9-8ac7-95fae3875c68'),
  ('e0000000-0000-0000-0000-000000000003', 'user',   'b38c37cf-e40b-4ab9-8ac7-95fae3875c68'),
  ('e0000000-0000-0000-0000-000000000004', 'user',   'b38c37cf-e40b-4ab9-8ac7-95fae3875c68'),
  ('e0000000-0000-0000-0000-000000000005', 'user',   'b38c37cf-e40b-4ab9-8ac7-95fae3875c68'),
  ('e0000000-0000-0000-0000-000000000006', 'user',   'b38c37cf-e40b-4ab9-8ac7-95fae3875c68'),
  ('e0000000-0000-0000-0000-000000000007', 'follow', 'b38c37cf-e40b-4ab9-8ac7-95fae3875c68'),
  ('e0000000-0000-0000-0000-000000000008', 'public', 'b38c37cf-e40b-4ab9-8ac7-95fae3875c68'),
  ('e0000000-0000-0000-0000-000000000009', 'user',   'b38c37cf-e40b-4ab9-8ac7-95fae3875c68'),
  ('e0000000-0000-0000-0000-000000000010', 'user',   'b38c37cf-e40b-4ab9-8ac7-95fae3875c68'),
  ('e0000000-0000-0000-0000-000000000011', 'public', 'b38c37cf-e40b-4ab9-8ac7-95fae3875c68'),
  ('e0000000-0000-0000-0000-000000000012', 'user',   'b38c37cf-e40b-4ab9-8ac7-95fae3875c68'),
  ('e0000000-0000-0000-0000-000000000013', 'follow', 'b38c37cf-e40b-4ab9-8ac7-95fae3875c68'),
  ('e0000000-0000-0000-0000-000000000014', 'public', 'b38c37cf-e40b-4ab9-8ac7-95fae3875c68'),
  ('e0000000-0000-0000-0000-000000000015', 'user',   'b38c37cf-e40b-4ab9-8ac7-95fae3875c68');
