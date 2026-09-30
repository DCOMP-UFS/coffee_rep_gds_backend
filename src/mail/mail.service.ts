import { Inject, Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { ENV, Env } from '../config/env';
import { parseNotificationEmails } from './parse-notification-emails';
import { EmailContent, NewRoleRequestEmailInput, buildNewRoleRequestEmail } from './templates/new-role-request.email';

/**
 * Tempo máximo de espera pelo Resend. O envio é aguardado dentro da requisição (na
 * Vercel, trabalho solto depois da resposta pode ser congelado), então não pode travar
 * o pedido do usuário.
 */
export const MAIL_SEND_TIMEOUT_MS = 5_000;

/** Página do frontend onde o administrador analisa os pedidos. */
export const ROLE_REQUESTS_REVIEW_PATH = '/admin';

type MailClient = Pick<Resend, 'emails'>;

/**
 * Envio best-effort: nenhum método lança erro. Falhas viram aviso no log, para que o
 * e-mail nunca derrube a operação de negócio que o disparou.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private client: MailClient | null = null;

  constructor(@Inject(ENV) private readonly env: Env) {}

  async notifyNewRoleRequest(input: Omit<NewRoleRequestEmailInput, 'reviewUrl'>): Promise<void> {
    const recipients = parseNotificationEmails(this.env.ADMIN_NOTIFICATION_EMAILS);
    const content = buildNewRoleRequestEmail({ ...input, reviewUrl: this.reviewUrl() });
    await this.send(recipients, content, `pedido de acesso #${input.requestId}`);
  }

  /** Separado para os testes substituírem o cliente do Resend. */
  protected createResendClient(apiKey: string): MailClient {
    return new Resend(apiKey);
  }

  private async send(recipients: string[], content: EmailContent, context: string): Promise<void> {
    const apiKey = this.env.RESEND_API_KEY;
    if (!apiKey || recipients.length === 0) {
      this.logger.debug(
        `E-mail de ${context} não enviado: ${apiKey ? 'sem destinatários' : 'RESEND_API_KEY ausente'}.`,
      );
      return;
    }

    try {
      this.client ??= this.createResendClient(apiKey);
      const { data, error } = await withTimeout(
        this.client.emails.send({
          from: this.env.MAIL_FROM,
          to: recipients,
          subject: content.subject,
          html: content.html,
          text: content.text,
        }),
        MAIL_SEND_TIMEOUT_MS,
      );

      if (error) {
        this.logger.warn(`Resend recusou o e-mail de ${context}: ${error.message}`);
        return;
      }
      this.logger.log(`E-mail de ${context} enviado (Resend id ${data?.id ?? 'desconhecido'}).`);
    } catch (error) {
      this.logger.warn(
        `Falha ao enviar o e-mail de ${context}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private reviewUrl(): string | null {
    const base = this.env.FRONTEND_URL;
    return base ? `${base.replace(/\/+$/, '')}${ROLE_REQUESTS_REVIEW_PATH}` : null;
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`tempo limite de ${timeoutMs} ms excedido`)),
      timeoutMs,
    );
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
