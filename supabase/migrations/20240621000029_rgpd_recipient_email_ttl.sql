-- RGPD: TTL 90 jours sur comment_recipients.recipient_email
-- Art. 5(1)(e) — limitation de la conservation
--
-- Prérequis : activer pg_cron dans le dashboard Supabase avant d'appliquer cette migration.
-- Database → Extensions → pg_cron → Enable
--
-- Le job tourne chaque nuit à 3h et supprime les lignes email
-- dont le destinataire n'a jamais créé de compte (recipient_type = 'email')
-- et dont la ligne a plus de 90 jours.

create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'purge-recipient-emails',
  '0 3 * * *',
  $$
    delete from public.comment_recipients
    where recipient_type = 'email'
      and created_at < now() - interval '90 days';
  $$
);
