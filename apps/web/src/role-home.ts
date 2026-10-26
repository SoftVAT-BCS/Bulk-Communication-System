/** Presentation routing only. PostgreSQL RLS and API permission checks remain authoritative. */
export const ACCESSIBLE_ROUTES = [
  { href: '/', permissions: ['dashboard.view'] },
  { href: '/communication', permissions: ['recipients.view', 'recipients.select', 'recipients.export', 'recipients.import', 'templates.view', 'templates.manage', 'compose.draft', 'campaigns.send_test', 'campaigns.schedule', 'campaigns.send', 'campaigns.approve'] },
  { href: '/scheduling', permissions: ['scheduling.manage', 'queue.manage'] },
  { href: '/reports', permissions: ['reports.view', 'reports.export', 'suppression.manage'] },
  { href: '/configuration', permissions: ['portals.manage', 'mappings.manage', 'ses.manage'] },
  { href: '/admin/users', permissions: ['access.manage'] },
  { href: '/admin/rights', permissions: ['access.manage'] },
  { href: '/admin/connections', permissions: ['portals.manage', 'mappings.manage'] },
] as const;

export function canVisitPage(pathname: string, permissions: readonly string[]): boolean {
  const route = ACCESSIBLE_ROUTES.find(item => item.href === pathname);
  return !route || route.permissions.some(permission => permissions.includes(permission));
}

export function firstAuthorizedPage(permissions: readonly string[]): string {
  return ACCESSIBLE_ROUTES.find(item => canVisitPage(item.href, permissions))?.href ?? '/login';
}

export function safeWorkspacePage(value: unknown): string {
  return typeof value === 'string' && ACCESSIBLE_ROUTES.some(item => item.href === value) ? value : '/';
}
