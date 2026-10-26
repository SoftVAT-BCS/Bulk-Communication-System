import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const fixture = vi.hoisted(() => ({
  queries: [] as string[],
  permissionReady: true,
}));

vi.mock('../apps/web/src/server/app-service', () => ({
  authorized: async (
    _request: Request,
    permission: string,
    work: (client: unknown, session: unknown) => Promise<unknown>,
  ) => {
    if (permission !== 'access.manage') throw new Error('Unexpected permission');
    const client = {
      query: async (sql: string) => {
        fixture.queries.push(sql);
        if (sql.includes("SELECT bcs.session_allows")) return { rows: [{ allowed: true }] };
        if (sql.includes('FROM bcs.principals p WHERE')) return {
          rows: [{ id: '11111111-1111-4111-8111-111111111111',
            display_name: 'Demo Operator', email: 'test@example.invalid',
            status: 'active', role_ids: [], portal_ids: [] }],
        };
        if (sql.includes('has_column_privilege')) return {
          rows: [{ ready: fixture.permissionReady }],
        };
        throw new Error('Unexpected SQL in readiness test');
      },
    };
    return work(client, { company_id: '22222222-2222-4222-8222-222222222222',
      principal_id: '33333333-3333-4333-8333-333333333333',
      portal_id: '44444444-4444-4444-8444-444444444444',
      permissions: ['access.manage'] });
  },
}));

import { listCompanyUsers } from '../apps/web/src/server/user-management';

beforeEach(() => {
  fixture.queries.length = 0;
  fixture.permissionReady = true;
});

describe('restricted BCS user-management readiness', () => {
  it('lists authorized company users without selecting private migration history', async () => {
    const response = await listCompanyUsers(new Request('http://127.0.0.1:3000/api/bcs/app/users?view=directory'));
    expect(response).toMatchObject({ managementEnabled: true, users: [{ display_name: 'Demo Operator' }] });
    expect(fixture.queries.some(sql => sql.includes('FROM bcs.schema_migrations'))).toBe(false);
    expect(fixture.queries.some(sql => sql.includes('pg_catalog.pg_policies'))).toBe(true);
  });

  it('keeps editing disabled when effective grants or policy are missing', async () => {
    fixture.permissionReady = false;
    const response = await listCompanyUsers(new Request('http://127.0.0.1:3000/api/bcs/app/users?view=directory'));
    expect(response).toMatchObject({ managementEnabled: false, users: [{ status: 'active' }] });
    expect(fixture.queries.some(sql => sql.includes('FROM bcs.schema_migrations'))).toBe(false);
  });
});
