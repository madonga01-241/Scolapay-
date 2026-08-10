import { describe, it, expect } from "vitest";
import { isSupportedCurrency, formatFcfaAmount, SUPPORTED_CURRENCIES } from "@/lib/currency";

describe("devises FCFA supportées", () => {
  it("accepte XOF (UEMOA) et XAF (CEMAC/CEEAC)", () => {
    expect(SUPPORTED_CURRENCIES).toEqual(["XOF", "XAF"]);
    expect(isSupportedCurrency("XOF")).toBe(true);
    expect(isSupportedCurrency("XAF")).toBe(true);
  });

  it("rejette une devise non supportée", () => {
    expect(isSupportedCurrency("EUR")).toBe(false);
    expect(isSupportedCurrency("USD")).toBe(false);
  });
});

describe("formatFcfaAmount", () => {
  it("formate un montant avec séparateur de milliers et suffixe FCFA", () => {
    expect(formatFcfaAmount(25000)).toBe("25 000 FCFA");
  });
});
