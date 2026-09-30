import { describe, expect, it } from 'vitest';
import { permissionsFor } from './permissions';
import { ROLE_ADMIN, ROLE_ASSISTANT, ROLE_COORDINATOR, ROLE_VIEWER } from './roles';

describe('permissionsFor', () => {
  it('visualizador só consulta: nenhuma permissão de escrita', () => {
    expect(permissionsFor(ROLE_VIEWER)).toEqual([]);
  });

  it('assistente cuida de reservas pontuais e ausências', () => {
    expect(permissionsFor(ROLE_ASSISTANT)).toEqual([
      'reservation.single.manage',
      'absence.manage',
    ]);
  });

  it('coordenação cuida do cadastro, das recorrentes e vê o histórico', () => {
    expect(permissionsFor(ROLE_COORDINATOR)).toEqual([
      'catalog.manage',
      'reservation.recurring.manage',
      'reservation.single.manage',
      'absence.manage',
      'audit.read',
    ]);
  });

  it('só o administrador gerencia usuários e analisa pedidos', () => {
    const admin = permissionsFor(ROLE_ADMIN);
    expect(admin).toContain('users.manage');
    expect(admin).toContain('roleRequests.review');
    expect(permissionsFor(ROLE_COORDINATOR)).not.toContain('users.manage');
    expect(permissionsFor(ROLE_COORDINATOR)).not.toContain('roleRequests.review');
  });

  it('administrador tem todas as permissões', () => {
    expect(permissionsFor(ROLE_ADMIN)).toHaveLength(7);
  });
});
