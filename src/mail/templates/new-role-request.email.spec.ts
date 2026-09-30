import { describe, expect, it } from 'vitest';
import { ROLE_ASSISTANT, ROLE_VIEWER } from '../../auth/roles';
import { NewRoleRequestEmailInput, buildNewRoleRequestEmail } from './new-role-request.email';

const input: NewRoleRequestEmailInput = {
  requestId: 7,
  userName: 'Vera Recepção',
  userEmail: 'vera@teste.com',
  currentRole: ROLE_VIEWER,
  requestedRole: ROLE_ASSISTANT,
  justification: 'Preciso reservar salas para a recepção da pediatria.',
  createdAt: new Date('2026-09-29T14:05:00Z'),
  reviewUrl: 'https://salas.exemplo.com/admin',
};

describe('buildNewRoleRequestEmail', () => {
  it('monta o assunto com o nome de quem pediu', () => {
    expect(buildNewRoleRequestEmail(input).subject).toBe(
      'Gestão de Salas — Novo pedido de acesso: Vera Recepção',
    );
  });

  it('mantém o assunto em uma linha só', () => {
    const email = buildNewRoleRequestEmail({ ...input, userName: 'Vera\r\nBcc: x@y.com' });
    expect(email.subject).not.toMatch(/[\r\n]/);
  });

  it('traz perfis por extenso e a data no horário de parede, sem deslocar o fuso', () => {
    const { html, text } = buildNewRoleRequestEmail(input);
    for (const content of [html, text]) {
      expect(content).toContain('Visualizador');
      expect(content).toContain('Assistente administrativo');
      expect(content).toContain('29/09/2026 às 14:05');
      expect(content).toContain('vera@teste.com');
    }
  });

  it('escapa o que o usuário digitou no HTML', () => {
    const { html } = buildNewRoleRequestEmail({
      ...input,
      userName: '<script>alert(1)</script>',
      justification: 'a & b "c"',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('a &amp; b &quot;c&quot;');
  });

  it('inclui o link de análise no HTML e no texto puro', () => {
    const { html, text } = buildNewRoleRequestEmail(input);
    expect(html).toContain('href="https://salas.exemplo.com/admin"');
    expect(text).toContain('Analisar pedido: https://salas.exemplo.com/admin');
  });

  it('gera um documento HTML completo, em português, com o resumo da caixa de entrada', () => {
    const { html } = buildNewRoleRequestEmail(input);
    expect(html.startsWith('<!DOCTYPE html><html lang="pt-BR">')).toBe(true);
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('Vera Recepção pediu o perfil Assistente administrativo.');
    expect(html).toContain('Pedido nº 7');
  });

  it('usa a identidade do Ambulatório HU-UFS', () => {
    const { html } = buildNewRoleRequestEmail(input);
    expect(html).toContain('#00305a');
    expect(html).toContain('#7faa1b');
    expect(html).toContain('Ambulatório HU-UFS');
  });

  it('traz a justificativa por extenso também no texto puro', () => {
    const { text } = buildNewRoleRequestEmail(input);
    expect(text).toContain('Justificativa:\nPreciso reservar salas para a recepção da pediatria.');
  });

  it('omite o link quando não há URL do frontend', () => {
    const { html, text } = buildNewRoleRequestEmail({ ...input, reviewUrl: null });
    expect(html).not.toContain('Analisar pedido');
    expect(text).not.toContain('Analisar pedido');
  });
});
