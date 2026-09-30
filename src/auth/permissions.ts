import { ROLE_ADMIN, ROLE_ASSISTANT, ROLE_COORDINATOR, Role } from './roles';

/**
 * Matriz única de permissões. Leitura não aparece aqui: qualquer usuário autenticado
 * consulta calendário, salas, reservas, setores, solicitantes, ausências e o histórico.
 * O frontend recebe a lista calculada em `GET /api/auth/me`, sem duplicar esta tabela.
 */
export const PERMISSIONS = {
  /** Setores, salas e solicitantes. */
  'catalog.manage': [ROLE_ADMIN, ROLE_COORDINATOR],
  /** Criar reservas recorrentes e cancelar séries ou ocorrências delas. */
  'reservation.recurring.manage': [ROLE_ADMIN, ROLE_COORDINATOR],
  /** Criar e cancelar reservas pontuais, inclusive as de outras pessoas. */
  'reservation.single.manage': [ROLE_ADMIN, ROLE_COORDINATOR, ROLE_ASSISTANT],
  'absence.manage': [ROLE_ADMIN, ROLE_COORDINATOR, ROLE_ASSISTANT],
  'users.manage': [ROLE_ADMIN],
  'roleRequests.review': [ROLE_ADMIN],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export function hasPermission(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export function permissionsFor(role: Role): Permission[] {
  return ALL_PERMISSIONS.filter((permission) => hasPermission(role, permission));
}

export const PERMISSION_DENIED_MESSAGE = 'Você não tem permissão para realizar esta ação.';
