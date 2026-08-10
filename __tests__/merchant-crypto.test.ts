import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.MERCHANT_SECRETS_KEY = "test-key-not-for-production";
});

describe("encryptSecret / decryptSecret", () => {
  it("chiffre puis déchiffre pour retrouver la valeur d'origine", async () => {
    const { encryptSecret, decryptSecret } = await import("@/lib/payments/crypto");
    const original = "sk_live_super_secret_wave_api_key";
    const encrypted = encryptSecret(original);

    expect(encrypted).not.toBe(original);
    expect(decryptSecret(encrypted)).toBe(original);
  });

  it("produit un chiffré différent à chaque appel (IV aléatoire)", async () => {
    const { encryptSecret } = await import("@/lib/payments/crypto");
    const a = encryptSecret("meme-valeur");
    const b = encryptSecret("meme-valeur");
    expect(a).not.toBe(b);
  });
});
