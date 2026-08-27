import { ROLE_ADMIN, ROLE_BASIC, UserDocument } from '../database/documents';
import { formatLocalDateTime } from '../common/date/local-date-time';

/**
 * Ids das roles no `data.sql` do Java. As roles foram embutidas no usuário durante a
 * migração, mas `GET /api/user` expõe a entidade JPA crua, com objetos `{roleId, name}`.
 */
const ROLE_IDS: Record<string, number> = { [ROLE_ADMIN]: 1, [ROLE_BASIC]: 2 };

export interface UserResponse {
  userId: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  cpf: string | null;
  birthDate: string | null;
  status: number;
  roles: Array<{ roleId: number; name: string }>;
  createdAt: string | null;
  updatedAt: string | null;
  updatedBy: number | null;
}

export function toUserResponse(user: UserDocument): UserResponse {
  return {
    userId: user._id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    cpf: user.cpf,
    birthDate: formatLocalDateTime(user.birthDate),
    status: user.status,
    roles: user.roles.map((name) => ({ roleId: ROLE_IDS[name] ?? 0, name })),
    createdAt: formatLocalDateTime(user.createdAt),
    updatedAt: formatLocalDateTime(user.updatedAt),
    updatedBy: user.updatedBy,
  };
}
