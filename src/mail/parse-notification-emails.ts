const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Lista de destinatários vinda de variável de ambiente: separada por vírgula, sem
 * espaços, sem endereços inválidos e sem repetidos (ignorando maiúsculas).
 */
export function parseNotificationEmails(raw: string | null | undefined): string[] {
  const seen = new Set<string>();
  const emails: string[] = [];

  for (const item of (raw ?? '').split(',')) {
    const email = item.trim();
    const key = email.toLowerCase();
    if (!EMAIL_PATTERN.test(email) || seen.has(key)) continue;
    seen.add(key);
    emails.push(email);
  }

  return emails;
}
