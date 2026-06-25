-- Seed v3 — url_follows for flobutbut + public comments to populate the feed
-- Feed = get_feed_comments(p_user_id): public comments on followed URLs
-- flobutbut UUID: b38c37cf-e40b-4ab9-8ac7-95fae3875c68

-- ── URL follows ───────────────────────────────────────────────────────────────
-- flobutbut follows 6 Wikipedia pages (migration bypasses RLS as postgres)
INSERT INTO url_follows (user_id, url) VALUES
  ('b38c37cf-e40b-4ab9-8ac7-95fae3875c68', 'https://en.wikipedia.org/wiki/Helvetica'),
  ('b38c37cf-e40b-4ab9-8ac7-95fae3875c68', 'https://en.wikipedia.org/wiki/Nicolas_Cage'),
  ('b38c37cf-e40b-4ab9-8ac7-95fae3875c68', 'https://en.wikipedia.org/wiki/Lorem_ipsum'),
  ('b38c37cf-e40b-4ab9-8ac7-95fae3875c68', 'https://en.wikipedia.org/wiki/IKEA'),
  ('b38c37cf-e40b-4ab9-8ac7-95fae3875c68', 'https://fr.wikipedia.org/wiki/Croissant'),
  ('b38c37cf-e40b-4ab9-8ac7-95fae3875c68', 'https://en.wikipedia.org/wiki/Procrastination')
ON CONFLICT (user_id, url) DO NOTHING;

-- ── Public feed comments ──────────────────────────────────────────────────────
-- IDs in f-range. All have recipient_type='public' so get_feed_comments returns them.

INSERT INTO comments
  (id, from_user_id, url, screenshot_url, screenshot_path, pin_x, pin_y, body, tags, mentions, created_at)
VALUES

-- Lorem ipsum × alice_martin
('f0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000001',
 'https://en.wikipedia.org/wiki/Lorem_ipsum',
 'https://yhavbvgahhtlddyrycai.supabase.co/storage/v1/object/sign/screenshots/seed/f01.webp?token=seed',
 'seed/f01.webp', 24.0, 18.0,
 'Lorem ipsum est utilisé depuis les années 1500. C''est officiellement plus vieux que la plupart des frameworks JavaScript.',
 '{}', '[]', NOW() - interval '11 days'),

-- Lorem ipsum × david_smith
('f0000000-0000-0000-0000-000000000002',
 'a0000000-0000-0000-0000-000000000004',
 'https://en.wikipedia.org/wiki/Lorem_ipsum',
 'https://yhavbvgahhtlddyrycai.supabase.co/storage/v1/object/sign/screenshots/seed/f02.webp?token=seed',
 'seed/f02.webp', 55.0, 42.0,
 'Le Lorem ipsum original est extrait d''un traité de Cicéron. L''humanité utilise du latin corrompu comme placeholder depuis 500 ans. Personne n''a protesté.',
 '{}', '[]', NOW() - interval '10 days'),

-- Lorem ipsum × kevin_lee
('f0000000-0000-0000-0000-000000000003',
 'a0000000-0000-0000-0000-000000000006',
 'https://en.wikipedia.org/wiki/Lorem_ipsum',
 'https://yhavbvgahhtlddyrycai.supabase.co/storage/v1/object/sign/screenshots/seed/f03.webp?token=seed',
 'seed/f03.webp', 77.0, 65.0,
 'Wikipedia confirme que Lorem ipsum n''a aucun sens en latin moderne. On utilise du charabia depuis 1963 et personne n''a jamais demandé pourquoi.',
 '{}', '[]', NOW() - interval '9 days'),

-- IKEA × bob_dupont
('f0000000-0000-0000-0000-000000000004',
 'a0000000-0000-0000-0000-000000000002',
 'https://en.wikipedia.org/wiki/IKEA',
 'https://yhavbvgahhtlddyrycai.supabase.co/storage/v1/object/sign/screenshots/seed/f04.webp?token=seed',
 'seed/f04.webp', 32.0, 28.0,
 'Fondé en 1943. IKEA est plus vieux que la plupart des nations membres de l''ONU. Et pourtant les instructions de montage n''ont pas évolué d''un pixel.',
 '{}', '[]', NOW() - interval '8 days'),

