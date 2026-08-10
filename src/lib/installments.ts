import { prisma } from "@/lib/prisma";
import { periodKey, paymentDueDate, type Period } from "@/lib/billing-calendar";

/**
 * Génère l'échéance du mois `period` pour tous les élèves actifs de toutes
 * les écoles (ou d'une école précise si `schoolId` est fourni).
 *
 * Idempotent : grâce à la contrainte unique (studentId, period) en base,
 * relancer cette fonction plusieurs fois pour la même période ne crée pas
 * de doublons (on utilise `createMany` + `skipDuplicates`).
 *
 * Pensé pour être appelé par un cron le 1er de chaque mois.
 */
export async function generateInstallmentsForPeriod(
  period: Period,
  schoolId?: string
) {
  const key = periodKey(period);
  const dueDate = paymentDueDate(period);

  const students = await prisma.student.findMany({
    where: { active: true, ...(schoolId ? { schoolId } : {}) },
    select: { id: true, schoolId: true, monthlyFee: true },
  });

  if (students.length === 0) {
    return { period: key, created: 0 };
  }

  const result = await prisma.installment.createMany({
    data: students.map((s) => ({
      schoolId: s.schoolId,
      studentId: s.id,
      period: key,
      amountDue: s.monthlyFee,
      dueDate,
      status: "UPCOMING" as const,
    })),
    skipDuplicates: true,
  });

  return { period: key, created: result.count };
}
