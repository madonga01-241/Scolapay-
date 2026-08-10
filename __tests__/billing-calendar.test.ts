import { describe, it, expect } from "vitest";
import {
  periodKey,
  parsePeriodKey,
  nextPeriod,
  paymentWindowOpensAt,
  paymentDueDate,
  preReminderDate,
  lateReminderDate,
  computeInstallmentTimeStatus,
} from "@/lib/billing-calendar";

describe("periodKey / parsePeriodKey", () => {
  it("formate et parse une période de façon symétrique", () => {
    const p = { year: 2026, month: 9 };
    expect(periodKey(p)).toBe("2026-09");
    expect(parsePeriodKey("2026-09")).toEqual(p);
  });
});

describe("nextPeriod", () => {
  it("passe au mois suivant dans la même année", () => {
    expect(nextPeriod({ year: 2026, month: 5 })).toEqual({ year: 2026, month: 6 });
  });

  it("gère le passage décembre -> janvier avec changement d'année", () => {
    expect(nextPeriod({ year: 2026, month: 12 })).toEqual({ year: 2027, month: 1 });
  });
});

describe("dates de la fenêtre de paiement (mois de septembre 2026)", () => {
  const p = { year: 2026, month: 9 };

  it("ouvre le 20 du mois consommé", () => {
    expect(paymentWindowOpensAt(p).toISOString()).toBe("2026-09-20T00:00:00.000Z");
  });

  it("échoit le 5 du mois suivant", () => {
    expect(paymentDueDate(p).toISOString()).toBe("2026-10-05T00:00:00.000Z");
  });

  it("relance préventive = date d'ouverture (le 20)", () => {
    expect(preReminderDate(p)).toEqual(paymentWindowOpensAt(p));
  });

  it("relance de retard = le 6 du mois suivant", () => {
    expect(lateReminderDate(p).toISOString()).toBe("2026-10-06T00:00:00.000Z");
  });

  it("gère correctement le changement d'année (décembre)", () => {
    const dec = { year: 2026, month: 12 };
    expect(paymentDueDate(dec).toISOString()).toBe("2027-01-05T00:00:00.000Z");
    expect(lateReminderDate(dec).toISOString()).toBe("2027-01-06T00:00:00.000Z");
  });
});

describe("computeInstallmentTimeStatus", () => {
  const p = { year: 2026, month: 9 };

  it("UPCOMING avant le 20 septembre", () => {
    const now = new Date("2026-09-19T23:59:59.000Z");
    expect(computeInstallmentTimeStatus(p, now)).toBe("UPCOMING");
  });

  it("DUE le jour exact d'ouverture (20 septembre)", () => {
    const now = new Date("2026-09-20T00:00:00.000Z");
    expect(computeInstallmentTimeStatus(p, now)).toBe("DUE");
  });

  it("DUE le jour exact d'échéance (5 octobre)", () => {
    const now = new Date("2026-10-05T23:59:00.000Z");
    expect(computeInstallmentTimeStatus(p, now)).toBe("DUE");
  });

  it("LATE à partir du 6 octobre", () => {
    const now = new Date("2026-10-06T00:00:00.000Z");
    expect(computeInstallmentTimeStatus(p, now)).toBe("LATE");
  });
});
