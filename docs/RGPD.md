# Audit RGPD — WebComment

> Dernière mise à jour : 2026-06-26
> Sources : Règlement (UE) 2016/679, lignes directrices CEPD, doctrine CNIL

---

## Méthodologie

Analyse exhaustive de : 20+ migrations SQL, 8 Edge Functions, service worker extension (~660 lignes), composants webapp, intégrations tiers.

**Sources de référence**
- RGPD : Règlement (UE) 2016/679
- CNIL : https://www.cnil.fr/fr/rgpd-de-quoi-parle-t-on
- CEPD : Guidelines on transparency (WP260), on data portability (WP242), on right to erasure (WP17/EN/0644)
- ICO (référence technique) : https://ico.org.uk/for-organisations/guide-to-data-protection/

---

## Vue d'ensemble des données traitées

| Catégorie | Données | Lieu de stockage |
|---|---|---|
| Identité | email, username, initiales, avatar | `auth.users`, `profiles` |
| Contenu | corps du commentaire, tags, mentions | `comments` |
| Navigation | URLs commentées, pin_x/pin_y, sélecteur DOM | `comments`, `url_follows` |
| Capture d'écran | image WebP du viewport | Supabase Storage |
| Relationnels | contacts, groupes, follows | `contacts`, `group_members`, `follows` |
| Tiers non-inscrits | email des destinataires non-membres | `comment_recipients.recipient_email` |
| Session | JWT token, profil en cache | `chrome.storage.local` |
| Analytics | IP, user-agent, pages visitées | Vercel Analytics |

---

## Récapitulatif des non-conformités

| # | Problème | Article RGPD | Priorité |
|---|---|---|---|
| 1 | Email exposé à tous les utilisateurs authentifiés (RLS) | Art. 5(1)(f), Art. 25 | 🔴 Critique |
| 2 | Pas de politique de confidentialité | Art. 13 | 🔴 Critique |
| 3 | Pas de mention légale dans les emails tiers | Art. 14 | 🔴 Critique |
| 4 | Screenshots non supprimés à la suppression du compte | Art. 5(1)(e), Art. 17 | 🔴 Critique |
| 5 | Vercel Analytics sans consentement | Art. 6, Art. 7 | 🟠 Important |
| 6 | Pas d'export de données (portabilité) | Art. 20 | 🟠 Important |
| 7 | Pas de durée de conservation sur `recipient_email` | Art. 5(1)(e) | 🟠 Important |
| 8 | DPA non signés (Supabase, Resend, Vercel) | Art. 28 | 🟠 Important |
| 9 | Google Favicon API fuite les domaines consultés | Art. 5(1)(c), Art. 25 | 🟠 Important |
| 10 | Share links sans expiration par défaut | Art. 5(1)(e) | 🟠 Important |
| 11 | Registre des traitements absent | Art. 30 | 🟡 Recommandé |
| 12 | Région Supabase non documentée (transferts hors UE) | Art. 44–49 | 🟡 Recommandé |
| 13 | Corps du commentaire inclus dans l'email | Art. 5(1)(c) | 🟡 Recommandé |
| 14 | Pas d'opt-out notifications email | Art. 21 | 🟡 Recommandé |

---

## 1. Base légale du traitement — Art. 6 RGPD

**Statut : INCOMPLET**

Le RGPD exige que chaque traitement repose sur une base légale identifiée *avant* le traitement. Aucune base légale n'est formalisée dans le projet.

| Traitement | Base légale applicable |
|---|---|
| Compte utilisateur (email, mot de passe) | Art. 6(1)(b) — exécution du contrat |
| Contenu des commentaires | Art. 6(1)(b) — exécution du contrat |
| Envoi d'emails transactionnels | Art. 6(1)(b) |
| Vercel Analytics | Art. 6(1)(a) — consentement **ou** Art. 6(1)(f) intérêt légitime avec opt-out |
| Emails tiers non-inscrits | ⚠️ Aucune base légale clairement établie |

**Action** : Documenter chaque base légale dans la politique de confidentialité.

