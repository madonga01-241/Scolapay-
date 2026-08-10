import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "./crypto";
import type { MerchantCredentials } from "./adapter";
import { MobileMoneyProvider, Role } from "@prisma/client";
import { TenantAccessError, requireRole, type TenantContext } from "@/lib/tenant";

/**
 * Enregistre (ou remplace) le compte marchand d'une école pour un provider
 * donné. Réservé à l'admin de l'école elle-même — chaque établissement
 * ouvre et configure son propre compte, ScolaPay n'a jamais accès aux
 * identifiants en clair une fois stockés.
 */
export async function registerMerchantAccount({
  ctx,
  provider,
  merchantId,
  apiSecret,
}: {
  ctx: TenantContext;
  provider: MobileMoneyProvider;
  merchantId: string;
  apiSecret: string;
}) {
  requireRole(ctx, [Role.SCHOOL_ADMIN]);

  return prisma.merchantAccount.upsert({
    where: { schoolId_provider: { schoolId: ctx.schoolId, provider } },
    create: {
      schoolId: ctx.schoolId,
      provider,
      merchantId,
      encryptedApiSecret: encryptSecret(apiSecret),
    },
    update: {
      merchantId,
      encryptedApiSecret: encryptSecret(apiSecret),
      active: true,
    },
    select: { id: true, provider: true, merchantId: true, active: true }, // jamais le secret
  });
}

/**
 * Récupère les identifiants déchiffrés du compte marchand actif d'une école
 * pour un provider — utilisé uniquement côté serveur, jamais renvoyé au
 * client tel quel.
 */
export async function getActiveMerchantCredentials(
  schoolId: string,
  provider: MobileMoneyProvider
): Promise<MerchantCredentials> {
  const account = await prisma.merchantAccount.findUnique({
    where: { schoolId_provider: { schoolId, provider } },
  });

  if (!account || !account.active) {
    throw new TenantAccessError(
      `Aucun compte marchand ${provider} actif pour cette école. ` +
        `L'école doit d'abord configurer ce moyen de paiement.`,
      422
    );
  }

  return {
    merchantId: account.merchantId,
    apiSecret: decryptSecret(account.encryptedApiSecret),
  };
}

/** Liste les providers configurés et actifs pour une école (pour affichage côté parent). */
export async function listActiveProvidersForSchool(schoolId: string) {
  const accounts = await prisma.merchantAccount.findMany({
    where: { schoolId, active: true },
    select: { provider: true },
  });
  return accounts.map((a) => a.provider);
}
