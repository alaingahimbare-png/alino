# RelanceFacile · PayNudge

Devis, factures et **relances de paiement automatiques** pour les pros du service à domicile (plombiers, électriciens, paysagistes, ménage…). Bilingue français / anglais.

*Quotes, invoices and automatic payment reminders for home-service pros. Bilingual FR / EN.*

## Ce que fait l'application

- **Clients** : fiche client avec sa langue (FR ou EN) — les courriels et la page de paiement s'affichent dans sa langue.
- **Devis** (DEV-0001…) : envoyé par courriel, le client l'accepte ou le refuse en un clic, puis on le transforme en facture.
- **Factures** (FAC-0001…) : envoyées par courriel avec un lien de paiement par carte (Stripe).
- **Relances automatiques** : chaque jour, les factures en retard sont relancées selon votre calendrier (par défaut 3, 7 et 14 jours après l'échéance). Suspendables facture par facture.
- **Paiement en ligne** : via Stripe Connect — l'argent va directement sur le compte Stripe du pro. Commission plateforme optionnelle (`PLATFORM_FEE_BPS`).
- **Tableau de bord** : montant à encaisser, en retard, payé ce mois-ci.

## Technologies

| Rôle | Outil |
|---|---|
| Application web | React + Vite + TypeScript |
| Base de données et connexion | Supabase (Postgres + lien magique par courriel) |
| Hébergement et fonctions serveur | Netlify (fonctions + fonction planifiée quotidienne) |
| Paiements | Stripe Connect (comptes Express) |
| Courriels | Resend (facultatif : sans clé, les envois sont simulés) |

```
src/                    application web (pages, traductions FR/EN)
netlify/functions/      fonctions serveur (Stripe, envoi, relances, page publique)
netlify/lib/            outils serveur partagés
shared/totals.ts        calcul des montants (navigateur + serveur)
supabase/migrations/    schéma de la base de données
```

## Mise en route

### 1. Supabase

1. Créez un projet sur [supabase.com](https://supabase.com).
2. **SQL Editor** → collez le contenu de `supabase/migrations/0001_init.sql` → **Run**.
3. **Authentication → URL Configuration** : mettez l'adresse de votre site Netlify dans *Site URL* (et `http://localhost:8888` dans *Redirect URLs* pour le développement).
4. **Project Settings → API** : notez l'URL, la clé `anon` et la clé `service_role`.

### 2. Stripe (mode test)

1. **Connect** → activez Connect sur votre compte de plateforme.
2. **Developers → API keys** : notez la clé secrète `sk_test_…`.
3. **Developers → Webhooks** → *Add endpoint* :
   - URL : `https://VOTRE-SITE.netlify.app/api/stripe-webhook`
   - Cochez **« Listen to events on Connected accounts »**
   - Événements : `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `account.updated`
   - Notez le secret de signature `whsec_…`

> Les paiements utilisent des « destination charges » : la session de paiement est créée sur la plateforme, puis l'argent est transféré au compte du pro.

### 3. Netlify

1. **Add new site → Import from GitHub** → choisissez ce dépôt. La configuration de build est déjà dans `netlify.toml`.
2. **Site configuration → Environment variables** : ajoutez toutes les variables de `.env.example`.
3. Déployez. La fonction `send-reminders` tourne automatiquement chaque jour à 13 h UTC (9 h à Montréal).

### 4. Courriels (facultatif au début)

Créez un compte [Resend](https://resend.com), vérifiez votre domaine, puis renseignez `RESEND_API_KEY` et `EMAIL_FROM`. Tant que ce n'est pas fait, l'application fonctionne mais affiche le lien client au lieu d'envoyer le courriel.

## Développement local

```bash
npm install
cp .env.example .env      # puis remplissez les valeurs
npx netlify dev           # app + fonctions sur http://localhost:8888
```

Pour tester le webhook en local : `stripe listen --forward-to localhost:8888/api/stripe-webhook --forward-connect-to localhost:8888/api/stripe-webhook`

Carte de test Stripe : `4242 4242 4242 4242`, n'importe quelle date future et n'importe quel CVC.

## Sécurité

- Chaque table est protégée par la sécurité au niveau des lignes (RLS) : un pro ne voit et ne modifie que ses propres données.
- Les colonnes sensibles (compte Stripe, numérotation, lien public, journal des relances) ne sont modifiables que par le serveur.
- La page client est accessible uniquement avec un lien secret non devinable ; les brouillons n'y sont jamais visibles.
- Le webhook Stripe vérifie la signature de chaque événement.
- Les clés `service_role` et Stripe ne vont **jamais** dans le code ni dans des variables `VITE_` : uniquement dans les variables d'environnement Netlify.

## Prochaines étapes possibles

- PDF des devis et factures
- Abonnement payant pour les pros (Stripe Billing)
- Envoi des relances par SMS
- Taxes multiples (TPS + TVQ séparées au Québec)
