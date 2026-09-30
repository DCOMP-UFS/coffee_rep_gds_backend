import { formatLocalDateTime } from '../common/date/local-date-time';
import { RoleRequestDocument } from '../database/documents';
import { RoleRequestResponse } from './dto/role-request.dto';

export function toRoleRequestResponse(request: RoleRequestDocument): RoleRequestResponse {
  return {
    id: request._id,
    userId: request.userId,
    userName: request.userName,
    userEmail: request.userEmail,
    currentRole: request.currentRole,
    requestedRole: request.requestedRole,
    justification: request.justification,
    status: request.status,
    reviewedBy: request.reviewedBy,
    reviewedAt: formatLocalDateTime(request.reviewedAt),
    reviewNote: request.reviewNote,
    createdAt: formatLocalDateTime(request.createdAt),
  };
}
