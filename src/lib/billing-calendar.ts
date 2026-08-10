/**
 * Règles métier de calendrier ScolaPay :
 *
 * - Le mois consommé M est payable du 20 M au 5 (M+1) inclus.
 * - Relance préventive : le 20 M (jour d'ouverture de la période de paiement).
 * - Relance de retard : le 6 (M+1), dès le lendemain de la clôture de la période.
 * - Une échéance est LATE à partir du 6 (M+1) si elle n'est pas encore payée.
 *
 * Toute cette logique est centralisée ici pour n'exister qu'à un seul endroit :
 * c'est le genre de règle qu'on ne veut jamais recalculer différemment dans
 * deux fichiers.
 */

export type Period = { year: number; month: number }; // month = 1-12

/** Formate une période en clé stable "YYYY-MM", utilisée comme identifiant unique. */
export function periodKey(p: Period): string {
  return `${p.year}-${String(p.month).padStart(2, "0")}`;
}

export function parsePeriodKey(key: string): Period {
  const [year, month] = key.split("-").map(Number);
  return { year, month };
}

/** Période suivante (gère le passage décembre -> janvier). */
export function nextPeriod(p: Period): Period {
  return p.month === 12 ? { year: p.year + 1, month: 1 } : { year: p.year, month: p.month + 1 };
}

/** Date d'ouverture de la période de paiement pour le mois consommé : le 20 M. */
export function paymentWindowOpensAt(p: Period): Date {
  return new Date(Date.UTC(p.year, p.month - 1, 20));
}

/** Date de clôture (dueDate) pour le mois consommé : le 5 du mois suivant. */
export function paymentDueDate(p: Period): Date {
  const next = nextPeriod(p);
  return new Date(Date.UTC(next.year, next.month - 1, 5));
}

/** Date d'envoi de la relance préventive : le 20 M. */
export function preReminderDate(p: Period): Date {
  return paymentWindowOpensAt(p);
}

/** Date d'envoi de la relance de retard : le 6 du mois suivant. */
export function lateReminderDate(p: Period): Date {
  const next = nextPeriod(p);
  return new Date(Date.UTC(next.year, next.month - 1, 6));
}

/**
 * Statut d'une échéance à une date donnée, en fonction de la fenêtre de
 * paiement. Ne tient PAS compte du paiement effectif (status PAID géré
 * séparément par la logique de paiement) — sert uniquement à déterminer
 * UPCOMING / DUE / LATE.
 */
export function computeInstallmentTimeStatus(
  p: Period,
  now: Date
): "UPCOMING" | "DUE" | "LATE" {
  const opens = paymentWindowOpensAt(p);
  const due = paymentDueDate(p);

  if (now < opens) return "UPCOMING";
  if (now <= due) return "DUE";
  return "LATE";
}
