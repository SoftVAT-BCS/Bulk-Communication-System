"use client";
import { ActionButton, AppShell, DetailDialog, Icon, PageHeader, TabBar } from "@bcs/ui";
import { useEffect, useRef, useState } from "react";
import { EmailWorkspace, type EmailWorkspaceHandle } from "./email-workspace";
import { RecipientSelection } from "./communication";
import { BcsConfigurationPanels } from "./bcs-configuration-panels";
import { CampaignWorkspace } from "./campaign-workspace";
import { ConfigurationPreview } from "./configuration";
import { Dashboard, PreviewSection } from "./previews";
import { DatabaseActivity } from "./database-activity";
import { DatabaseScheduling } from "./database-scheduling";
import { DatabaseDashboard } from "./database-dashboard";
import { SaasWorkspacePanels } from "./saas-console";
import { SessionGate } from "./session-gate";
const pageTabs: Record<string, string[]> = { Communication: ["Recipient Selection", "Compose & Send", "Templates"], Scheduling: ["Class Schedule", "Reschedule & Cancellation", "Email Queue"], Reports: ["Overview", "Delivery History", "Bounces & Unsubscribes"], Configuration: ["Portal & Database", "Table & Column Mapping", "Amazon SES", "User Rights"] };
export function Workspace({ page, database = false, authenticated = false }: { page: string; database?: boolean; authenticated?: boolean }) {
  const tabs = pageTabs[page] ?? [];
  const [tab, setTab] = useState(tabs[0] ?? "");
  useEffect(() => { if (page === "Scheduling" && window.location.hash === "#queue") setTab("Email Queue"); }, [page]);
  const [selectionSnapshot,setSelectionSnapshot]=useState<string>();
  const [selected, setSelected] = useState(new Set<string>());
  const [sessionName, setSessionName] = useState<string>('');
  useEffect(() => {
    if (!authenticated || typeof fetch !== 'function') return;
    const controller = new AbortController();
    void fetch('/api/bcs/app/session', {cache:'no-store', signal:controller.signal})
      .then(async r => r.ok ? r.json() : null)
      .then(data => {if (!controller.signal.aborted && typeof data?.data?.name === 'string') setSessionName(data.data.name);})
      .catch(() => { /* Keep the fallback if this optional greeting request fails. */ });
    return () => controller.abort();
  }, [authenticated]);
  const emailWorkspace = useRef<EmailWorkspaceHandle>(null);
  const [exportPreview, setExportPreview] = useState(false);
  const title = page === "Dashboard" ? `Good morning, ${sessionName || "Admin"} 👋` : page === "Communication" ? "Communication studio" : page === "Configuration" ? "Integration & configuration" : page;
  const subtitle = page === "Dashboard" ? (authenticated?"Current database metrics for your authenticated company and portal.":"A complete view of learning communications, class events and message delivery. Synthetic demonstration.") : page === "Communication" ? "Select recipients, compose personalized messages and reuse ready-made educational templates." : page === "Configuration" ? "Connect any portal, map its data, configure SES and assign user-level rights." : authenticated ? "Authenticated database records; email sending disabled." : "Reusable workspace · synthetic visual preview · no live services connected.";
  const actions = page === "Communication" ? <><a className="btn" href="/scheduling#queue"><Icon name="clock" size="sm" />View scheduled mail</a><ActionButton primary onClick={() => emailWorkspace.current?.newMessage()}><Icon name="edit" size="sm" />New message</ActionButton></> : page === "Configuration" ? authenticated ? <div className="inline-actions bcs-admin-links"><a className="btn" href="/admin/users">Users</a><a className="btn" href="/admin/rights">User rights</a><a className="btn" href="/admin/connections">Database connections</a></div> : <ActionButton disabled={authenticated} primary onClick={event => { event.currentTarget.focus(); setExportPreview(true); }}><Icon name="download" size="sm" />{authenticated?"Settings export unavailable":"Export settings preview"}</ActionButton> : page === "Dashboard" ? <a className="btn primary" href="/communication">New communication →</a> : <ActionButton disabled>{authenticated ? "Sending disabled" : "Preview workspace"}</ActionButton>;
  const content = <><PageHeader page={page} title={title} subtitle={subtitle} actions={actions} />{tabs.length > 0 && <TabBar tabs={tabs} value={tab} onChange={setTab} />}{page === "Dashboard" ? (authenticated?<DatabaseDashboard />:<Dashboard />) : <>{page === "Communication" && <div role="tabpanel" id="panel-0" aria-labelledby="tab-0" hidden={tab !== "Recipient Selection"}><RecipientSelection onSnapshot={authenticated?setSelectionSnapshot:undefined} allowExport={authenticated} database={database} selected={selected} setSelected={setSelected} onCompose={() => setTab("Compose & Send")} /></div>}{page === "Communication" && <div role="tabpanel" id={tab === "Templates" ? "panel-2" : "panel-1"} aria-labelledby={tab === "Templates" ? "tab-2" : "tab-1"} hidden={tab === "Recipient Selection"}><EmailWorkspace snapshot={selectionSnapshot} database={authenticated} ref={emailWorkspace} tab={tab} onTab={setTab} selected={database ? new Set<string>() : selected} />{authenticated&&tab==="Compose & Send"&&<CampaignWorkspace selection={selectionSnapshot} active={tab==="Compose & Send"} />}</div>}{page !== "Communication" && <div role="tabpanel" id={`panel-${tabs.indexOf(tab)}`} aria-labelledby={`tab-${tabs.indexOf(tab)}`}>{page === "Configuration" ? authenticated?<BcsConfigurationPanels key={tab} tab={tab} />:<ConfigurationPreview tab={tab} /> : authenticated && (tab==="Email Queue"||tab==="Delivery History"||tab==="Bounces & Unsubscribes") ? <DatabaseActivity key={tab} kind={tab==="Email Queue"?"queue":tab==="Delivery History"?"messages":"suppressions"} /> : authenticated && tab==="Overview" ? <DatabaseDashboard report /> : authenticated && page === "Scheduling" && tab!=="Email Queue" ? <DatabaseScheduling key={tab} tab={tab} /> : <PreviewSection key={tab} tab={tab} selected={selected.size} />}</div>}</>}{authenticated&&<SaasWorkspacePanels page={page}/>} {exportPreview && <DetailDialog title="Settings export — preview only" onClose={() => setExportPreview(false)}><p>Demonstration only. No settings file was exported. No credentials, service connections or permission grants exist in this local preview.</p></DetailDialog>}</>;
  return <AppShell page={page} mode={authenticated ? "authenticated" : "synthetic"}>{authenticated ? <SessionGate>{content}</SessionGate> : content}</AppShell>;
}
