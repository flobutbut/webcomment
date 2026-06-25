# Audit de sécurité — WebComment v0.6.0

> Réalisé le 2026-06-25. À mettre à jour à chaque version majeure ou changement d'architecture.

## Synthèse

L'architecture générale est solide : RLS activé sur toutes les tables, JWT vérifié côté serveur dans les Edge Functions, bucket Storage privé, fonctions SECURITY DEFINER avec `search_path` fixé. Aucune injection SQL ou XSS critique n'a été trouvée.

---

## HAUTE — À corriger

### H1 — Email exposé à tous les utilisateurs authentifiés

`profiles` contient `email`, et la politique RLS autorise tous les utilisateurs authentifiés à lire toute la table :

```sql
-- profiles_select
for select using (auth.role() = 'authenticated');
```

De plus `searchUsers` dans `extension/src/background/service-worker.ts:262` retourne `email` dans les résultats de recherche. N'importe quel utilisateur connecté peut donc récupérer l'email de n'importe qui via une recherche.

**Fix** : supprimer `email` du `SELECT` de la recherche et ne retourner que `id, username, avatar_url`. Si l'email est nécessaire pour envoyer à des non-inscrits, ce chemin doit passer par une Edge Function, pas par un accès direct à la table.

---

### H2 — Absence de rate limiting sur `send-comment`

N'importe quel utilisateur authentifié peut envoyer un nombre illimité de commentaires. La table `comment_recipients` n'a aucune protection contre le flood. Un acteur malveillant peut spammer tous les utilisateurs. Seul `demo_comments` a un rate limit (50/heure — migration 14).

**Fix** : ajouter un compteur dans `supabase/functions/send-comment/index.ts` (ex. max 20 commentaires par heure par utilisateur, en interrogeant `comments.created_at`).

---

## MOYENNE — À traiter

### M1 — `resolve-share-link` sans authentification expose l'identité du créateur

`supabase/functions/resolve-share-link/index.ts` utilise le service role et n'exige aucune authentification. Toute personne avec un token obtient :

```json
{ "recipient_id": "uuid", "recipient_name": "username", "url": "..." }
```

Le `recipient_id` couplé au `recipient_name` constitue de l'énumération d'utilisateurs sans authentification.

**Fix** : ne pas retourner `recipient_name` si inutile côté client, ou exiger un JWT pour accéder à la résolution.

---

### M2 — CORS `Access-Control-Allow-Origin: *` sur toutes les Edge Functions

`send-comment`, `delete-account`, `resolve-share-link` ont toutes un CORS wildcard. `resolve-share-link` étant sans authentification, n'importe quelle page web peut le requêter librement.

**Fix** : restreindre à `https://webcomment.app` et `chrome-extension://<ID>` pour les fonctions authentifiées.

---

### M3 — Aucune validation d'entrée dans `send-comment`

`supabase/functions/send-comment/index.ts:46-47` accepte sans validation :

