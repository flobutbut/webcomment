-- RGPD: expiration par défaut 30 jours sur les share_links
-- Art. 5(1)(e) — limitation de la conservation
-- N'affecte que les nouveaux liens ; les liens existants sans expires_at restent inchangés.
alter table share_links
  alter column expires_at set default now() + interval '30 days';
