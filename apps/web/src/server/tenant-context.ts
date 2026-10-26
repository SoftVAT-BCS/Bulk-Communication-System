import { ReadError } from './validation';
export interface Membership { id: string; company_id: string }
/** Inputs must come from the trusted issuer/subject query, never browser claims. */
export function resolveMembership(memberships: Membership[], requested?: unknown): Membership {
  if (requested !== undefined && (typeof requested !== 'string' || !/^[0-9a-f-]{36}$/i.test(requested))) throw new ReadError(400, 'INVALID_COMPANY_CONTEXT');
  const candidates = requested === undefined ? memberships : memberships.filter(m => m.company_id === requested);
  if (!candidates.length) throw new ReadError(403, 'ACCOUNT_NOT_AUTHORIZED');
  if (candidates.length !== 1) throw new ReadError(409, 'COMPANY_SELECTION_REQUIRED');
  return candidates[0];
}
export function requireTenantScope(context: { companyId: string; portalId: string; permissions: string[]; active: boolean }, record: { companyId: string; portalId: string }, permission: string) {
  if (!context.active || context.companyId !== record.companyId || context.portalId !== record.portalId || !context.permissions.includes(permission)) throw new ReadError(403, 'TENANT_SCOPE_DENIED');
}
