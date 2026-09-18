export interface AuditEventResponse {
  id: number;
  action: string;
  entityType: string;
  entityId: number | null;
  actorUserId: number | null;
  actorName: string;
  details: Record<string, unknown>;
  createdAt: string | null;
}
