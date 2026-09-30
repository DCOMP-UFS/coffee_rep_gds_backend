import { PERMISSION_DENIED_MESSAGE, Permission, hasPermission } from '../auth/permissions';
import { Role } from '../auth/roles';
import { AuthorizationDeniedError } from '../common/errors/domain-errors';

/**
 * A permissão de reserva depende do tipo: pontuais ficam com assistentes e acima;
 * recorrentes (e qualquer ocorrência de uma série) ficam com a coordenação e acima.
 */
export function reservationPermissionFor(recurring: boolean): Permission {
  return recurring ? 'reservation.recurring.manage' : 'reservation.single.manage';
}

export const RECURRING_RESERVATION_DENIED_MESSAGE =
  'Somente a coordenação pode criar ou cancelar reservas recorrentes.';

export function assertCanManageReservation(role: Role, recurring: boolean): void {
  if (hasPermission(role, reservationPermissionFor(recurring))) {
    return;
  }
  throw new AuthorizationDeniedError(
    recurring ? RECURRING_RESERVATION_DENIED_MESSAGE : PERMISSION_DENIED_MESSAGE,
  );
}
