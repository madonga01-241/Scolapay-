import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

/**
 * Chiffrement symétrique des secrets d'API des comptes marchands avant
 * écriture en base (le champ `encryptedApiSecret` ne doit jamais contenir
 * de valeur en clair).
 *
 * ⚠️ Ceci est un chiffrement applicatif minimal (AES-256-GCM) suffisant pour
 * le MVP. En production, préférer un vrai secret manager (Vercel encrypted
 * env vars par ressource, AWS Secrets Manager, HashiCorp Vault...) plutôt
 * que de garder la clé de chiffrement elle-même dans une variable d'env aux
 * côtés du reste de l'app.
 */
const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.MERCHANT_SECRETS_KEY;
  if (!secret) {
    throw new Error("MERCHANT_SECRETS_KEY manquante dans l'environnement");
  }
  return scryptSync(secret, "scolapay-merchant-secrets", 32);
}

export function encryptSecret(plainText: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format stocké : iv.authTag.ciphertext (tous en base64)
  return [iv, authTag, encrypted].map((b) => b.toString("base64")).join(".");
}

export function decryptSecret(stored: string): string {
  const [ivB64, authTagB64, dataB64] = stored.split(".");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const data = Buffer.from(dataB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