- `body` : pas de longueur max (stockage illimité, emails illimités)
- `to` : pas de limite sur le nombre de destinataires (un seul appel peut résoudre des centaines de membres de groupe et envoyer des dizaines d'emails)
- `pin_x` / `pin_y` : pas de vérification de plage 0–100
- `url` : pas de validation de format URL

**Fix** : ajouter des gardes en début de fonction (body ≤ 5000 chars, `to` ≤ 20 entrées, `pin_x`/`pin_y` clampé 0–100, `new URL(url)` sans throw).

---

### M4 — Corps du commentaire inclus dans l'email de notification

`supabase/functions/notify-email/index.ts:83` envoie le `comment.body` en clair dans le template HTML. Ce comportement est un bloquant pour tout chiffrement E2E — voir section dédiée.

---

### M5 — `notify-email` retourne les adresses email dans la réponse

```ts
return new Response(JSON.stringify({ sent, toEmails, errors, hasApiKey: !!RESEND_API_KEY }), ...)
```

`toEmails` contient les adresses complètes de tous les destinataires. Ce payload est visible dans les logs Supabase Edge Function.

**Fix** : ne retourner que `{ sent, errors: errors.length }` en production.

---

## BASSE — À surveiller

### B1 — Session JWT dans `chrome.storage.local`

Standard pour les extensions MV3 (localStorage inaccessible au service worker), mais `chrome.storage.local` est lisible par d'autres extensions ayant la permission `storage`. Risque limité, documenté.

### B2 — `screenshot_url` en base devient invalide après 7 jours

La colonne `comments.screenshot_url` stocke l'URL signée (7 jours). Elle est obsolète passé ce délai. L'application gère ça via `get-signed-url` mais un client qui lirait directement la DB verrait une URL morte.

### B3 — `pendingCapture` non nettoyé sur crash

Si le service worker est tué entre `PREPARE_CAPTURE` et `FINALIZE_COMMENT`, un screenshot orphelin reste dans le bucket sans commentaire associé. `cleanup-screenshots` est censé couvrir ce cas — à vérifier.

### B4 — Pas de politique DELETE sur `profiles`

Un utilisateur ne peut pas supprimer directement son profil (uniquement via `delete-account` qui utilise `auth.admin.deleteUser`). C'est intentionnel, et la cascade `on delete cascade` sur `auth.users → profiles` couvre la suppression complète.

---

## Ce qui est bien fait ✓

- RLS activé sur toutes les tables, politiques granulaires et correctes
- JWT vérifié server-side via `supabase.auth.getUser()` (pas de simple décodage client)
- `handle_new_user` : `search_path` fixé (migration 8), vulnérabilité historique corrigée
- `SECURITY DEFINER` sur `create_demo_comment` avec rate limit et cap total
- `delete_token` caché via `REVOKE SELECT` (migration 14)
- Bucket `screenshots` privé, accès uniquement via URL signée
- `escapeHtml()` utilisé dans les templates email et dans le content script
- Shadow DOM dans le content script évite les conflits CSS et XSS sur la page hôte
- Guard `__webcomment_injected` évite la double injection du content script

---

## Évaluation — Chiffrement des commentaires en base

### Modèle de menace

| Menace | Couverture actuelle | Vault (Option A) | Clé serveur (Option B) | E2EE (Option C) |
|---|---|---|---|---|
| Fuite de dump SQL | Non couverte | Couverte | Couverte | Couverte |
| Accès DB direct non autorisé | Partiellement (RLS) | Couverte | Couverte | Couverte |
| Accès via service role (Edge Functions) | Non couverte | Non couverte | Non couverte | Couverte |
| Accès Supabase (infrastructure) | Non couverte | Non couverte | Non couverte | Couverte |
| Interception réseau | Couverte (TLS) | — | — | — |

---

### Option A — Chiffrement niveau base (Supabase Vault)

Supabase Vault chiffre des colonnes spécifiques avec une clé gérée par Supabase. Transparent pour le code applicatif.

**Avantages** : zéro refactoring, protège contre les fuites de dump SQL  
**Limites** : Supabase peut toujours lire les données (clé en leur possession). Ne change rien à la confidentialité vis-à-vis de la plateforme.  
**Complexité** : faible — 1 migration SQL

---

### Option B — Chiffrement applicatif côté serveur (clé dans les secrets Edge)

La Edge Function `send-comment` chiffre le `body` avec une clé AES stockée dans les variables d'environnement Supabase. La lecture passe par une Edge Function qui déchiffre à la volée.

**Avantages** : protège contre l'accès direct à la DB sans la clé Edge  
**Limites** : Supabase a toujours accès aux secrets des Edge Functions. Une clé unique compromet tous les commentaires d'un coup.  
**Bloquants** :
- `notify-email` doit déchiffrer pour envoyer le corps — la clé doit être disponible là aussi
- Les tags `#hashtag` sont extraits du body en clair dans `send-comment` — le chiffrement doit se faire *après* l'extraction
- La vue `comment_inbox` est SQL pure — toute lecture du body devra passer par une Edge Function

**Complexité** : moyenne — modifier `send-comment`, créer une fonction de lecture, changer tous les appels `supabase.from('comment_inbox').select()`

---

### Option C — E2EE (seuls l'expéditeur et les destinataires déchiffrent)

Chaque utilisateur a une keypair (X25519). L'expéditeur dérive une clé symétrique par ECDH avec chaque destinataire, chiffre le body avec AES-GCM, et stocke une copie chiffrée par destinataire.

**Avantages** : vrai zero-knowledge — Supabase ne peut pas lire les messages  
**Bloquants majeurs** :
1. **Email de notification** : le body est actuellement inclus dans l'email (`notify-email/index.ts:83`). L'E2EE force à réduire l'email à « vous avez un nouveau commentaire » sans contenu.
2. **Tags et @mentions** : extraits côté serveur dans `send-comment` — doivent migrer côté client et être envoyés comme métadonnées séparées.
3. **Groupes** : chaque message doit être chiffré individuellement pour chaque membre — N chiffrements par message, scalabilité limitée.
4. **Screenshots** : les images restent en clair dans Storage — l'E2EE est incomplet sans chiffrement côté client des captures.
5. **Récupération de clé** : si un utilisateur perd sa clé privée, tous ses messages sont irrécupérables.
6. **Webapp** : même logique de déchiffrement à implémenter en parallèle.

**Complexité** : très élevée — 3-4 semaines minimum

---

## Recommandations prioritaires

1. **Maintenant** : corriger **H1** (email dans la recherche) et **H2** (rate limiting) — les seuls problèmes qui affectent les utilisateurs en production aujourd'hui.
2. **Court terme** : appliquer **M3** (validation d'entrée dans `send-comment`) et **M5** (ne pas exposer les emails dans la réponse `notify-email`).
3. **Chiffrement** : l'**Option A (Vault)** est la seule réaliste sans refactoring majeur — elle vaut le coup uniquement si la conformité ou les audits l'exigent. L'**E2EE (Option C)** est l'unique option qui protège réellement le contenu contre l'infrastructure, mais reste prématurée avant une base d'utilisateurs établie. À planifier en roadmap post-v1.0.
