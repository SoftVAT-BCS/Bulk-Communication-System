import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { canVisitPage, firstAuthorizedPage, safeWorkspacePage } from '../apps/web/src/role-home';

describe('BCS login with limited roles', () => {
  it('sends operators without dashboard permission to an authorized workspace', () => {
    const role = ['recipients.view','recipients.select','compose.draft','templates.view','campaigns.send_test'];
    expect(firstAuthorizedPage(role)).toBe('/communication');
    expect(canVisitPage('/',role)).toBe(false);
    expect(canVisitPage('/communication',role)).toBe(true);
    expect(canVisitPage('/admin/users',role)).toBe(false);
  });
  it('keeps dashboard access for owners and allows narrowly scoped admin users', () => {
    expect(firstAuthorizedPage(['dashboard.view','access.manage'])).toBe('/');
    expect(firstAuthorizedPage(['access.manage'])).toBe('/admin/users');
    expect(firstAuthorizedPage(['reports.view'])).toBe('/reports');
    expect(firstAuthorizedPage(['queue.manage'])).toBe('/scheduling');
  });
  it('rejects untrusted redirect values', () => {
    expect(safeWorkspacePage('https://evil.example')).toBe('/');
    expect(safeWorkspacePage('//evil.example')).toBe('/');
    expect(safeWorkspacePage('/admin/users')).toBe('/admin/users');
  });
  it('does not gate session or logout on dashboard.view while API feature checks remain', () => {
    const service = readFileSync('apps/web/src/server/app-service.ts','utf8');
    const route = readFileSync('apps/web/app/api/bcs/app/session/route.ts','utf8');
    const dashboard = readFileSync('apps/web/src/server/dashboard.ts','utf8');
    expect(route).not.toContain('authorized(request,"dashboard.view"');
    expect(service).not.toContain("bcs.session_allows(s.company_id,s.portal_id,'dashboard.view')");
    expect(service).toContain('AND EXISTS (SELECT 1 FROM bcs.principal_role_assignments a');
    expect(service).toContain("po.status IN ('draft','active')");
    expect(dashboard).toContain('dashboard.view');
    expect(route).toContain('validSession(request');
  });
});
