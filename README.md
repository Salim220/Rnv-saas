# GiveFlow — prototype

Prototype d'un SaaS américain de dons : chaque personne a une page publique, reçoit des **demandes de soutien anonymes**, et suit chaque étape jusqu'au versement dans son dashboard. Connexion par **code OTP envoyé par e-mail**. Une console admin affiche tous les profils, les dons, les références de payout masquées et un journal d'audit.

> Ce dépôt est un **prototype**. Il ne déplace aucun argent et **PayPal/Dwolla ont été retirés**. Un donneur envoie une demande, un admin l'approuve puis marque le versement comme effectué. Aucun nom, e-mail ou message de donateur n'est collecté. Aucun numéro de compte complet ni mot de passe n'est stocké : seules des références masquées sont enregistrées dans un JSON affiché à l'admin.

## 1. Lancer en local

```bash
npm install
npm run dev
```

Ouvre le lien affiché par Vite. Au premier lancement, le prototype est en **mode démo** :

- le code OTP est affiché à l'écran (pas d'e-mail) ;
- les profils et les dons sont stockés dans le `localStorage` du navigateur ;
- deux pages de démonstration existent : `#/u/jane` et `#/u/marcus` ;
- les deux comptes admin sont `admin@giveflow.local` et `co-admin@giveflow.local` (`#/admin`) ;
- un receveur peut renseigner une référence de compte masquée et suivre ses demandes dans `#/dashboard`.

## 2. Déploiement GitHub Pages

Le dépôt est déjà configuré : **https://github.com/Salim220/Rnv-saas**

- Pages est activé avec la source **GitHub Actions**.
- Le workflow `.github/workflows/deploy.yml` construit et déploie à chaque push sur `main`.
- Lien public : **https://salim220.github.io/Rnv-saas/**

Pour déployer une modification :

```bash
git add .
git commit -m "Update prototype"
git push origin main
```

Les URLs utilisent des hashes (`/#/u/jane`) : c'est volontaire, cela évite les redirections serveur que GitHub Pages ne gère pas.

## 3. Activer le vrai OTP par e-mail (optionnel)

Le site est statique : il ne peut pas envoyer d'e-mail lui-même. Supabase s'en charge.

1. Crée un projet sur [supabase.com](https://supabase.com).
2. Colle `supabase/schema.sql` dans **SQL Editor** et exécute. Si tu avais déjà appliqué un ancien schéma, exécute dans l'ordre : `supabase/migration_anonymous_donations.sql`, `supabase/migration_admin_approval.sql`, puis `supabase/migration_manual_payouts.sql`.
3. **Authentication → Providers → Email** : active-le.
4. **Authentication → Email Templates → Magic Link** : utilise ce modèle pour que l'utilisateur reçoive un code à 6 chiffres :

   ```html
   <p>Your GiveFlow sign-in code is:</p>
   <h1>{{ .Token }}</h1>
   <p>It expires in 1 hour. If you didn't ask for it, ignore this e-mail.</p>
   ```

5. Copie `.env.example` vers `.env.local` et renseigne :

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   ```

   La clé `anon` est publique par design ; la sécurité vient des policies RLS dans `schema.sql`.

6. Pour le site déployé, ajoute les deux mêmes valeurs dans **Settings → Secrets and variables → Actions**, puis relance le workflow. Le bandeau « Demo mode » disparaît et les codes arrivent par e-mail.

## 4. Console admin

Route : `#/admin`. Accès réservé à **deux e-mails exacts** définis dans `VITE_ADMIN_EMAILS` (par défaut `admin@giveflow.local,co-admin@giveflow.local`). Chaque admin a son propre compte OTP — aucun identifiant partagé. Pour le site déployé, ajoute aussi ce secret dans **Settings → Secrets and variables → Actions**.

La console affiche :

- les indicateurs globaux (total levé, bénéficiaires, dons, dons en attente de revue) ;
- le tableau de tous les bénéficiaires avec recherche : nom, handle, histoire, méthode et e-mail de payout, total levé, date d'inscription ;
- une fiche détaillée par personne avec l'historique de ses dons ;
- le tableau de tous les dons anonymes, avec **approbation / rejet**, **mark paid** et motif ;
- le tableau et le **JSON brut** des références de payout masquées, avec téléchargement (`data/payout-accounts.example.json` montre le format) ;
- l'export CSV des bénéficiaires ;
- le **journal d'audit** : chaque consultation de profil, décision, versement et demande de données sensibles est tracée avec l'admin, la date et le motif.

Les nouveaux dons arrivent en statut `pending` et n'entrent dans les totals qu'après approbation. Le receveur voit la progression **Requested → Reviewed → Paid out** dans son dashboard, actualisée automatiquement.

⚠️ Les numéros de compte complets et les mots de passe ne sont **jamais** stockés ni affichés ici. Seules des références masquées (ex. `•••• 4242`) apparaissent dans le JSON. Un bouton « Request full details (logged) » enregistre la demande dans le journal d'audit ; les vraies coordonnées restent à consulter dans ton canal bancaire sécurisé. `VITE_ADMIN_EMAILS` est public dans le bundle : ce n'est qu'un verrou de prototype. En production, remplace-le par une autorisation côté serveur et des policies RLS dédiées.

## 5. Limites connues / avant production

| Sujet | État | Action nécessaire |
| --- | --- | --- |
| OTP par e-mail | ✅ via Supabase | Configurer le template `{{ .Token }}` |
| Stockage des dons | ✅ anonyme, Supabase / localStorage | Ajouter un rate limit anti-spam |
| Console admin | ⚠️ verrou par e-mail public | Autorisation serveur + RLS dédiée |
| Paiement en ligne | ❌ retiré (plus de PayPal/Dwolla) | Réintroduire un PSP côté backend si besoin |
| Suivi receveur | ✅ statuts + auto-refresh 15 s | Notifications e-mail/SMS |
| Références de payout | ✅ JSON masqué | Chiffrement + backend pour les détails complets |
| Fiscalité | ⚠️ | Un don à un particulier **n'est pas déductible** ; ne pas le suggérer |
| Conformité | ⚠️ | Conditions d'utilisation, politique de confidentialité, lutte contre la fraude |

## Stack

Vite + React 19 + TypeScript + Tailwind v4 + React Router (HashRouter) + Supabase Auth/Postgres + Lucide.
