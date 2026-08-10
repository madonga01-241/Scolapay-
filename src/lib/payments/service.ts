import { prisma } from "@/lib/prisma";
import { getMobileMoneyAdapter } from "./providers";
import { getActiveMerchantCredentials } from "./merchant-accounts";
import { MobileMoneyProvider, PaymentMethod, Role } from "@prisma/client";
import { requireRole, type TenantContext } from "@/lib/tenant";
import { TenantAccessError } from "@/lib/tenant";

type InitiateMobileMoneyPaymentInput = {
  ctx: TenantContext;
  installmentId: string;
  provider: MobileMoneyProvider;
  phone: string;
};

/**
 * Initie un paiement Mobile Money pour une échéance. Accessible aux parents
 * (paiement de leur propre enfant) et aux comptables (au téléphone avec un
 * parent, par exemple).
 */
export async function initiateMobileMoneyPayment({
  ctx,
  installmentId,
  provider,
  phone,
}: InitiateMobileMoneyPaymentInput) {
  const installment = await prisma.installment.findFirst({
    where: { id: installmentId, schoolId: ctx.schoolId },
    include: { student: { include: { parent: true } }, payments: true },
  });

  if (!installment) {
    throw new TenantAccessError("Échéance introuvable", 404);
  }

  if (ctx.role === Role.PARENT && installment.student.parent.userId !== ctx.userId) {
    throw new TenantAccessError("Cette échéance ne concerne pas votre compte", 403);
  }

  // Anti-double-paiement : on n'autorise pas une nouvelle initiation si
  // l'échéance est déjà réglée, ou si le montant déjà payé/en attente
  // couvre déjà le montant dû.
  const alreadyCommitted = installment.payments
    .filter((p) => p.status === "PAID" || p.status === "PENDING")
    .reduce((sum, p) => sum + p.amount, 0);

  if (alreadyCommitted >= installment.amountDue) {
    throw new TenantAccessError(
      "Cette échéance est déjà réglée ou un paiement est déjà en attente",
      409
    );
  }

  const remaining = installment.amountDue - alreadyCommitted;
  const adapter = getMobileMoneyAdapter(provider);
  // Compte marchand DE L'ÉCOLE, jamais un compte centralisé ScolaPay —
  // chaque établissement ayant ouvert le sien localement.
  const credentials = await getActiveMerchantCredentials(ctx.schoolId, provider);

  const payment = await prisma.payment.create({
    data: {
      schoolId: ctx.schoolId,
      installmentId,
      amount: remaining,
      method: PaymentMethod.MOBILE_MONEY,
      mobileMoneyProvider: provider,
      status: "PENDING",
    },
  });

  const result = await adapter.initiatePayment({
    amount: remaining,
    phone,
    reference: payment.id,
    description: `Scolarité ${installment.period}`,
    credentials,
  });

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: { providerRef: result.providerRef },
  });

  return { payment: updated, checkoutUrl: result.checkoutUrl };
}

/**
 * Enregistre un paiement manuel (espèces ou virement), réservé aux
 * comptables/admins école — jamais aux parents, pour garder une piste
 * d'audit sur qui a saisi quoi.
 */
export async function recordManualPayment({
  ctx,
  installmentId,
  amount,
  method,
}: {
  ctx: TenantContext;
  installmentId: string;
  amount: number;
  method: Extract<PaymentMethod, "CASH" | "BANK_TRANSFER">;
}) {
  requireRole(ctx, [Role.SCHOOL_ADMIN, Role.ACCOUNTANT]);

  const installment = await prisma.installment.findFirst({
    where: { id: installmentId, schoolId: ctx.schoolId },
    include: { payments: true },
  });
  if (!installment) {
    throw new TenantAccessError("Échéance introuvable", 404);
  }

  const payment = await prisma.payment.create({
    data: {
      schoolId: ctx.schoolId,
      installmentId,
      amount,
      method,
      status: "PAID",
      recordedByUserId: ctx.userId,
    },
  });

  // Comme pour la confirmation Mobile Money : on ne marque l'échéance PAID
  // que si le cumulé des paiements couvre désormais le montant dû (permet
  // les règlements partiels en plusieurs fois).
  const totalPaid =
    installment.payments
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + p.amount, 0) + amount;

  if (totalPaid >= installment.amountDue) {
    await prisma.installment.update({
      where: { id: installment.id },
      data: { status: "PAID" },
    });
  }

  return payment;
}

/**
 * Applique la confirmation reçue d'un webhook provider : marque le paiement
 * PAID/FAILED, et si PAID, passe l'échéance à PAID si le montant total dû
 * est désormais couvert.
 */
export async function applyMobileMoneyWebhookResult(
  providerRef: string,
  status: "PAID" | "FAILED",
  expectedSchoolId: string
) {
  const payment = await prisma.payment.findFirst({ where: { providerRef } });
  if (!payment) return { ok: false as const, reason: "payment_not_found" };

  // Sécurité : le paiement retrouvé doit appartenir à l'école dont l'URL de
  // webhook a été appelée — empêche qu'un webhook mal configuré (ou
  // malveillant) sur l'URL de l'école A confirme un paiement de l'école B.
  if (payment.schoolId !== expectedSchoolId) {
    return { ok: false as const, reason: "school_mismatch" };
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status },
  });

  if (status === "PAID") {
    const installment = await prisma.installment.findUniqueOrThrow({
      where: { id: payment.installmentId },
      include: { payments: true },
    });
    const totalPaid = installment.payments
      .filter((p) => p.status === "PAID" || p.id === payment.id)
      .reduce((sum, p) => sum + (p.id === payment.id ? payment.amount : p.amount), 0);

    if (totalPaid >= installment.amountDue) {
      await prisma.installment.update({
        where: { id: installment.id },
        data: { status: "PAID" },
      });
    }
  }

  return { ok: true as const };
}
