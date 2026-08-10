import { prisma } from "@/lib/prisma";
import { getDueReminders } from "@/lib/reminders";
import { getEmailSender } from "./email";
import { buildReminderEmail } from "./templates";
import { preReminderDate, parsePeriodKey } from "@/lib/billing-calendar";

/**
 * Envoie effectivement les relances dont la date programmée est atteinte,
 * puis met à jour leur statut (SENT/FAILED). Ne s'occupe QUE de l'envoi —
 * la décision de QUAND relancer reste dans scheduleRemindersForInstallments.
 */
export async function sendDueReminders(now: Date = new Date()) {
  const dueReminders = await getDueReminders(now);
  const sender = getEmailSender();

  let sent = 0;
  let failed = 0;

  for (const reminder of dueReminders) {
    const installment = reminder.installment;
    const student = installment.student;
    const parentUser = student.parent.user;
    const period = parsePeriodKey(installment.period);

    // On distingue préventif/retard en comparant la date programmée à la
    // date d'ouverture de la fenêtre de paiement — évite de stocker un
    // champ "kind" redondant avec la logique déjà centralisée dans
    // billing-calendar.ts.
    const isPre = reminder.scheduledFor.getTime() === preReminderDate(period).getTime();

    const { subject, html } = buildReminderEmail({
      parentName: student.parent.fullName,
      studentName: student.fullName,
      schoolName: (await getSchoolName(installment.schoolId)) ?? "Votre établissement",
      period: installment.period,
      amountDue: installment.amountDue,
      kind: isPre ? "PRE" : "LATE",
    });

    const result = await sender.send({ to: parentUser.email, subject, html });

    await prisma.reminder.update({
      where: { id: reminder.id },
      data: {
        status: result.ok ? "SENT" : "FAILED",
        sentAt: result.ok ? new Date() : null,
      },
    });

    if (result.ok) sent++;
    else failed++;
  }

  return { processed: dueReminders.length, sent, failed };
}

// Petit cache mémoire pour éviter une requête École par relance dans une
// même exécution du worker (potentiellement des centaines de relances).
const schoolNameCache = new Map<string, string>();
async function getSchoolName(schoolId: string): Promise<string | undefined> {
  if (schoolNameCache.has(schoolId)) return schoolNameCache.get(schoolId);
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });
  if (school) schoolNameCache.set(schoolId, school.name);
  return school?.name;
}
