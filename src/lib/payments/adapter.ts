import { MobileMoneyProvider } from "@prisma/client";

/** Identifiants du compte marchand PROPRE À L'ÉCOLE — jamais un compte global. */
export type MerchantCredentials = {
  merchantId: string;
  apiSecret: string; // déjà déchiffré au moment où l'adapter le reçoit
};

export type InitiatePaymentInput = {
  amount: number; // FCFA, entier
  phone: string; // numéro du parent, format international
  reference: string; // référence interne ScolaPay (ex: installmentId)
  description: string;
  credentials: MerchantCredentials;
};

export type InitiatePaymentResult = {
  providerRef: string; // identifiant de transaction côté provider
  status: "PENDING" | "PAID" | "FAILED";
  checkoutUrl?: string; // certains providers redirigent vers une page de paiement
};

export type WebhookVerificationResult = {
  providerRef: string;
  status: "PAID" | "FAILED";
};

/**
 * Contrat commun à tous les agrégateurs Mobile Money. Chaque provider a ses
 * propres formats d'API/signatures de webhook — cette interface est le seul
 * point de contact que connaît le reste de l'application.
 *
 * Chaque appel est scopé au compte marchand de L'ÉCOLE concernée (voir
 * `MerchantCredentials`) : il n'existe aucun compte marchand global côté
 * ScolaPay, chaque établissement ouvrant le sien localement.
 */
export interface MobileMoneyAdapter {
  readonly provider: MobileMoneyProvider;
  initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;
  /**
   * Vérifie la signature et normalise le payload reçu sur le webhook.
   * `credentials` sert à vérifier la signature HMAC propre à CE compte
   * marchand (chaque école ayant un secret différent).
   */
  verifyWebhook(
    rawBody: string,
    signatureHeader: string | null,
    credentials: MerchantCredentials
  ): WebhookVerificationResult;
}

