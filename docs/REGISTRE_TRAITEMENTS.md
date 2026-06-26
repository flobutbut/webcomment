# Registre des activités de traitement

> Document interne — Art. 30 Règlement (UE) 2016/679 (RGPD)
> À tenir à jour et à présenter sur demande de la CNIL.
> Dernière mise à jour : 2026-06-26

---

## Responsable de traitement

| Champ | Valeur |
|---|---|
| Nom | Florian Butour |
| Qualité | Personne physique, éditeur de VoidMark |
| Email | privacy@voidmark.app |
| Site | https://voidmark.app |

Aucun délégué à la protection des données (DPD) désigné — non obligatoire à ce stade (Art. 37 RGPD).

---

## Traitement 1 — Gestion des comptes utilisateurs

| Champ | Détail |
|---|---|
| **Finalité** | Authentification, accès au service, gestion du profil |
| **Base légale** | Art. 6(1)(b) — exécution du contrat |
| **Personnes concernées** | Utilisateurs inscrits |
| **Données traitées** | Adresse email, mot de passe (haché), username, initiales, avatar, baseline, date de création |
| **Destinataires** | Supabase (sous-traitant — auth + base de données) |
| **Durée de conservation** | Durée du compte. Suppression à la demande de l'utilisateur via Settings → Delete account. |
| **Transferts hors UE** | Supabase Inc. (États-Unis) — couvert par SCCs |
| **Mesures de sécurité** | Mots de passe hachés (bcrypt via Supabase Auth), JWT avec expiration, HTTPS, RLS activé sur toutes les tables |

---

## Traitement 2 — Envoi et réception de commentaires

| Champ | Détail |
|---|---|
| **Finalité** | Permettre aux utilisateurs d'échanger des commentaires ancrés sur des pages web |
| **Base légale** | Art. 6(1)(b) — exécution du contrat |
| **Personnes concernées** | Utilisateurs inscrits (expéditeurs et destinataires) |
| **Données traitées** | Contenu du commentaire, URL de la page, coordonnées du pin (pin_x, pin_y), sélecteur DOM, tags, mentions, capture d'écran (WebP), horodatage, statuts de lecture/résolution |
| **Destinataires** | Supabase (sous-traitant — stockage DB + Storage), Resend (sous-traitant — notifications email) |
| **Durée de conservation** | Indéfinie tant que le commentaire n'est pas supprimé par l'auteur. À la suppression du compte, `from_user_id` est mis à NULL (commentaires conservés pour les destinataires, auteur anonymisé). |
| **Transferts hors UE** | Supabase Inc. (États-Unis) — SCCs ; Resend Inc. (États-Unis) — SCCs |
| **Mesures de sécurité** | RLS par utilisateur, bucket Storage privé (accès uniquement via signed URLs à durée limitée), screenshots déplacés vers dossier neutre à la suppression du compte |

---

## Traitement 3 — Captures d'écran

