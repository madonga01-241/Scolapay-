/**
 * Le "FCFA" recouvre deux devises distinctes, non interchangeables au
 * niveau comptable même si historiquement parités 1:1 :
 * - XOF : zone UEMOA (Sénégal, Côte d'Ivoire, Bénin, Burkina Faso, Mali,
 *   Niger, Togo, Guinée-Bissau)
 * - XAF : zone CEMAC/CEEAC (Cameroun, Gabon, Congo, Tchad, RCA,
 *   Guinée équatoriale)
 *
 * Chaque école déclare la sienne à la création (School.currency). Toute
 * agrégation multi-écoles (ex. reporting SUPER_ADMIN) doit grouper par
 * devise plutôt que sommer directement des montants XOF et XAF.
 */
export const SUPPORTED_CURRENCIES = ["XOF", "XAF"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export function isSupportedCurrency(value: string): value is SupportedCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

/** Libellé usuel affiché aux utilisateurs — les deux se disent "FCFA". */
export function formatFcfaAmount(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}