-- IKEA × clara_chen
('f0000000-0000-0000-0000-000000000005',
 'a0000000-0000-0000-0000-000000000003',
 'https://en.wikipedia.org/wiki/IKEA',
 'https://yhavbvgahhtlddyrycai.supabase.co/storage/v1/object/sign/screenshots/seed/f05.webp?token=seed',
 'seed/f05.webp', 60.0, 51.0,
 'Je viens de passer 3h à assembler un KALLAX. L''article mentionne qu''IKEA possède 12% du marché mondial du meuble. Je valide.',
 '{}', '[]', NOW() - interval '7 days'),

-- IKEA × elena_rossi
('f0000000-0000-0000-0000-000000000006',
 'a0000000-0000-0000-0000-000000000005',
 'https://en.wikipedia.org/wiki/IKEA',
 'https://yhavbvgahhtlddyrycai.supabase.co/storage/v1/object/sign/screenshots/seed/f06.webp?token=seed',
 'seed/f06.webp', 45.0, 75.0,
 'La section "Design philosophy" : "Democratic design". Je vais utiliser cette formule pour défendre mes prochaines maquettes en réunion.',
 '{}', '[]', NOW() - interval '6 days'),

-- Croissant × alice_martin
('f0000000-0000-0000-0000-000000000007',
 'a0000000-0000-0000-0000-000000000001',
 'https://fr.wikipedia.org/wiki/Croissant',
 'https://yhavbvgahhtlddyrycai.supabase.co/storage/v1/object/sign/screenshots/seed/f07.webp?token=seed',
 'seed/f07.webp', 20.0, 30.0,
 'L''article révèle que le croissant est autrichien à l''origine, pas français. Je laisse cette information ici et je pars.',
 '{}', '[]', NOW() - interval '5 days'),

-- Croissant × kevin_lee
('f0000000-0000-0000-0000-000000000008',
 'a0000000-0000-0000-0000-000000000006',
 'https://fr.wikipedia.org/wiki/Croissant',
 'https://yhavbvgahhtlddyrycai.supabase.co/storage/v1/object/sign/screenshots/seed/f08.webp?token=seed',
 'seed/f08.webp', 68.0, 44.0,
 'La section "Préparation" liste 27 étapes dont "tourager la pâte 3 fois". J''achète mes croissants à la boulangerie et j''assume totalement.',
 '{}', '[]', NOW() - interval '4 days'),

-- Procrastination × david_smith (public)
('f0000000-0000-0000-0000-000000000009',
 'a0000000-0000-0000-0000-000000000004',
 'https://en.wikipedia.org/wiki/Procrastination',
 'https://yhavbvgahhtlddyrycai.supabase.co/storage/v1/object/sign/screenshots/seed/f09.webp?token=seed',
 'seed/f09.webp', 48.0, 22.0,
 'Je suis venu lire cet article pour éviter de faire mes tâches. Je valide pleinement l''expérience et les conclusions.',
 '{}', '[]', NOW() - interval '3 days'),

-- Procrastination × elena_rossi (public)
('f0000000-0000-0000-0000-000000000010',
 'a0000000-0000-0000-0000-000000000005',
 'https://en.wikipedia.org/wiki/Procrastination',
 'https://yhavbvgahhtlddyrycai.supabase.co/storage/v1/object/sign/screenshots/seed/f10.webp?token=seed',
 'seed/f10.webp', 72.0, 58.0,
 'Cette page est dans mon historique de navigation depuis 2021. Je ne l''ai jamais lue en entier. L''article a une section là-dessus à la page 3.',
 '{}', '[]', NOW() - interval '2 days'),

-- Helvetica × bob_dupont (public)
('f0000000-0000-0000-0000-000000000011',
 'a0000000-0000-0000-0000-000000000002',
 'https://en.wikipedia.org/wiki/Helvetica',
 'https://yhavbvgahhtlddyrycai.supabase.co/storage/v1/object/sign/screenshots/seed/f11.webp?token=seed',
 'seed/f11.webp', 38.0, 36.0,
 'Helvetica a été créée pour remplacer Akzidenz-Grotesk. Personne n''a jamais spontanément choisi "Akzidenz-Grotesk" donc mission accomplie.',
 '{}', '[]', NOW() - interval '8 days'),

