import { NextRequest, NextResponse } from "next/server";
import { MobileMoneyProvider } from "@prisma/client";
import { getMobileMoneyAdapter } from "@/lib/payments/providers";
import { getActiveMerchantCredentials } from "@/lib/payments/merchant-accounts";
import { applyMobileMoneyWebhookResult } from "@/lib/payments/service";
import { TenantAccessError } from "@/lib/tenant";

/**
 * Chaque école reçoit une URL de webhook qui lui est propre :
 * /api/payments/mobile-money/webhook/{PROVIDER}/{schoolId}
 *
 * C'est cette URL (et non le contenu de la requête) qui indique de quelle
 * école — donc de quel compte marchand — provient la confirmation de
 * paiement. C'est cette URL précise que l'école doit renseigner dans son
 * tableau de bord marchand chez le provider (Wave, Orange Money, etc.).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { provider: string; schoolId: string } }
) {
  const providerKey = params.provider.toUpperCase();
  if (!(providerKey in MobileMoneyProvider)) {
    return NextResponse.json({ error: "Provider inconnu" }, { status: 404 });
  }
  const provider = providerKey as MobileMoneyProvider;

  let credentials;
  try {
    credentials = await getActiveMerchantCredentials(params.schoolId, provider);
  } catch (err) {
    if (err instanceof TenantAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const adapter = getMobileMoneyAdapter(provider);
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature");

  let verification;
  try {
    verification = adapter.verifyWebhook(rawBody, signature, credentials);
  } catch {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  const result = await applyMobileMoneyWebhookResult(
    verification.providerRef,
    verification.status,
    params.schoolId // vérifie que le paiement appartient bien à cette école
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 404 });
  }
  return NextResponse.json({ received: true });
}
