import { randomUUID } from "crypto";
import { MobileMoneyProvider } from "@prisma/client";
import type {
  MobileMoneyAdapter,
  InitiatePaymentInput,
  InitiatePaymentResult,
  WebhookVerificationResult,
} from "./adapter";

/**
 * Squelette commun aux mocks : simule un paiement "en attente" côté
 * provider, à confirmer ensuite via webhook (comme en conditions réelles).
 * Chaque vrai adaptateur remplacera `initiatePayment` par un appel HTTP à
 * l'API du provider, et `verifyWebhook` par la vérification de signature
 * documentée par ce provider (HMAC, clé publique, etc.).
 */
abstract class MockAdapter implements MobileMoneyAdapter {
  abstract readonly provider: MobileMoneyProvider;

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    return {
      providerRef: `${this.provider}-${randomUUID()}`,
      status: "PENDING",
      checkoutUrl: `https://mock-${this.provider.toLowerCase()}.test/pay/${input.reference}`,
    };
  }

  verifyWebhook(rawBody: string): WebhookVerificationResult {
    // Mock : on lit un JSON simple { providerRef, status } sans vérif de
    // signature. En prod, remplacer par la vérification HMAC réelle du
    // provider, en utilisant `credentials.apiSecret` propre à l'école.
    const payload = JSON.parse(rawBody) as { providerRef: string; status: "PAID" | "FAILED" };
    return payload;
  }
}

class WaveAdapter extends MockAdapter {
  readonly provider = MobileMoneyProvider.WAVE;
}
class OrangeMoneyAdapter extends MockAdapter {
  readonly provider = MobileMoneyProvider.ORANGE_MONEY;
}
class MobicashAdapter extends MockAdapter {
  readonly provider = MobileMoneyProvider.MOBICASH;
}
class AirtelMoneyAdapter extends MockAdapter {
  readonly provider = MobileMoneyProvider.AIRTEL_MONEY;
}
class MtnMoneyAdapter extends MockAdapter {
  readonly provider = MobileMoneyProvider.MTN_MONEY;
}

const registry: Record<MobileMoneyProvider, MobileMoneyAdapter> = {
  [MobileMoneyProvider.WAVE]: new WaveAdapter(),
  [MobileMoneyProvider.ORANGE_MONEY]: new OrangeMoneyAdapter(),
  [MobileMoneyProvider.MOBICASH]: new MobicashAdapter(),
  [MobileMoneyProvider.AIRTEL_MONEY]: new AirtelMoneyAdapter(),
  [MobileMoneyProvider.MTN_MONEY]: new MtnMoneyAdapter(),
};

export function getMobileMoneyAdapter(provider: MobileMoneyProvider): MobileMoneyAdapter {
  return registry[provider];
}
