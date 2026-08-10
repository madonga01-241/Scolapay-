export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export type SendEmailResult = {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
};

export interface EmailSender {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

/**
 * Implémentation mock — écrit dans la console au lieu d'envoyer réellement.
 * Remplacer par un vrai fournisseur (Resend, SendGrid, AWS SES...) sans
 * toucher au code appelant : c'est tout l'intérêt de l'interface.
 */
class MockEmailSender implements EmailSender {
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    console.log(`[MockEmailSender] À: ${input.to} | Sujet: ${input.subject}`);
    return { ok: true, providerMessageId: `mock-${Date.now()}` };
  }
}

let sender: EmailSender = new MockEmailSender();

/** Permet de remplacer l'implémentation (tests, ou vrai fournisseur en prod). */
export function setEmailSender(custom: EmailSender) {
  sender = custom;
}

export function getEmailSender(): EmailSender {
  return sender;
}