-- Helvetica × clara_chen (public)
('f0000000-0000-0000-0000-000000000012',
 'a0000000-0000-0000-0000-000000000003',
 'https://en.wikipedia.org/wiki/Helvetica',
 'https://yhavbvgahhtlddyrycai.supabase.co/storage/v1/object/sign/screenshots/seed/f12.webp?token=seed',
 'seed/f12.webp', 62.0, 80.0,
 'Il y a 14 variantes listées : Neue, Now, Rounded, Compressed... Beaucoup pour une police qui se dit "neutre".',
 '{}', '[]', NOW() - interval '6 days'),

-- Nicolas Cage × bob_dupont (public)
('f0000000-0000-0000-0000-000000000013',
 'a0000000-0000-0000-0000-000000000002',
 'https://en.wikipedia.org/wiki/Nicolas_Cage',
 'https://yhavbvgahhtlddyrycai.supabase.co/storage/v1/object/sign/screenshots/seed/f13.webp?token=seed',
 'seed/f13.webp', 28.0, 55.0,
 'Il a changé son nom de Coppola à Cage pour ne pas profiter de la réputation de son oncle Francis Ford Coppola. C''est le move le plus audacieux de l''histoire de Hollywood.',
 '{}', '[]', NOW() - interval '4 days'),

-- Nicolas Cage × kevin_lee (public)
('f0000000-0000-0000-0000-000000000014',
 'a0000000-0000-0000-0000-000000000006',
 'https://en.wikipedia.org/wiki/Nicolas_Cage',
 'https://yhavbvgahhtlddyrycai.supabase.co/storage/v1/object/sign/screenshots/seed/f14.webp?token=seed',
 'seed/f14.webp', 85.0, 30.0,
 'Section "Acting style" : Wikipedia utilise le mot "maximalist" avec un respect évident. On apprend des choses.',
 '{}', '[]', NOW() - interval '1 day');

-- ── Comment recipients (all public) ──────────────────────────────────────────
INSERT INTO comment_recipients (comment_id, recipient_type, recipient_id) VALUES
  ('f0000000-0000-0000-0000-000000000001',  'public', 'b38c37cf-e40b-4ab9-8ac7-95fae3875c68'),
  ('f0000000-0000-0000-0000-000000000002',  'public', 'b38c37cf-e40b-4ab9-8ac7-95fae3875c68'),
  ('f0000000-0000-0000-0000-000000000003',  'public', 'b38c37cf-e40b-4ab9-8ac7-95fae3875c68'),
  ('f0000000-0000-0000-0000-000000000004',  'public', 'b38c37cf-e40b-4ab9-8ac7-95fae3875c68'),
  ('f0000000-0000-0000-0000-000000000005',  'public', 'b38c37cf-e40b-4ab9-8ac7-95fae3875c68'),
  ('f0000000-0000-0000-0000-000000000006',  'public', 'b38c37cf-e40b-4ab9-8ac7-95fae3875c68'),
  ('f0000000-0000-0000-0000-000000000007',  'public', 'b38c37cf-e40b-4ab9-8ac7-95fae3875c68'),
  ('f0000000-0000-0000-0000-000000000008',  'public', 'b38c37cf-e40b-4ab9-8ac7-95fae3875c68'),
  ('f0000000-0000-0000-0000-000000000009',  'public', 'b38c37cf-e40b-4ab9-8ac7-95fae3875c68'),
  ('f0000000-0000-0000-0000-000000000010',  'public', 'b38c37cf-e40b-4ab9-8ac7-95fae3875c68'),
  ('f0000000-0000-0000-0000-000000000011',  'public', 'b38c37cf-e40b-4ab9-8ac7-95fae3875c68'),
  ('f0000000-0000-0000-0000-000000000012',  'public', 'b38c37cf-e40b-4ab9-8ac7-95fae3875c68'),
  ('f0000000-0000-0000-0000-000000000013',  'public', 'b38c37cf-e40b-4ab9-8ac7-95fae3875c68'),
  ('f0000000-0000-0000-0000-000000000014',  'public', 'b38c37cf-e40b-4ab9-8ac7-95fae3875c68');