| Champ | Détail |
|---|---|
| **Finalité** | Fournir un contexte visuel aux commentaires |
| **Base légale** | Art. 6(1)(b) — exécution du contrat |
| **Personnes concernées** | Utilisateurs inscrits (auteurs du commentaire) |
| **Données traitées** | Image WebP du viewport visible au moment de la création du commentaire (peut contenir du contenu affiché à l'écran) |
| **Destinataires** | Supabase Storage (sous-traitant) |
| **Durée de conservation** | Liée au commentaire associé. Supprimée à la suppression du commentaire. À la suppression du compte : fichier déplacé vers `deleted/` (UUID retiré du chemin), conservé pour les destinataires. |
| **Transferts hors UE** | Supabase Inc. (États-Unis) — SCCs |
| **Mesures de sécurité** | Bucket privé, accès par signed URLs (7 jours), vérification destinataire/auteur dans `get-signed-url` |

---

## Traitement 4 — Notifications email transactionnelles

| Champ | Détail |
|---|---|
| **Finalité** | Informer les destinataires de la réception d'un commentaire ou d'une demande de contact |
| **Base légale** | Art. 6(1)(b) — exécution du contrat (utilisateurs inscrits) ; Art. 6(1)(f) — intérêt légitime (tiers non-inscrits notifiés d'un commentaire qui les concerne) |
| **Personnes concernées** | Utilisateurs inscrits + tiers non-inscrits mentionnés comme destinataires |
| **Données traitées** | Adresse email du destinataire, username de l'expéditeur, domaine de la page commentée, contenu du commentaire |
| **Destinataires** | Resend Inc. (sous-traitant — envoi SMTP) |
| **Durée de conservation** | Emails des tiers non-inscrits (`comment_recipients.recipient_email`) supprimés automatiquement après 90 jours (job pg_cron). Logs Resend : 30 jours (politique Resend). |
| **Transferts hors UE** | Resend Inc. (États-Unis) — SCCs |
| **Mesures de sécurité** | Footer légal avec opt-out dans chaque email, toggles de notification pour les utilisateurs inscrits, liste d'adresses retirée des logs Supabase |

---

## Traitement 5 — Relations sociales (contacts, follows, groupes)

| Champ | Détail |
|---|---|
| **Finalité** | Permettre aux utilisateurs de se connecter, de se suivre et de collaborer en groupes |
| **Base légale** | Art. 6(1)(b) — exécution du contrat |
| **Personnes concernées** | Utilisateurs inscrits |
| **Données traitées** | Identifiants des relations (requester_id, addressee_id, follower_id, followed_id), statut, rôle, horodatage |
| **Destinataires** | Supabase (sous-traitant) |
| **Durée de conservation** | Durée du compte. Supprimées en cascade à la suppression du compte. |
| **Transferts hors UE** | Supabase Inc. (États-Unis) — SCCs |
| **Mesures de sécurité** | RLS par utilisateur, RPCs SECURITY DEFINER pour les opérations sensibles |

---

## Traitement 6 — Liens de partage

| Champ | Détail |
|---|---|
| **Finalité** | Permettre de partager une page avec un destinataire pré-configuré via un token |
| **Base légale** | Art. 6(1)(b) — exécution du contrat |
| **Personnes concernées** | Utilisateurs inscrits (créateurs du lien) |
| **Données traitées** | Token (hex aléatoire), URL cible, domaine, scope, date de création, date d'expiration |
| **Destinataires** | Supabase (sous-traitant) |
| **Durée de conservation** | 30 jours par défaut (valeur `expires_at` automatique). Supprimés en cascade à la suppression du compte. |
| **Transferts hors UE** | Supabase Inc. (États-Unis) — SCCs |
| **Mesures de sécurité** | Tokens aléatoires (8 octets hex), expiration automatique, RLS propriétaire uniquement |

---

## Traitement 7 — Mesure d'audience (analytics)

| Champ | Détail |
|---|---|
| **Finalité** | Mesurer la fréquentation du site et améliorer le service |
| **Base légale** | Art. 6(1)(f) — intérêt légitime (analytics agrégées, sans profil individuel) |
| **Personnes concernées** | Visiteurs de voidmark.app |
| **Données traitées** | Pages visitées (query params supprimés), type de navigateur, OS, pays (géolocalisation IP), résolution d'écran, référent |
| **Destinataires** | Vercel Inc. (sous-traitant — Vercel Analytics) |
| **Durée de conservation** | 30 jours (politique Vercel Analytics) |
| **Transferts hors UE** | Vercel Inc. (États-Unis) — EU Data Transfer Addendum |
| **Mesures de sécurité** | `beforeSend` configuré pour supprimer les query params avant envoi, pas d'identifiant individuel persistant |

---

## Sous-traitants

| Sous-traitant | Rôle | Pays | Garantie transfert | DPA |
|---|---|---|---|---|
| Supabase Inc. | Base de données, auth, Storage, Edge Functions | États-Unis (région à confirmer) | SCCs | À signer — Dashboard → Settings → Legal |
| Resend Inc. | Envoi d'emails transactionnels | États-Unis | SCCs | À signer — dpa@resend.com |
| Vercel Inc. | Hébergement webapp, analytics | États-Unis | EU Data Transfer Addendum | À signer — Dashboard → Settings → Legal |

---

## Droits des personnes et procédure de réponse

Les demandes d'exercice de droits (accès, rectification, effacement, portabilité, opposition, limitation) sont reçues à : **privacy@voidmark.app**

Délai de réponse : **30 jours** (Art. 12 RGPD).

| Droit | Modalité technique |
|---|---|
| Accès | Réponse manuelle + export via Settings → Download |
| Rectification | Directement via Settings (username, initiales, avatar, email) |
| Effacement | Settings → Delete account (automatique) ou demande manuelle |
| Portabilité | Settings → Download (JSON, Art. 20) |
| Opposition aux notifications | Settings → Notifications (toggles) |
| Opposition aux analytics | Contacter privacy@voidmark.app |

En cas de réclamation non résolue : **CNIL** — https://www.cnil.fr/fr/plaintes

---

## Violations de données — procédure

En cas de violation susceptible d'engendrer un risque pour les droits et libertés des personnes (Art. 33) :

1. Évaluation de la gravité sous **72 heures**
2. Notification à la CNIL si risque avéré (formulaire en ligne sur cnil.fr)
3. Information des personnes concernées si risque élevé (Art. 34)
4. Documentation de l'incident dans ce registre

---

## Historique des mises à jour

| Date | Modification |
|---|---|
| 2026-06-26 | Création initiale du registre — audit RGPD complet |
