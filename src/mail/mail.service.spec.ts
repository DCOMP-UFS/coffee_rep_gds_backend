import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ROLE_COORDINATOR, ROLE_VIEWER } from '../auth/roles';
import { Env } from '../config/env';
import { MAIL_SEND_TIMEOUT_MS, MailService } from './mail.service';

const send = vi.fn();

class TestableMailService extends MailService {
  readonly createdWith: string[] = [];

  protected override createResendClient(apiKey: string) {
    this.createdWith.push(apiKey);
    return { emails: { send } } as never;
  }
}

function serviceWith(overrides: Partial<Env> = {}): TestableMailService {
  const env = {
    RESEND_API_KEY: 're_teste',
    MAIL_FROM: 'Gestão de Salas <onboarding@resend.dev>',
    ADMIN_NOTIFICATION_EMAILS: 'ti@exemplo.com, ti@exemplo.com',
    FRONTEND_URL: 'https://salas.exemplo.com/',
    ...overrides,
  } as Env;
  return new TestableMailService(env);
}

const request = {
  requestId: 3,
  userName: 'Vera',
  userEmail: 'vera@teste.com',
  currentRole: ROLE_VIEWER,
  requestedRole: ROLE_COORDINATOR,
  justification: 'Assumi a coordenação do ambulatório.',
  createdAt: new Date('2026-09-29T10:00:00Z'),
} as const;

describe('MailService.notifyNewRoleRequest', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    send.mockReset();
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('envia para ADMIN_NOTIFICATION_EMAILS sem repetidos, com link para a aba Pedidos', async () => {
    send.mockResolvedValue({ data: { id: 'x' }, error: null });
    const service = serviceWith();

    await service.notifyNewRoleRequest(request);

    expect(service.createdWith).toEqual(['re_teste']);
    expect(send).toHaveBeenCalledTimes(1);
    const payload = send.mock.calls[0][0];
    expect(payload).toMatchObject({
      from: 'Gestão de Salas <onboarding@resend.dev>',
      to: ['ti@exemplo.com'],
      subject: 'Gestão de Salas — Novo pedido de acesso: Vera',
    });
    expect(payload.text).toContain('Analisar pedido: https://salas.exemplo.com/admin');
  });

  it('não chama o Resend sem RESEND_API_KEY', async () => {
    const service = serviceWith({ RESEND_API_KEY: undefined });

    await service.notifyNewRoleRequest(request);

    expect(service.createdWith).toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });

  it('não chama o Resend sem destinatários válidos', async () => {
    const service = serviceWith({ ADMIN_NOTIFICATION_EMAILS: 'invalido' });

    await service.notifyNewRoleRequest(request);

    expect(send).not.toHaveBeenCalled();
  });

  it('engole o erro devolvido pelo Resend e registra aviso', async () => {
    send.mockResolvedValue({ data: null, error: { message: 'API key inválida' } });

    await expect(serviceWith().notifyNewRoleRequest(request)).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('API key inválida'));
  });

  it('engole exceções de rede e registra aviso', async () => {
    send.mockRejectedValue(new Error('ECONNRESET'));

    await expect(serviceWith().notifyNewRoleRequest(request)).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('ECONNRESET'));
  });

  it('desiste depois do tempo limite para não travar o pedido do usuário', async () => {
    vi.useFakeTimers();
    send.mockReturnValue(new Promise(() => undefined));

    const pending = serviceWith().notifyNewRoleRequest(request);
    await vi.advanceTimersByTimeAsync(MAIL_SEND_TIMEOUT_MS);

    await expect(pending).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('tempo limite'));
  });

  it('omite o link quando FRONTEND_URL não está configurada', async () => {
    send.mockResolvedValue({ data: { id: 'x' }, error: null });

    await serviceWith({ FRONTEND_URL: undefined }).notifyNewRoleRequest(request);

    expect(send.mock.calls[0][0].text).not.toContain('Analisar pedido');
  });
});
