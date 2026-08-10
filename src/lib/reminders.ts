import { prisma } from "@/lib/prisma";
import {
  parsePeriodKey,
  preReminderDate,
  lateReminderDate,
} from "@/lib/billing-calendar";
import { ReminderChannel } from "@prisma/client";

/**
 * Planifie les deux relances (préventive + retard) pour toutes les échéances
 * `UPCOMING`/`DUE` qui n'ont pas encore de relance programmée pour le canal
 * demandé. Pensé pour être appelé une fois par le cron mensuel juste après
 * generateInstallmentsForPeriod.
 *
 * Le canal (EMAIL en V1, SMS/WHATSAPP en V2) est un paramètre pour ne pas
 * dupliquer cette fonction quand on ajoutera les autres canaux.
 */
export async function scheduleRemindersForInstallments(
  channel: ReminderChannel = ReminderChannel.EMAIL
) {
  const installments = await prisma.installment.findMany({
    where: { status: { in: ["UPCOMING", "DUE"] } },
    select: { id: true, schoolId: true, period: true },
  });

  let queued = 0;

  for (const installment of installments) {
    const period = parsePeriodKey(installment.period);

    const existing = await prisma.reminder.findMany({
      where: { installmentId: installment.id, channel },
      select: { scheduledFor: true },
    });
    const already = new Set(existing.map((r) => r.scheduledFor.toISOString()));

    const candidates = [
      preReminderDate(period),
      lateReminderDate(period),
    ].filter((d) => !already.has(d.toISOString()));

    if (candidates.length === 0) continue;

    await prisma.reminder.createMany({
      data: candidates.map((scheduledFor) => ({
        schoolId: installment.schoolId,
        installmentId: installment.id,
        channel,
        scheduledFor,
        status: "QUEUED" as const,
      })),
    });
    queued += candidates.length;
  }

  return { queued };
}

/**
 * À exécuter par un cron quotidien : récupère les relances QUEUED dont la
 * date programmée est atteinte et les marque comme prêtes à être envoyées
 * par le worker de notification (SMS/email/WhatsApp — hors périmètre ici,
 * volontairement découplé pour pouvoir brancher n'importe quel fournisseur).
 */
export async function getDueReminders(now: Date = new Date()) {
  return prisma.reminder.findMany({
    where: { status: "QUEUED", scheduledFor: { lte: now } },
    include: {
      installment: { include: { student: { include: { parent: { include: { user: true } } } } } },
    },
  });
}
