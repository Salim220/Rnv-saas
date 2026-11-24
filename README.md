# GiveFlow

Application de dons pour particuliers : chaque personne a une page publique, reçoit des **demandes de soutien anonymes**, et suit chaque étape jusqu'au versement dans son dashboard. Connexion par **code OTP envoyé par e-mail**. Une console admin permet d'approuver les demandes, de marquer les versements comme effectués et de consulter les **coordonnées bancaires complètes** nécessaires aux virements manuels.

> Version finale : plus de mode démo, plus de PayPal ni de Dwolla, plus de code OTP affiché à l'écran. Le site est statique (GitHub Pages) mais utilise Supabase comme backend. Aucun nom, e-mail ou message de donateur n'est collecté. Aucun mot de passe n'est stocké.

## 1. Configuration Supabase (obligatoire)

1. Crée un projet sur [supabase.com](https://supabase.com).
2. Colle `supabase/schema.sql` dans **SQL Editor** et exécute. Si tu avais déjà appliqué un ancien schéma, exécute seulement `supabase/migration_manual_payouts.sql`.
3. **Authentication → Providers → Email** : active le provider.
4. **Authentication → Email Templates → Magic Link** : utilise ce modèle pour que l'utilisateur reçoive un code à 6 chiffres :

   ```html
   <p>Your GiveFlow sign-in code is:</p>
   <h1>{{ .Token }}</h1>
   <p>It expires in 1 hour. If you didn't ask for it, ignore this e-mail.</p>
   ```

5. Copie `.env.example` vers `.env.local` et renseigne `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`. La clé `anon` est publique par design : la sécurité vient des policies RLS de `schema.sql`.
6. Les deux e-mails admin sont définis par `VITE_ADMIN_EMAILS` (valeur par défaut : `admin@giveflow.local,co-admin@giveflow.local`). Chaque admin a son propre compte OTP, aucun identifiant partagé. Les mêmes adresses sont inscrites dans la table `public.admin_emails` du SQL.

Sans ces variables, le site affiche un écran « Configuration required » au lieu d'un faux mode démo.

## 2. Déploiement GitHub Pages

Le dépôt est déjà configuré : **https://github.com/Salim220/Rnv-saas**

- Pages est activé avec la source **GitHub Actions**.
- Le workflow `.github/workflows/deploy.yml` construit et déploie à chaque push sur `main`.
- Lien public : **https://salim220.github.io/Rnv-saas/**

Ajoute dans **Settings → Secrets and variables → Actions** ces trois secrets :

| Secret | Valeur |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | clé anon du projet |
| `VITE_ADMIN_EMAILS` | `admin@giveflow.local,co-admin@giveflow.local` |

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
| Connexion OTP | `#/signin` |
| Dashboard receveur | `#/dashboard` |
| Console admin | `#/admin` |
| Page publique d'un receveur | `#/u/<handle>` |
| Confirmation après demande | `#/thank-you` |

1. Le receveur se connecte avec son e-mail, reçoit le code par e-mail et complète sa page.
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
| OTP par e-mail | ✅ Supabase Auth | Configurer le template `{{ .Token }}` |
| Stockage des dons | ✅ anonyme, Supabase | Ajouter un rate limit anti-spam |
| Console admin | ✅ verrou UI + RLS | `VITE_ADMIN_EMAILS` reste public dans le bundle, mais la RLS fait autorité |
| Paiement en ligne | ❌ retiré | Les virements sont manuels |
| Suivi receveur | ✅ statuts + auto-refresh 15 s | Ajouter des notifications e-mail si souhaité |
| Coordonnées bancaires | ✅ visibles admin | Chiffrer/auditer selon tes obligations ; aucun mot de passe stocké |
| Fiscalité | ⚠️ | Un don à un particulier **n'est pas déductible** aux États-Unis |
| Conformité | ⚠️ | Conditions d'utilisation, confidentialité et lutte contre la fraude à prévoir |

## Stack

Vite + React 19 + TypeScript + Tailwind v4 + React Router (HashRouter) + Supabase Auth/Postgres + Lucide.