> Référence CNIL : ["Les bases légales du traitement"](https://www.cnil.fr/fr/les-bases-legales-du-traitement-de-donnees)

---

## 2. Transparence et information — Art. 13 & 14 RGPD

**Statut : NON CONFORME** 🔴

L'article 13 exige qu'au moment de la collecte, l'utilisateur soit informé de : l'identité du responsable de traitement, les finalités, la base légale, les destinataires, la durée de conservation, et ses droits.

**Ce qui est absent**
- [ ] Politique de confidentialité (aucune sur webcomment.app)
- [ ] Politique de confidentialité dans le Chrome Web Store (obligatoire pour les extensions avec `<all_urls>`)
- [ ] Mention d'information lors de l'inscription
- [ ] Information sur Vercel Analytics (collecte silencieuse)
- [ ] Information sur Resend (tiers qui reçoit des données)

L'extension déclare la permission `<all_urls>` et accède au DOM de toutes les pages visitées. Le Chrome Web Store **exige** une Privacy Policy pour toute extension accédant à des données utilisateur. Sans elle, l'extension risque d'être retirée du store.

**Action** : Créer `webcomment.app/privacy` et la référencer dans le Chrome Web Store.

> Référence CNIL : ["Droit à l'information des personnes"](https://www.cnil.fr/fr/le-droit-linformation-des-personnes)

---

## 3. Durée de conservation — Art. 5(1)(e) RGPD

**Statut : NON CONFORME** 🔴

| Donnée | Durée actuelle | Problème |
|---|---|---|
| Commentaires | Indéfinie | Aucune purge automatique |
| Screenshots | Indéfinie, même après suppression du compte | `delete-account` ne supprime pas les fichiers Storage |
| `comment_recipients.recipient_email` | Indéfinie | Email d'un tiers conservé sans durée définie |
| Share links (`expires_at = NULL`) | Permanente | Accès permanent par défaut |
| URLs suivies (`url_follows`) | Indéfinie | Historique de navigation proxy |

**Correction prioritaire — screenshots dans `delete-account`**

La Edge Function `delete-account` appelle `supabase.auth.admin.deleteUser()` qui cascade les tables SQL mais **ne supprime pas les fichiers dans Supabase Storage**. Ajouter avant la suppression :

```typescript
// Dans delete-account/index.ts, avant deleteUser()
const { data: files } = await supabase.storage
  .from('screenshots')
  .list(user.id);

if (files?.length) {
  const paths = files.map(f => `${user.id}/${f.name}`);
  await supabase.storage.from('screenshots').remove(paths);
}
```

> Référence CEPD : Guidelines on the right to erasure (WP17/EN/0644)

---

## 4. Emails de tiers non-inscrits — Art. 6 + Art. 14 RGPD

**Statut : RISQUE ÉLEVÉ** 🔴

Quand un commentaire est envoyé à une adresse email non enregistrée, l'adresse est :
1. Stockée définitivement dans `comment_recipients.recipient_email`
2. Utilisée pour envoyer un email via Resend

Le tiers non-inscrit n'a jamais consenti. L'article 14 RGPD exige que le responsable l'informe au moment du premier contact de ses droits (accès, suppression, opposition).

**Correction minimale requise dans le template d'email**

```html
<p style="font-size:12px;color:#888;margin-top:24px;border-top:1px solid #eee;padding-top:12px;">
  Vous recevez cet email car quelqu'un a partagé un commentaire avec vous via
  <a href="https://webcomment.app">WebComment</a>.<br>
  Pour ne plus recevoir ces emails :
  <a href="https://webcomment.app/unsubscribe?token={unsubscribe_token}">se désinscrire</a>.
  <a href="https://webcomment.app/privacy">Politique de confidentialité</a>.
</p>
```

**Corrections complémentaires**
- Implémenter une table `email_suppressions` (email + token) pour gérer les désinscriptions
- Définir une durée de conservation sur `comment_recipients.recipient_email` (ex : 90 jours après le dernier envoi)

> Référence CNIL : ["Obligations à l'égard des personnes dont les données sont collectées indirectement"](https://www.cnil.fr/fr/les-droits-des-personnes)

---

## 5. Droits des personnes — Art. 15 à 22 RGPD

**Statut : PARTIELLEMENT CONFORME**

| Droit | Art. | Statut | Note |
|---|---|---|---|
| Accès | 15 | ⚠️ Partiel | Dashboard visible, pas d'export exhaustif |
| Rectification | 16 | ✅ | Page Settings (username, avatar, initiales) |
| Effacement | 17 | ⚠️ Partiel | Suppression de compte, mais screenshots orphelins |
| Limitation | 18 | ❌ | Non implémenté |
| Portabilité | 20 | ❌ | Aucun endpoint d'export JSON/CSV |
| Opposition | 21 | ❌ | Pas d'opt-out analytics, pas de désinscription email |

**Portabilité (Art. 20) — endpoint à créer**

Endpoint suggéré : `GET /api/export` (authentifié), retourne un JSON avec :
```json
{
  "profile": { "username", "email", "initials", "avatar_url", "created_at" },
  "comments_sent": [ { "url", "body", "tags", "mentions", "created_at" } ],
  "comments_received": [ { ... } ],
  "follows": [ { "followed_username", "created_at" } ],
  "url_follows": [ { "url", "created_at" } ]
}
```

> Référence CEPD : Guidelines on the right to data portability (WP242) — délai de réponse : 30 jours.

---

## 6. Email exposé via RLS — Art. 5(1)(f) + Art. 25 RGPD

**Statut : VIOLATION CARACTÉRISÉE** 🔴

La politique RLS actuelle sur `profiles` rend `profiles.email` lisible par **tout utilisateur authentifié**. La fonction `searchUsers()` retourne les adresses email dans ses résultats.

Violation du principe d'**intégrité et de confidentialité** (Art. 5(1)(f)) et de **protection des données dès la conception** (Art. 25).

**Correction SQL**

```sql
-- Supprimer email de la vue publique des profils
ALTER POLICY "profiles_select_policy" ON profiles
  USING (auth.uid() = id);

-- Créer une fonction RPC avec service role pour les lookups email (usage interne uniquement)
CREATE OR REPLACE FUNCTION lookup_user_by_email(target_email TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
  SELECT id FROM profiles WHERE email = target_email LIMIT 1;
$$;
```

> Référence RGPD : Art. 25 — "Protection des données dès la conception et par défaut".

---

## 7. Vercel Analytics sans consentement — Art. 6 + Art. 7 RGPD

**Statut : NON CONFORME** 🟠

Le composant `<Analytics />` collecte IP, user-agent, pages et référents **avant tout consentement**. Pour les visiteurs UE, cela nécessite soit un consentement explicite, soit un recours à l'intérêt légitime avec opt-out visible.

**Options**

| Option | Conformité | Complexité |
|---|---|---|
| Bannière de consentement + chargement conditionnel | ✅ Maximale | Moyenne |
| Vercel Analytics en mode anonymisé (`Data Control`) | ✅ Acceptable | Faible |
| Supprimer `<Analytics />` | ✅ Maximale | Minimale |

**Mode anonymisé Vercel (solution rapide)**

```typescript
// webapp/src/App.tsx
import { Analytics } from '@vercel/analytics/react';

<Analytics
  beforeSend={(event) => {
    // Supprimer les paramètres de recherche potentiellement sensibles
    const url = new URL(event.url);
    url.search = '';
    return { ...event, url: url.toString() };
  }}
/>
```

> Référence CNIL : [Cookies et traceurs — règles applicables](https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/que-dit-la-loi)

---

## 8. Sous-traitants — Art. 28 RGPD

**Statut : À VÉRIFIER** 🟠

L'article 28 exige un contrat de sous-traitance (DPA — Data Processing Agreement) avec chaque sous-traitant.

| Sous-traitant | DPA disponible | Action |
|---|---|---|
| **Supabase** | ✅ Dashboard → Settings → Legal | Signer et archiver |
| **Resend** | ✅ Sur demande (dpa@resend.com) | Signer et archiver |
| **Vercel** | ✅ [EU Data Transfer Addendum](https://vercel.com/legal/dpa) | Signer et archiver |
| **Google Favicon API** | ⚠️ CGU Google uniquement | Remplacer par alternative |

**Remplacement de l'API Favicon Google**

```typescript
// Avant (fuite de domaines à Google)
`https://www.google.com/s2/favicons?domain=${hostname}&sz=16`

// Après (DuckDuckGo, pas de tracking)
`https://icons.duckduckgo.com/ip3/${hostname}.ico`
```

> Référence : Art. 28(3) RGPD — le contrat doit préciser l'objet, la durée, la nature et la finalité du traitement.

---

## 9. Transferts hors UE — Art. 44 à 49 RGPD

**Statut : À DOCUMENTER** 🟡

Supabase, Resend et Vercel sont des entreprises américaines. Les transferts vers les États-Unis nécessitent une garantie appropriée.

| Service | Mécanisme | Action |
|---|---|---|
| Supabase | SCCs incluses dans DPA | Vérifier région du projet (`eu-west-1` recommandé) |
| Resend | SCCs dans DPA | Vérifier au moment de la signature |
| Vercel | EU Data Transfer Addendum | Inclus dans le DPA Vercel |

**Vérifier la région du projet Supabase**

```
Supabase Dashboard → Project Settings → General → Region
```

Si la région est `us-east-1`, envisager une migration vers `eu-west-2` (London) ou `eu-central-1` (Frankfurt) pour minimiser les transferts hors UE.

---

## 10. Registre des traitements — Art. 30 RGPD

**Statut : ABSENT** 🟡

Document interne obligatoire, disponible sur demande de la CNIL. Contenu minimal :

```
Responsable de traitement : [Prénom Nom], [email]

Traitement 1 : Gestion des comptes utilisateurs
  Finalité      : Authentification et accès au service
  Base légale   : Art. 6(1)(b) — exécution du contrat
  Personnes     : Utilisateurs inscrits
  Données       : Email, username, avatar, initiales
  Destinataires : Supabase (sous-traitant)
  Conservation  : Durée du compte + 30 jours après suppression
  Transferts    : Supabase (US) — SCCs

Traitement 2 : Envoi de commentaires
  Finalité      : Transmission de messages annotés entre utilisateurs
  Base légale   : Art. 6(1)(b)
  Personnes     : Utilisateurs + tiers destinataires
  Données       : Email, corps du commentaire, screenshots, URLs
  Destinataires : Supabase, Resend (sous-traitants)
  Conservation  : Indéfinie (à définir — voir §3)
  Transferts    : Supabase (US), Resend (US) — SCCs

Traitement 3 : Mesure d'audience
  Finalité      : Statistiques de fréquentation
  Base légale   : Art. 6(1)(a) — consentement
  Personnes     : Visiteurs du site
  Données       : IP anonymisée, user-agent, pages
  Destinataires : Vercel (sous-traitant)
  Conservation  : Politique Vercel Analytics (30 jours)
  Transferts    : Vercel (US) — EU DPA
```

---

## Ce qui est déjà conforme

- Row-Level Security activé sur toutes les tables
- Bucket Storage privé avec signed URLs temporaires (7 jours)
- Suppression en cascade via FK sur `auth.users`
- Suppression de compte accessible depuis Settings avec confirmation
- Pas de fingerprinting actif
- Pas de logging d'IP dans le code applicatif
- Screenshots en WebP privé, non accessibles publiquement

---

## Plan d'action

### Phase 1 — Critique (faire immédiatement)

- [ ] Corriger la politique RLS `profiles` pour ne plus exposer `email`
- [ ] Corriger `delete-account` pour supprimer les screenshots Storage
- [ ] Créer et publier `webcomment.app/privacy`
- [ ] Ajouter pied de page légal + lien de désinscription dans les emails

### Phase 2 — Important (dans les 30 jours)

- [ ] Bannière de consentement ou mode anonymisé pour Vercel Analytics
- [ ] Endpoint `/api/export` (portabilité Art. 20)
- [ ] Définir durée de conservation sur `comment_recipients.recipient_email`
- [ ] Signer et archiver les DPA Supabase, Resend, Vercel
- [ ] Remplacer Google Favicon API par DuckDuckGo
- [ ] Expiration par défaut sur les share links (30 jours)

### Phase 3 — Recommandé (moyen terme)

- [ ] Rédiger le registre des traitements (Art. 30)
- [ ] Vérifier et documenter la région Supabase
- [ ] Retirer le corps du commentaire des emails de notification
- [ ] Implémenter opt-out notifications email (table `email_suppressions`)
- [ ] AIPD si la base d'utilisateurs dépasse ~500 personnes
