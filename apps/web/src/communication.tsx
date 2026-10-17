"use client";
import type { Recipient, RecipientQuery, RecipientStatus, SortKey } from "@bcs/contracts";
import { ActionButton, DetailDialog, EnterpriseGrid, Icon, Panel, SmartMultiSelect, type GridColumn } from "@bcs/ui";
import { useState } from "react";
import { cascadeGroups, eligible, groups, initialQuery, matching, syntheticProvider, updateSelection } from "./synthetic";
import { cascadeDatabaseGroups, useDatabaseRecipients } from "./client-recipients";
const columns: GridColumn<Recipient>[] = [
  { key: "id", label: "Student ID", render: row => <span className="key">{row.targetId ?? row.id}</span>, sortable: true },
  { key: "name", label: "Student / Name", render: row => <div className="name-flex"><div className={"avatar " + (row.id.charCodeAt(7) % 3 === 1 ? "lilac" : row.id.charCodeAt(7) % 3 === 2 ? "mint" : "")}>{row.name.split(" ").map(part => part[0]).join("")}</div><div><div className="table-name">{row.name}</div><div className="table-secondary">{row.stage}</div></div></div>, sortable: true },
  { key: "email", label: "Email address", render: row => row.email, sortable: true },
  { key: "group", label: "Course / Group", render: row => row.group, sortable: true },
  { key: "subgroup", label: "Batch / Subgroup", render: row => row.subgroup, sortable: true },
  { key: "status", label: "Email status", render: row => <span className={"badge " + (row.status === "Active" ? "good" : row.status === "Inactive" ? "warn" : "bad")}>{row.status}</span>, sortable: true },
  { key: "joined", label: "Joined on", render: row => row.joined, sortable: true },
];
export function syntheticCsv(rows: readonly Recipient[]): string {
  const cell = (value: string) => '"' + (/^[\s]*[=+@-]/.test(value) ? "'" + value : value).replaceAll('"', '""') + '"';
  return [["Student ID", "Name", "Email", "Group", "Subgroup", "Status"], ...rows.map(row => [row.id, row.name, row.email, row.group, row.subgroup, row.status])].map(row => row.map(cell).join(",")).join("\r\n");
}
export function RecipientSelection({ selected, setSelected, onCompose, database = false }: { database?: boolean; selected: Set<string>; setSelected(value: Set<string>): void; onCompose(): void }) {
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [visible, setVisible] = useState(["id", "name", "email", "group", "subgroup", "status"]);
  const [detail, setDetail] = useState<Recipient | null>(null);
  const changeQuery = (next: RecipientQuery) => { setQuery(next); setPage(0); };
  const remote = useDatabaseRecipients(database, query, page, size, detail?.id ?? null);
  const result = database ? remote.result ?? { rows: [], total: 0, eligible: 0 } : syntheticProvider.page(query, page, size);
  const groupOptions = database ? remote.options.groups.map(g => ({ value: g.id, label: g.name })) : groups;
  const select = (ids: string[], value: boolean) => {
    if (!database) { setSelected(updateSelection(selected, ids, value)); return; }
    const next = new Set(selected);
    for (const id of ids) { if (!value) next.delete(id); else if (result.rows.some(row => row.id === id && eligible(row))) next.add(id); }
    setSelected(next);
  };
  const subgroupOptions = database ? remote.options.subgroups.filter(s => !query.groups.length || query.groups.includes(s.groupId)).map(s => ({ value: s.id, label: s.name })) : groups.filter(group => !query.groups.length || query.groups.includes(group.value)).flatMap(group => group.subgroups.map(label => ({ label, value: label })));
  const exportCsv = () => { const url = URL.createObjectURL(new Blob([syntheticCsv(matching(query))], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = "UniversalNotify_Synthetic_Recipients.csv"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  return <><div className="bcs-recipient-card"><Panel title="Choose recipients" subtitle="Searchable multi-select and a high-density review grid" actions={<div className="inline-actions"><ActionButton className="sm" disabled={database} onClick={exportCsv} title="Export filtered fictional records only"><Icon name="download" size="sm" />Export CSV</ActionButton><ActionButton className="sm" primary disabled={database} onClick={onCompose}><Icon name="arrow" size="sm" />Continue to compose</ActionButton></div>}>
    <p role="status" className="tiny">{database ? remote.result ? "BCS Development Database — Read-only" : remote.error ? "Database mode — unavailable" : "Database mode — loading" : "Synthetic UI Demo"}</p>
    {database && <p className="tiny">Active status is not consent. Selection is local review only; compose, export and select-all-matching are not connected to database recipients.</p>}
    {remote.error && database && <p role="alert">{remote.error}</p>}
    <div className="grid-bar"><div className="filter-group"><SmartMultiSelect label="Course / Group" noun="groups" options={groupOptions} value={query.groups} onChange={values => changeQuery(database ? cascadeDatabaseGroups(query, values, remote.options) : cascadeGroups(query, values))} /></div><div className="filter-group"><SmartMultiSelect label="Batch / Subgroup" noun="subgroups" options={subgroupOptions} value={query.subgroups} onChange={subgroups => changeQuery({ ...query, subgroups })} /></div><div className="filter-group wide"><label className="label" htmlFor="recipient-search">Search grid</label><input className="input" id="recipient-search" placeholder="Name, email, student ID, course…" value={query.search} onChange={event => changeQuery({ ...query, search: event.target.value })} /></div><div className="filter-group bcs-status-filter"><label className="label" htmlFor="recipient-status">Email status</label><select className="select" id="recipient-status" value={query.status} onChange={event => changeQuery({ ...query, status: event.target.value as RecipientStatus | "All statuses" })}>{["All statuses", "Active", "Inactive", "Bounced", "Unsubscribed"].map(status => <option key={status}>{status}</option>)}</select></div></div>
    <EnterpriseGrid<Recipient> emptyMessage={database && !remote.result ? remote.error ? "Recipient data unavailable." : "Loading recipients…" : undefined} rows={result.rows} columns={columns} visibleColumns={visible} onColumnsChange={setVisible} selected={selected} eligible={eligible} matchingDisabledReason={database ? "Server-wide selection is not implemented in this read-only increment." : undefined} onSelect={select} onSelectMatching={value => setSelected(updateSelection(selected, syntheticProvider.matchingEligibleIds(query), value))} onClear={() => setSelected(new Set())} total={result.total} eligibleCount={result.eligible} page={database && remote.result ? remote.result.meta.page : page} pageSize={size} onPage={setPage} onPageSize={value => { setSize(value); setPage(0); }} sort={query.sort} descending={query.descending} onSort={key => changeQuery({ ...query, sort: key as SortKey, descending: key === query.sort && !query.descending })} onDetail={setDetail} />
    {detail && <DetailDialog title={database ? "Development database recipient details" : "Synthetic recipient details"} onClose={() => setDetail(null)}><dl className="bcs-details">{database && !remote.detail && <p role="status">{remote.detailError ?? "Loading details…"}</p>}{Object.entries(database ? remote.detail ?? {} : detail).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value ?? "—"}</dd></div>)}</dl><p className="tiny">Synthetic contact / not dialable. APIs and workers must independently authorize and revalidate every recipient before any future send.</p></DetailDialog>}
  </Panel></div><div className="split equal"><section className="card"><div className="card-body"><h2 className="section-title">Selection intelligence</h2><p className="section-intro">Selections persist when you search, paginate or change groups. In production, the server must re-check membership, permissions and suppression before sending.</p><div className="row between"><div><strong className="bcs-selection-number">{selected.size}</strong><p className="tiny">Students in current selection</p></div><span className="badge blue">Demo selection only</span></div></div></section><section className="card"><div className="card-body"><h2 className="section-title">Reuse in your existing portal</h2><p className="section-intro">Group → Subgroup → Student search. {database ? "Database mode supports individual/page selection, filters, column chooser and density. Unseen matching selection is disabled." : "Supports select all matching, individual selection, filtering, column chooser, density and synthetic CSV export."}</p><div className="row wrap">{["MySQL", "SQL Server", "PostgreSQL", "REST API"].map(label => <span className="chip" key={label}>{label}</span>)}</div></div></section></div></>;
}
