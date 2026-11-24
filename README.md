# GiveFlow — prototype

Prototype d'un SaaS américain de dons : chaque personne a une page publique, reçoit des **dons anonymes** via PayPal, et voit ses dons dans un dashboard. Connexion par **code OTP envoyé par e-mail**. Une console admin donne accès à tous les profils et à tous les dons.

> Ce dépôt est un **prototype**. Il ne déplace aucun argent. Le bouton PayPal simule un paiement sandbox. Dwolla est affiché mais nécessite un serveur (secret côté backend). Aucun nom, e-mail ou message de donateur n'est collecté.

## 1. Lancer en local

```bash
npm install
npm run dev
```

Ouvre le lien affiché par Vite. Au premier lancement, le prototype est en **mode démo** :

- le code OTP est affiché à l'écran (pas d'e-mail) ;
- les profils et les dons sont stockés dans le `localStorage` du navigateur ;
- deux pages de démonstration existent : `#/u/jane` et `#/u/marcus` ;
- le compte admin est `admin@giveflow.local` (connecte-toi avec cet e-mail pour voir `#/admin`).

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
2. Colle `supabase/schema.sql` dans **SQL Editor** et exécute. Si tu avais déjà appliqué l'ancien schéma (avec donateur), exécute aussi `supabase/migration_anonymous_donations.sql`.
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

Route : `#/admin`. Accès réservé au compte dont l'e-mail correspond à `VITE_ADMIN_EMAIL` (par défaut `admin@giveflow.local`). Pour le site déployé, ajoute aussi ce secret dans **Settings → Secrets and variables → Actions**.

La console affiche :

- les indicateurs globaux (total levé, bénéficiaires, dons, comptes de payout) ;
- le tableau de tous les bénéficiaires avec recherche : nom, handle, histoire, méthode et e-mail de payout, total levé, date d'inscription ;
- une fiche détaillée par personne avec l'historique de ses dons ;
- le tableau de tous les dons (anonymes) ;
- l'export CSV des bénéficiaires.

⚠️ `VITE_ADMIN_EMAIL` est public dans le bundle : ce n'est qu'un verrou de prototype. En production, remplace-le par une autorisation côté serveur et des policies RLS dédiées.

## 5. Limites connues / avant production

| Sujet | État | Action nécessaire |
| --- | --- | --- |
| OTP par e-mail | ✅ via Supabase | Configurer le template `{{ .Token }}` |
| Stockage des dons | ✅ anonyme, Supabase / localStorage | Ajouter un rate limit anti-spam |
| Console admin | ⚠️ verrou par e-mail public | Autorisation serveur + RLS dédiée |
| PayPal | Simulation sandbox | Backend + PayPal Orders API + webhooks |
| Dwolla | Affiché, non actif | Backend obligatoire (client secret) + KYC |
| Coordonnées bancaires | ❌ jamais stockées | Laisser PayPal/Dwolla les collecter |
| Fiscalité | ⚠️ | Un don à un particulier **n'est pas déductible** ; ne pas le suggérer |
| Conformité | ⚠️ | Conditions d'utilisation, politique de confidentialité, lutte contre la fraude |

## Stack

Vite + React 19 + TypeScript + Tailwind v4 + React Router (HashRouter) + Supabase Auth/Postgres + Lucide.
