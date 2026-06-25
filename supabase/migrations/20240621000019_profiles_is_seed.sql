-- Distinguishes seed/demo profiles from real user accounts.
-- Real profiles are identified by having initials set (set during onboarding).
ALTER TABLE profiles ADD COLUMN is_seed boolean NOT NULL DEFAULT false;

UPDATE profiles
SET is_seed = true
WHERE id IN (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004'
);
