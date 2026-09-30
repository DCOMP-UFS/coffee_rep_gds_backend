/**
 * Perfis de acesso, do menor para o maior nível. O ADMIN é o administrador de TI: existe
 * um só, fica fora da hierarquia operacional e nunca é atribuído pela API.
 */
export const ROLE_VIEWER = 'VIEWER';
export const ROLE_ASSISTANT = 'ASSISTANT';
export const ROLE_COORDINATOR = 'COORDINATOR';
export const ROLE_ADMIN = 'ADMIN';

/**
 * Perfil do modelo antigo (ADMIN/BASIC). Até a migração `db:migrate-roles` rodar, quem
 * ainda o tem continua com o acesso de antes, equivalente ao da coordenação.
 */
export const ROLE_BASIC = 'BASIC';

export const ROLES = [ROLE_VIEWER, ROLE_ASSISTANT, ROLE_COORDINATOR, ROLE_ADMIN] as const;

export type Role = (typeof ROLES)[number];

/** Perfis que podem ser concedidos por pedido ou pelo administrador. */
export const ASSIGNABLE_ROLES = [ROLE_VIEWER, ROLE_ASSISTANT, ROLE_COORDINATOR] as const;

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

/** Rótulos exibidos fora do frontend, como nos e-mails. */
export const ROLE_LABELS: Record<Role, string> = {
  [ROLE_VIEWER]: 'Visualizador',
  [ROLE_ASSISTANT]: 'Assistente administrativo',
  [ROLE_COORDINATOR]: 'Coordenação',
  [ROLE_ADMIN]: 'Administrador de tecnologia',
};

const ROLE_RANK: Record<Role, number> = {
  [ROLE_VIEWER]: 0,
  [ROLE_ASSISTANT]: 1,
  [ROLE_COORDINATOR]: 2,
  [ROLE_ADMIN]: 3,
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function isAssignableRole(value: unknown): value is AssignableRole {
  return typeof value === 'string' && (ASSIGNABLE_ROLES as readonly string[]).includes(value);
}

/** Converte o valor gravado no banco no perfil atual; valores desconhecidos viram `null`. */
export function normalizeRole(value: string): Role | null {
  if (value === ROLE_BASIC) return ROLE_COORDINATOR;
  return isRole(value) ? value : null;
}

/**
 * O usuário guarda `roles: string[]` por herança do Java. Vale o maior perfil
 * reconhecido; sem nenhum, o acesso é o mínimo (visualizador).
 */
export function resolveRole(roles: readonly string[] | null | undefined): Role {
  let resolved: Role = ROLE_VIEWER;
  for (const value of roles ?? []) {
    const role = normalizeRole(value);
    if (role && ROLE_RANK[role] > ROLE_RANK[resolved]) {
      resolved = role;
    }
  }
  return resolved;
}

export function isRoleAbove(candidate: Role, reference: Role): boolean {
  return ROLE_RANK[candidate] > ROLE_RANK[reference];
}
