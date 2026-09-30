import { describe, expect, it } from 'vitest';
import { ROLE_ADMIN, ROLE_ASSISTANT, ROLE_COORDINATOR, ROLE_VIEWER } from '../auth/roles';
import { AuthorizationDeniedError } from '../common/errors/domain-errors';
import {
  RECURRING_RESERVATION_DENIED_MESSAGE,
  assertCanManageReservation,
} from './reservation-permissions';

describe('assertCanManageReservation', () => {
  it('assistente gerencia reserva pontual', () => {
    expect(() => assertCanManageReservation(ROLE_ASSISTANT, false)).not.toThrow();
  });

  it('assistente não gerencia recorrente, com mensagem que explica o motivo', () => {
    expect(() => assertCanManageReservation(ROLE_ASSISTANT, true)).toThrow(
      new AuthorizationDeniedError(RECURRING_RESERVATION_DENIED_MESSAGE),
    );
  });

  it('coordenação e admin gerenciam os dois tipos', () => {
    for (const role of [ROLE_COORDINATOR, ROLE_ADMIN] as const) {
      expect(() => assertCanManageReservation(role, false)).not.toThrow();
      expect(() => assertCanManageReservation(role, true)).not.toThrow();
    }
  });

  it('visualizador não gerencia nenhum tipo', () => {
    expect(() => assertCanManageReservation(ROLE_VIEWER, false)).toThrow(AuthorizationDeniedError);
    expect(() => assertCanManageReservation(ROLE_VIEWER, true)).toThrow(AuthorizationDeniedError);
  });
});
