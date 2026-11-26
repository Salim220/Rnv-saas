# GiveFlow

Application de dons pour particuliers : chaque personne a une page publique, reçoit des **demandes de soutien anonymes**, et suit chaque étape jusqu'au versement dans son dashboard. Connexion par **lien magique envoyé par e-mail**. Une console admin permet d'approuver les demandes, de marquer les versements comme effectués et de consulter les **coordonnées bancaires complètes** nécessaires aux virements manuels.

> Version finale : plus de mode démo, plus de PayPal ni de Dwolla, plus de code OTP affiché à l'écran. Le site est statique (GitHub Pages) mais utilise Supabase comme backend. Aucun nom, e-mail ou message de donateur n'est collecté. Aucun mot de passe n'est stocké.

## 1. Configuration Supabase (obligatoire)

1. Crée un projet sur [supabase.com](https://supabase.com).
2. Colle `supabase/schema.sql` dans **SQL Editor** et exécute. Si tu avais déjà appliqué un ancien schéma, exécute dans l'ordre `supabase/migration_manual_payouts.sql` puis `supabase/migration_admin_privacy.sql`.
3. **Authentication → Providers → Email** : active le provider.
4. **Authentication → Sign In / Providers → Email** : garde le template par défaut. Supabase envoie un **lien de connexion** (pas un code à 6 chiffres) : l'app utilise le flux *magic link* en PKCE, elle ramène automatiquement l'utilisateur sur `#/dashboard` après le clic. Aucun template personnalisé n'est nécessaire (et l'édition des templates est de toute façon réservée aux projets Pro / SMTP custom).
5. **Authentication → URL Configuration** : ajoute `https://salim220.github.io/Rnv-saas/` (et `http://127.0.0.1:5173/` pour le local) dans **Redirect URLs**. Sinon Supabase ignore `emailRedirectTo`, retombe sur la *Site URL* et le lien ne peut pas ouvrir de session.
6. Copie `.env.example` vers `.env.local` et renseigne `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`. La clé `anon` est publique par design : la sécurité vient des policies RLS de `schema.sql`.
7. Les deux e-mails admin sont `ouorousalim2@gmail.com` et `co-admin@giveflow.local` (remplace le second quand tu le connais). Ils doivent être **identiques à trois endroits** : la table `public.admin_emails` du SQL (qui fait autorité via RLS), la valeur par défaut de `src/lib/admin.ts`, et le secret/variable `VITE_ADMIN_EMAILS`. Chaque admin a son propre lien de connexion, aucun identifiant partagé. Si les listes divergent, l'interface laisse entrer l'admin mais toutes les requêtes sont refusées par la RLS.

Sans ces variables, le site affiche un écran « Configuration required » au lieu d'un faux mode démo.

## 2. Déploiement GitHub Pages

Le dépôt est déjà configuré : **https://github.com/Salim220/Rnv-saas**

- Pages est activé avec la source **GitHub Actions**.
- Le workflow `.github/workflows/deploy.yml` construit et déploie à chaque push sur `main`.
- Lien public : **https://salim220.github.io/Rnv-saas/**

Ajoute dans **Settings → Secrets and variables → Actions** ces secrets :

| Secret | Valeur |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | clé anon du projet |
| `VITE_ADMIN_EMAILS` | `ouorousalim2@gmail.com,co-admin@giveflow.local` |

`VITE_ADMIN_EMAILS` surcharge simplement la liste du verrou d'interface : ces adresses sont publiques dans le bundle, la RLS de `public.admin_emails` reste la seule frontière de sécurité. Si le secret est absent, la valeur par défaut de `src/lib/admin.ts` s'applique.

Puis relance le workflow. Les URLs utilisent des hashes (`/#/u/<handle>`, `#/admin`) : c'est volontaire, cela évite les redirections serveur que GitHub Pages ne gère pas.

```bash
git add .
git commit -m "Update GiveFlow"
git push origin main
```

## 3. Parcours utilisateur

| Parcours | URL |
| --- | --- |
| Accueil | `/` |
| Connexion par lien e-mail | `#/signin` |
| Dashboard receveur | `#/dashboard` |
| Console admin | `#/admin` |
| Page publique d'un receveur | `#/u/<handle>` |
| Confirmation après demande | `#/thank-you` |

1. Le receveur saisit son e-mail, clique sur le lien reçu et complète sa page.
2. Il renseigne ses **coordonnées bancaires** (titulaire, banque, routing number, numéro de compte, type) dans `#/dashboard`. Elles sont enregistrées dans `payout_accounts`.
3. Un donneur ouvre `#/u/<handle>`, choisit un montant et envoie une demande **anonyme**. Aucun paiement en ligne n'est effectué.
4. L'admin approuve ou refuse dans `#/admin` avec un motif, puis clique sur **Mark paid** après avoir fait le virement manuellement.
5. Le receveur voit la progression **Requested → Reviewed → Paid out** dans son dashboard, actualisée toutes les 15 secondes.

## 4. Console admin

Route : `#/admin`. Accès réservé aux deux e-mails de `VITE_ADMIN_EMAILS`, avec une double protection :

- verrou d'interface par e-mail ;
- **RLS Supabase** : `public.is_admin()` vérifie l'e-mail du JWT dans `public.admin_emails` pour les lectures et les mises à jour sensibles.

La console affiche :

- les indicateurs : total levé, **montant versé**, bénéficiaires, demandes en attente ;
- le tableau des bénéficiaires avec recherche et fiche détaillée ;
- le tableau de tous les dons anonymes avec **approve / reject / mark paid** et motif ;
- le tableau des **coordonnées bancaires complètes**, le **JSON brut** et un bouton de téléchargement (`data/payout-accounts.example.json` montre le format) ;
- l'export CSV des bénéficiaires ;
- le **journal d'audit** : consultation de profil, décisions, versements, admin, date et motif.

Les dons arrivent en `pending` et n'entrent dans les totaux qu'après approbation. Le statut `paid` clôt le suivi receveur.

⚠️ Les coordonnées bancaires sont des données sensibles. Elles sont visibles uniquement par leur propriétaire et les deux admins grâce aux policies RLS. Ne publie jamais le JSON exporté et ne mets jamais de mot de passe dans ces champs : aucun mot de passe n'est nécessaire pour un virement ACH manuel.

## 5. Limites connues

| Sujet | État | Point d'attention |
| --- | --- | --- |
| Connexion par e-mail | ✅ Supabase Auth, magic link PKCE | Le lien doit ramener sur l'URL du site (`emailRedirectTo`) et cette URL doit être autorisée dans **Redirect URLs** |
| Stockage des dons | ✅ anonyme, Supabase | Ajouter un rate limit anti-spam |
| Console admin | ✅ verrou UI + RLS | `VITE_ADMIN_EMAILS` reste public dans le bundle, mais la RLS fait autorité |
| Paiement en ligne | ❌ retiré | Les virements sont manuels |
| Suivi receveur | ✅ statuts + auto-refresh 15 s | Ajouter des notifications e-mail si souhaité |
| Coordonnées bancaires | ✅ visibles admin | Chiffrer/auditer selon tes obligations ; aucun mot de passe stocké |
| Profil public | ✅ vue `public_profiles` | Le public ne lit que les colonnes de la page de don, jamais `payout_email` |
| Fiscalité | ⚠️ | Un don à un particulier **n'est pas déductible** aux États-Unis |
| Conformité | ⚠️ | Conditions d'utilisation, confidentialité et lutte contre la fraude à prévoir |

## Stack

Vite + React 19 + TypeScript + Tailwind v4 + React Router (HashRouter) + Supabase Auth/Postgres + Lucide.
