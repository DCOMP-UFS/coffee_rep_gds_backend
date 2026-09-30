import { Db } from 'mongodb';
import { ROLE_ADMIN, ROLE_BASIC, ROLE_COORDINATOR } from '../auth/roles';
import { COLLECTIONS, RoleRequestDocument, UserDocument } from '../database/documents';
import { ensureRoleRequestIndexes } from './role-requests.repository';

/** O administrador de TI que já existe em produção. */
export const EXPECTED_ADMIN_EMAIL = 'admin@admin.com';

export interface MigrationUser {
  id: number;
  name: string | null;
  email: string | null;
}

export interface RoleMigrationReport {
  /** Usuários com o perfil antigo BASIC, que viram COORDINATOR. */
  legacyUsers: MigrationUser[];
  admins: MigrationUser[];
  warnings: string[];
}

function toMigrationUser(user: UserDocument): MigrationUser {
  return { id: user._id, name: user.name, email: user.email };
}

/** Só leitura: descreve o que a migração faria. */
export async function inspectRoleMigration(db: Db): Promise<RoleMigrationReport> {
  const users = db.collection<UserDocument>(COLLECTIONS.users);
  const [legacy, admins] = await Promise.all([
    users.find({ roles: ROLE_BASIC }).sort({ _id: 1 }).toArray(),
    users.find({ roles: ROLE_ADMIN }).sort({ _id: 1 }).toArray(),
  ]);

  const warnings: string[] = [];
  if (admins.length !== 1) {
    warnings.push(
      `Esperado exatamente 1 ADMIN, encontrados ${admins.length}. O sistema pressupõe um único administrador de TI.`,
    );
  }
  if (admins.length > 0 && !admins.some((admin) => admin.email === EXPECTED_ADMIN_EMAIL)) {
    warnings.push(`Nenhum ADMIN com o e-mail ${EXPECTED_ADMIN_EMAIL}.`);
  }

  return {
    legacyUsers: legacy.map(toMigrationUser),
    admins: admins.map(toMigrationUser),
    warnings,
  };
}

/**
 * Idempotente: troca BASIC por COORDINATOR (preservando outros perfis do array) e cria
 * os índices de `roleRequests`. Rodar de novo não altera nada.
 */
export async function applyRoleMigration(db: Db): Promise<{ converted: number }> {
  const result = await db
    .collection<UserDocument>(COLLECTIONS.users)
    .updateMany(
      { roles: ROLE_BASIC },
      { $set: { 'roles.$[legacy]': ROLE_COORDINATOR } },
      { arrayFilters: [{ legacy: ROLE_BASIC }] },
    );

  await ensureRoleRequestIndexes(db.collection<RoleRequestDocument>(COLLECTIONS.roleRequests));

  return { converted: result.modifiedCount };
}
