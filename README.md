# GiveFlow — prototype

Prototype d'un SaaS américain de dons : chaque personne a une page publique, reçoit des dons par carte/ACH via PayPal, et voit ses dons dans un dashboard. Connexion par **code OTP envoyé par e-mail**.

> Ce dépôt est un **prototype**. Il ne déplace aucun argent. Le bouton PayPal simule un paiement sandbox. Dwolla est affiché mais nécessite un serveur (secret côté backend).

## 1. Lancer en local

```bash
npm install
npm run dev
```

Ouvre le lien affiché par Vite. Au premier lancement, le prototype est en **mode démo** :

- le code OTP est affiché à l'écran (pas d'e-mail) ;
- les profils et les dons sont stockés dans le `localStorage` du navigateur ;
- deux pages de démonstration existent : `#/u/jane` et `#/u/marcus`.

## 2. Mettre en ligne sur GitHub Pages (gratuit)

1. Crée un **repository public** sur GitHub (par exemple `giveflow`).
2. Pousse ce dossier :

   ```bash
   git init
   git add .
   git commit -m "Initial GiveFlow prototype"
   git branch -M main
   git remote add origin https://github.com/<TON_PSEUDO>/giveflow.git
   git push -u origin main
   ```

3. Dans le repo : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
4. Le workflow `.github/workflows/deploy.yml` construit et déploie automatiquement.
5. Lien à partager : `https://<TON_PSEUDO>.github.io/giveflow/`

Les URLs utilisent des hashes (`/#/u/jane`) : c'est volontaire, cela évite les redirections serveur que GitHub Pages ne gère pas.

## 3. Activer le vrai OTP par e-mail (optionnel)

Le site est statique : il ne peut pas envoyer d'e-mail lui-même. Supabase s'en charge.

1. Crée un projet sur [supabase.com](https://supabase.com).
2. Colle `supabase/schema.sql` dans **SQL Editor** et exécute.
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

## 4. Limites connues / avant production

| Sujet | État | Action nécessaire |
| --- | --- | --- |
| OTP par e-mail | ✅ via Supabase | Configurer le template `{{ .Token }}` |
| Stockage des dons | ✅ Supabase / localStorage | Ajouter un rate limit anti-spam |
| PayPal | Simulation sandbox | Backend + PayPal Orders API + webhooks |
| Dwolla | Affiché, non actif | Backend obligatoire (client secret) + KYC |
| Coordonnées bancaires | ❌ jamais stockées | Laisser PayPal/Dwolla les collecter |
| Fiscalité | ⚠️ | Un don à un particulier **n'est pas déductible** ; ne pas le suggérer |
| Conformité | ⚠️ | Conditions d'utilisation, politique de confidentialité, lutte contre la fraude |

## Stack

Vite + React 19 + TypeScript + Tailwind v4 + React Router (HashRouter) + Supabase Auth/Postgres + Lucide.
