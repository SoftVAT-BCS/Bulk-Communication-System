"use client";

import { Fragment, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Panel, SmartSelect, PermissionSwitch } from "@bcs/ui";

type Principal = { id: string; display_name: string | null; status: string };
type Role = { id: string; role_code: string; role_name: string; is_builtin: boolean };
type Portal = { id: string; portal_name: string };
type Permission = { permission_code: string; description: string };
type Grant = { role_id: string; permission_code: string };
type Assignment = { principal_id: string; role_id: string; portal_id: string | null };
type Scope = { principal_id: string; portal_id: string };
type Rights = { principals: Principal[]; roles: Role[]; portals: Portal[]; permissions: Permission[]; grants: Grant[]; assignments: Assignment[]; scopes: Scope[]; principal: string };

const permissionColumns = ["View", "Select / Edit", "Compose", "Schedule", "Send / Approve", "Admin"] as const;
const headings: Record<string, string> = {
  dashboard: "Dashboard",
  recipients: "Communication / Recipient Selection",
  templates: "Communication / Templates",
  compose: "Communication / Compose",
  campaigns: "Communication / Campaigns",
  scheduling: "Scheduling / Class Schedule",
  queue: "Scheduling / Email Queue",
  reports: "Reports / Overview & Delivery History",
  suppression: "Reports / Bounces & Unsubscribes",
  portals: "Configuration / Portal & Database",
  mappings: "Configuration / Table & Column Mapping",
  ses: "Configuration / Amazon SES",
  access: "Configuration / User Rights",
};
function permissionColumn(code: string): number {
  if (code.endsWith(".view")) return 0;
  if (code.startsWith("compose.")) return 2;
  if (code.endsWith(".schedule") || code.startsWith("scheduling.")) return 3;
  if (code.includes(".approve") || code.includes(".send")) return 4;
  if (code.endsWith(".select") || code.endsWith(".export") || code.endsWith(".draft") ||
    (code.endsWith(".manage") && /^(recipients|templates|mappings|suppression|queue)$/.test(code.split(".")[0]))) return 1;
  return 5;
}
function actionName(code: string): string {
  if (code.endsWith(".view")) return "View";
  if (code.endsWith(".export")) return "Export";
  if (code.endsWith(".approve")) return "Approve";
  if (code.includes(".send")) return "Send";
  if (code.endsWith(".schedule")) return "Schedule";
  if (code.endsWith(".select")) return "Select";
  if (code.endsWith(".draft")) return "Draft";
  if (code.endsWith(".manage")) return "Manage";
  return code.split(".").at(-1)?.replaceAll("_", " ") ?? "Access";
}
function codesForRole(grants: Grant[], roleId: string | null): string[] {
  return grants.filter(grant => grant.role_id === roleId).map(grant => grant.permission_code);
}

/** All grants and assignments use the existing company-authorized BCS configuration API.
 * The matrix never changes Supabase Auth identities or bypasses backend restrictions.
 */
