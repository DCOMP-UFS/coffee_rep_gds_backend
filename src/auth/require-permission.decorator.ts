import { SetMetadata } from '@nestjs/common';
import { Permission } from './permissions';

export const PERMISSIONS_KEY = 'requiredPermissions';

/** Exige todas as permissões listadas, conferidas pelo `JwtAuthGuard` contra o perfil do banco. */
export const RequirePermission = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
