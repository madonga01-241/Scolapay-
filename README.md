# ScolaPay — Étapes 1 & 2

## Règles métier appliquées
- **Devise** : FCFA, recouvrant deux devises distinctes selon la zone —
  **XOF** (UEMOA) et **XAF** (CEMAC/CEEAC), non interchangeables. Chaque
  école déclare la sienne (`School.currency`, pas de valeur par défaut).
  Montants stockés en **unité entière** (pas de sous-unité).
- **Période de paiement** du mois consommé M : **20 M → 5 (M+1)**.
- **Relance préventive** : le **20 M**. **Relance de retard** : le **6 (M+1)**.
  Logique isolée dans `src/lib/billing-calendar.ts`, testée sur les cas
  limites (`__tests__/billing-calendar.test.ts`).
- **Comptes marchands Mobile Money décentralisés** : ScolaPay n'a **aucun**
  compte marchand centralisé. Chaque école ouvre elle-même son compte auprès
  du/des opérateur(s) disponible(s) dans sa localité (Wave, Orange Money,
  Mobicash, Airtel Money, MTN Money) et le configure dans ScolaPay
  (`MerchantAccount`, un par école et par provider).
- **Hébergement** : Vercel. Les tâches automatiques (génération des
  échéanciers, planification des relances) utilisent **Vercel Cron**
  (`vercel.json`).

## Étape 1 — Fondations
- Schéma Prisma multi-tenant (`prisma/schema.prisma`).
- Auth par rôle (`SCHOOL_ADMIN`, `ACCOUNTANT`, `PARENT`, `SUPER_ADMIN`).
- Isolation multi-tenant centralisée (`src/lib/tenant.ts`).
- Middleware de redirection par rôle (`src/middleware.ts`).

## Étape 2 — Cœur métier
- Génération des échéanciers (`src/lib/installments.ts`), idempotente.
- Planification des relances (`src/lib/reminders.ts`).
- **Paiement Mobile Money multi-écoles / multi-providers** :
  - Interface commune `MobileMoneyAdapter` (`src/lib/payments/adapter.ts`)
  - Mocks Wave / Orange Money / Mobicash / Airtel Money / MTN Money
    (`src/lib/payments/providers.ts`)
  - **Comptes marchands par école**, secrets chiffrés en base
    (`src/lib/payments/crypto.ts`, `merchant-accounts.ts`) — l'école les
    enregistre via `POST /api/merchant-accounts`
  - Initiation de paiement : `POST /api/payments/mobile-money`
  - **Webhook propre à chaque école** :
    `POST /api/payments/mobile-money/webhook/{PROVIDER}/{schoolId}`
    — c'est cette URL précise que l'école renseigne dans son tableau de bord
    marchand chez le provider ; elle détermine sans ambiguïté quel compte
    marchand (et donc quel secret) utiliser pour vérifier la signature.
- Paiement manuel (espèces/virement), tracé.
- Reçu PDF (`src/lib/receipts/generate.tsx`).
- **Tâches planifiées Vercel Cron** (`vercel.json`) :
  - `GET /api/cron/generate-installments` — le 1er de chaque mois à 1h
  - `GET /api/cron/schedule-reminders` — chaque jour à 2h
  - Vercel ajoute automatiquement le header `Authorization: Bearer <CRON_SECRET>`
    quand la variable d'env `CRON_SECRET` est définie sur le projet — c'est
    ce header qui est vérifié dans chaque route, pas un header personnalisé.

## Installation
```bash
npm install
cp .env.example .env
# DATABASE_URL, NEXTAUTH_SECRET, CRON_SECRET, MERCHANT_SECRETS_KEY
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run dev
```

## Tests
```bash
npm test
```
Couvre : isolation tenant, calendrier de facturation, devises supportées,
chiffrement des secrets marchands.

## Sécurité — points d'attention pour la prod
- `MERCHANT_SECRETS_KEY` est un chiffrement applicatif minimal suffisant
  pour le MVP. En production, migrer vers un vrai secret manager (Vercel
  encrypted env per-resource, AWS Secrets Manager, Vault...).
- Chaque webhook vérifie que le paiement retrouvé appartient bien à l'école
  de l'URL appelée (`school_mismatch` sinon) — empêche qu'un webhook mal
  configuré sur l'URL d'une école confirme un paiement d'une autre.

## Prochaine étape
Étape 3 (Suivi & relances) : tableau de bord des impayés par classe/élève
(en groupant par devise si une même organisation gère des écoles XOF et
XAF), interface pour que l'admin école configure ses comptes marchands, et
envoi réel des relances (email d'abord) sur les relances `QUEUED`.