export function BcsUserRights() {
  const [data, setData] = useState<Rights | null>(null);
  const [principal, setPrincipal] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [portal, setPortal] = useState<string | null>(null);
  const [matrixRole, setMatrixRole] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [matrixView, setMatrixView] = useState(true);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/bcs/app/configuration?kind=rights", { cache: "no-store" });
    if (!response.ok) throw Error("Access to company-wide user rights is not authorized.");
    const payload = await response.json();
    setData(payload.data as Rights);
  }, []);
  useEffect(() => { void load().catch(e => setError(e.message)); }, [load]);
  // A deep link from User Creation may preselect only an existing company principal.
  useEffect(() => {
    if (!data || principal) return;
    const id = new URLSearchParams(window.location.search).get('user');
    if (id && data.principals.some(person => person.id === id)) setPrincipal(id);
  }, [data, principal]);
  useEffect(() => {
    if (!data || matrixRole || !data.roles.length) return;
    const first = data.roles.find(candidate => !candidate.is_builtin) ?? data.roles[0];
    setMatrixRole(first.id);
    setSelected(codesForRole(data.grants, first.id));
  }, [data, matrixRole]);

  const matrixCurrent = data?.roles.find(candidate => candidate.id === matrixRole);
  const stored = useMemo(() => new Set(codesForRole(data?.grants ?? [], matrixRole)), [data, matrixRole]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const dirty = !!matrixRole && (stored.size !== selectedSet.size || [...stored].some(code => !selectedSet.has(code)));
  const grouped = useMemo(() => {
    const query = search.trim().toLowerCase();
    const byModule = new Map<string, Permission[]>();
    for (const permission of data?.permissions ?? []) {
      const key = permission.permission_code.split(".")[0];
      const title = headings[key] ?? key;
      if (!`${title} ${permission.description} ${permission.permission_code} ${actionName(permission.permission_code)}`.toLowerCase().includes(query)) continue;
      const list = byModule.get(title) ?? [];
      list.push(permission);
      byModule.set(title, list);
    }
    return [...byModule.entries()].map(([title, items]) => ({ title, items }));
  }, [data, search]);
  const visibleCount = grouped.reduce((sum, group) => sum + group.items.length, 0);
  const assigned = (data?.assignments ?? []).some(item => item.principal_id === principal && item.role_id === role && item.portal_id === portal);
  const hasScope = (data?.scopes ?? []).some(item => item.principal_id === principal && item.portal_id === portal);

  const chooseMatrixRole = (value: string | null) => {
    setMatrixRole(value);
    setSelected(codesForRole(data?.grants ?? [], value));
    setNotice("");
    setError("");
  };
  const resetSelection = () => setSelected([...stored]);
  const changeGrant = (code: string, allow: boolean) => {
    setSelected(previous => allow ? [...new Set([...previous, code])] : previous.filter(entry => entry !== code));
    setNotice("");
  };

  async function mutate(action: string, payload: Record<string, unknown>): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/bcs/app/configuration", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "rights", action, ...payload }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw Error(String(result?.error?.code ?? "REQUEST_FAILED"));
      setNotice("Permission changes saved. Backend authorization remains enforced.");
      await load();
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Permission operation failed");
      return false;
    } finally { setBusy(false); }
  }
  async function createRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await mutate("role", { code: newCode, name: newName });
    if (ok) { setNewCode(""); setNewName(""); }
  }

  const editable = !!matrixCurrent && !matrixCurrent.is_builtin;
  return <div className="bcs-admin-stack">
    <Panel title="Page, tab & action permissions" subtitle="Database-backed role permissions · scope and authorization enforced by BCS" actions={<a href="/admin/users" className="bcs-btn">+ Create user</a>}>
      <div className="card-body">
        <div className="bcs-matrix-toolbar">
          <SmartSelect label="Role / user" value={matrixRole} onChange={chooseMatrixRole} options={(data?.roles ?? []).map(candidate => ({ value: candidate.id, label: `${candidate.role_name}${candidate.is_builtin ? " · Protected" : " · Custom"}` }))}/>
          <div className="field"><label className="label" htmlFor="bcs-perm-search">Search page, tab or permission</label><input className="input" id="bcs-perm-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search page, action or permission code" /></div>
        </div>
        {!data && !error && <p className="bcs-info" role="status">Loading authorized company permissions…</p>}
        {data && !matrixRole && <p className="bcs-info">No roles are available to inspect.</p>}
        {data && matrixRole && <>
          <div className="bcs-rights-overview">
            <div className="bcs-rights-summary"><strong className="bcs-rights-summary-label">{matrixCurrent?.role_name ?? "Selected role"}</strong><span className="bcs-chip">{matrixCurrent?.is_builtin ? "Protected role · Read only" : "Custom role · Editable"}</span><span className="bcs-chip">{selected.length} permissions enabled</span><span className="bcs-muted">{visibleCount} of {data.permissions.length} actions shown</span>{dirty && <span className="bcs-rights-unsaved">Unsaved changes</span>}</div>
            <fieldset className="bcs-rights-view-switch" aria-label="Permission display"><button type="button" aria-pressed={matrixView} className={`bcs-btn ${matrixView ? "bcs-view-active" : ""}`} onClick={() => setMatrixView(true)}>Matrix</button><button type="button" aria-pressed={!matrixView} className={`bcs-btn ${!matrixView ? "bcs-view-active" : ""}`} onClick={() => setMatrixView(false)}>Compact list</button></fieldset>
          </div>
          <div className="bcs-info">{matrixCurrent?.is_builtin ? "This built-in role is protected. Inspect the permissions or select a custom role to edit." : "Each switch maps to one real database permission. Save applies the complete custom-role matrix after server validation."}</div>
          <section className="bcs-table-frame bcs-rights-scroll" aria-label="Permissions matrix">
            <table className={`bcs-rights-table ${matrixView ? "bcs-rights-matrix bcs-rights-dense" : "bcs-rights-list"}`}>
              <thead><tr>
                <th scope="col">{matrixView ? "Page / tab · Permission" : "Backend permission"}</th>
                {matrixView ? permissionColumns.map(column => <th scope="col" key={column}>{column}</th>) : <><th scope="col">Action</th><th scope="col">Allow</th></>}
              </tr></thead>
              <tbody>
                {grouped.map(group => <Fragment key={group.title}>
                  <tr className="bcs-rights-group-row"><th colSpan={matrixView ? permissionColumns.length + 1 : 3} scope="rowgroup">{group.title} <span className="bcs-muted">({group.items.length})</span></th></tr>
                  {group.items.map(permission => <tr key={permission.permission_code} className="bcs-rights-permission-row">
                    <th scope="row" className="bcs-rights-permission-heading"><span className="bcs-rights-description">{permission.description}</span><code className="bcs-permission-code">{permission.permission_code}</code></th>
                    {matrixView ? permissionColumns.map((column, index) => <td className="bcs-rights-permission-cell" key={column}>
                      {permissionColumn(permission.permission_code) === index ? <PermissionSwitch label={`${permission.description} (${permission.permission_code})`} checked={selectedSet.has(permission.permission_code)} disabled={busy || !editable} onChange={allow => changeGrant(permission.permission_code, allow)} /> : <span className="bcs-rights-empty" aria-hidden="true">—</span>}
                    </td>) : <><td className="bcs-rights-permission-cell"><span className="bcs-rights-action-label">{actionName(permission.permission_code)}</span></td><td className="bcs-rights-permission-cell"><PermissionSwitch label={`${permission.description} (${permission.permission_code})`} checked={selectedSet.has(permission.permission_code)} disabled={busy || !editable} onChange={allow => changeGrant(permission.permission_code, allow)} /></td></>}
                  </tr>)}
                </Fragment>)}
                {visibleCount === 0 && <tr><td colSpan={matrixView ? permissionColumns.length + 1 : 3} className="bcs-muted bcs-rights-empty-state">No permissions match your search.</td></tr>}
              </tbody>
            </table>
          </section>
          <div className="bcs-rights-savebar"><span className="bcs-muted">{editable ? "Changes require explicit saving and database authorization." : "Built-in roles cannot be modified."}</span><div className="inline-actions"><button type="button" className="bcs-btn" disabled={!dirty || busy} onClick={resetSelection}>Discard changes</button><button type="button" className="bcs-btn bcs-btn-primary" disabled={!editable || !dirty || busy} onClick={() => { if (matrixRole) void mutate("permissions", { role: matrixRole, permissions: selected }); }}>{busy ? "Saving…" : "Save access matrix"}</button></div></div>
        </>}
      </div>
    </Panel>
    <div className="bcs-admin-grid">
      <Panel title="User & portal role assignments" subtitle="Apply approved roles and company-authorized portal scopes"><div className="card-body bcs-admin-form">
        <div className="form-grid"><SmartSelect label="Principal / User" value={principal} onChange={setPrincipal} options={(data?.principals ?? []).map(candidate => ({ value: candidate.id, label: `${candidate.display_name ?? candidate.id} · ${candidate.status}` }))}/><SmartSelect label="Role" value={role} onChange={setRole} options={(data?.roles ?? []).map(candidate => ({ value: candidate.id, label: candidate.role_name }))}/><SmartSelect label="Connected portal" value={portal} onChange={setPortal} options={(data?.portals ?? []).map(candidate => ({ value: candidate.id, label: candidate.portal_name }))}/></div>
        <div className="bcs-chips"><span className="bcs-chip">Role assignment: {assigned ? "Granted" : "Not granted"}</span><span className="bcs-chip">Portal scope: {hasScope ? "Granted" : "Not granted"}</span></div>
        <div className="inline-actions"><button type="button" className="bcs-btn bcs-btn-primary" disabled={!principal || !role || !portal || busy || principal === data?.principal || assigned} onClick={() => void mutate("assign", { principal, role, portal })}>Assign role</button><button type="button" className="bcs-btn" disabled={!principal || !role || !portal || busy || principal === data?.principal || !assigned} onClick={() => void mutate("revoke", { principal, role, portal })}>Revoke role</button><button type="button" className="bcs-btn" disabled={!principal || !portal || busy || principal === data?.principal || hasScope} onClick={() => void mutate("scope", { principal, portal })}>Grant portal scope</button><button type="button" className="bcs-btn" disabled={!principal || !portal || busy || principal === data?.principal || !hasScope} onClick={() => void mutate("unscope", { principal, portal })}>Revoke portal scope</button></div>
        <p className="bcs-muted">Self-modification is blocked. A confirmed Supabase identity and an authorized BCS role assignment are separate operations.</p>
      </div></Panel>
      <Panel title="Create custom role" subtitle="Custom roles start with zero permissions and require explicit grants"><form className="card-body bcs-admin-form" onSubmit={event => void createRole(event)}><label className="label" htmlFor="new-role-code">Role code</label><input className="input" required maxLength={80} pattern="[a-z][a-z0-9_-]*" id="new-role-code" value={newCode} onChange={event => setNewCode(event.target.value)} placeholder="branch_manager"/><label className="label" htmlFor="new-role-name">Role name</label><input className="input" required maxLength={120} id="new-role-name" value={newName} onChange={event => setNewName(event.target.value)} placeholder="Branch Manager"/><button type="submit" className="bcs-btn bcs-btn-primary" disabled={!newCode || !newName || busy}>Create custom role</button></form></Panel>
    </div>
    {error && <p className="bcs-form-alert" role="alert">{error}</p>}
    {notice && <p className="bcs-form-good" role="status">{notice}</p>}
  </div>;
}
