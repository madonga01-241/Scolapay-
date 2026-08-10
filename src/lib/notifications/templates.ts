import { formatFcfaAmount } from "@/lib/currency";
import { parsePeriodKey, paymentDueDate } from "@/lib/billing-calendar";

type ReminderEmailInput = {
  parentName: string;
  studentName: string;
  schoolName: string;
  period: string; // "2026-09"
  amountDue: number;
  kind: "PRE" | "LATE"; // préventif (le 20) vs retard (le 6 du mois suivant)
};

function formatPeriodLabel(period: string): string {
  const { year, month } = parsePeriodKey(period);
  const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return label;
}

export function buildReminderEmail(input: ReminderEmailInput): { subject: string; html: string } {
  const periodLabel = formatPeriodLabel(input.period);
  const amount = formatFcfaAmount(input.amountDue);
  const due = paymentDueDate(parsePeriodKey(input.period)).toLocaleDateString("fr-FR", {
    timeZone: "UTC",
  });

  if (input.kind === "PRE") {
    return {
      subject: `${input.schoolName} — Scolarité de ${periodLabel} à régler`,
      html: `
        <p>Bonjour ${input.parentName},</p>
        <p>La scolarité de <strong>${input.studentName}</strong> pour <strong>${periodLabel}</strong>
        est maintenant ouverte au paiement, d'un montant de <strong>${amount}</strong>.</p>
        <p>Vous avez jusqu'au <strong>${due}</strong> pour régler sans retard.</p>
      `,
    };
  }

  return {
    subject: `${input.schoolName} — Retard de paiement pour ${input.studentName}`,
    html: `
      <p>Bonjour ${input.parentName},</p>
      <p>La scolarité de <strong>${input.studentName}</strong> pour <strong>${periodLabel}</strong>,
      d'un montant de <strong>${amount}</strong>, n'a pas encore été réglée. La date limite
      du <strong>${due}</strong> est dépassée.</p>
      <p>Merci de régulariser votre paiement dans les meilleurs délais.</p>
    `,
  };
}
