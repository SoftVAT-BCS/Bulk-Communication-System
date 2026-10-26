"use client";
import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";

import { Icon } from "./icons";
export { Icon } from "./icons";
export function ActionButton({ children, primary, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) { return <button type="button" {...props} className={`btn ${primary ? "primary" : ""} ${props.className ?? ""}`}>{children}</button>; }
export function Panel({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) { return <section className="card"><div className="card-head"><div><h2>{title}</h2>{subtitle && <p className="tiny" style={{ marginTop: 6 }}>{subtitle}</p>}</div>{actions}</div>{children}</section>; }
export function PageHeader({ title, subtitle, page, actions }: { title: string; subtitle: string; page: string; actions?: ReactNode }) { return <div className="heading-row"><div><div className="eyebrow"><Icon name="spark" size="sm" /> {page === "Dashboard" ? "INDEPENDENT DASHBOARD" : page === "Communication" ? "DELIVERY WORKSPACE" : page === "Configuration" ? "ADMINISTRATION" : "WORKSPACE"} / {page}</div><h1>{title}</h1><p className="subtitle">{subtitle}</p></div><div className="heading-actions">{actions}</div></div>; }
export function KPICard({ label, value, detail, icon, tone = "" }: { label: string; value: string; detail: string; icon: string; tone?: string }) { return <div className="card stat"><div className={`stat-icon ${tone}`}><Icon name={icon} /></div><div className="stat-art"><Icon name={icon} /></div><div className="stat-label">{label}</div><div className="stat-number">{value}</div><div className="stat-foot">{detail}</div></div>; }
export function EmptyState({ children }: { children: ReactNode }) { return <div className="empty-state" role="status">{children}</div>; }
export function FormField({ label, children }: { label: string; children: ReactNode }) { return <div className="field"><div className="field-caption">{label}</div>{children}</div>; }
export function TabBar({ tabs, value, onChange }: { tabs: readonly string[]; value: string; onChange(value: string): void }) {
  return <div className="card tab-card"><div className="tabs" role="tablist" aria-label="Page sections">{tabs.map((tab, index) => <button type="button" role="tab" id={`tab-${index}`} aria-controls={`panel-${index}`} aria-selected={tab === value} tabIndex={tab === value ? 0 : -1} className={`tab ${tab === value ? "active" : ""}`} key={tab} onClick={() => onChange(tab)} onKeyDown={event => {
    const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
    if (next !== null) { event.preventDefault(); onChange(tabs[next]); document.getElementById(`tab-${next}`)?.focus(); }
  }}>{tab}</button>)}</div></div>;
}
export const navigation = [
  { label: "Dashboard", href: "/", icon: "dashboard" },
  { label: "Communication", href: "/communication", icon: "mail" },
  { label: "Scheduling", href: "/scheduling", icon: "calendar" },
  { label: "Reports", href: "/reports", icon: "reports" },
  { label: "Configuration", href: "/configuration", icon: "settings" },
];

/** Additional authenticated workspace routes. Backend APIs still enforce access. */
export const administrationNavigation = [
  { label: "User Creation", href: "/admin/users", icon: "users" },
  { label: "User Rights", href: "/admin/rights", icon: "shield" },
];

type NavigationItem = { label: string; href: string; icon: string };
export function NavItem({ label, href, icon, active, index }: NavigationItem & { active: boolean; index?: number }) {
  return <a className={`nav-link ${active ? "active" : ""}`} href={href} aria-label={label} aria-current={active ? "page" : undefined} title={label}>
    <Icon name={icon} />
    <span className="bcs-nav-text">{label}</span>
    {index !== undefined && <span className="nav-key">{String(index + 1).padStart(2, "0")}</span>}
  </a>;
}

/** Shared IPX navigation, now with an accessible, persistent desktop mini-sidebar. */
export function AppShell({ page, mode = "synthetic", children }: { page: string; mode?: "synthetic" | "authenticated"; children: ReactNode }) {
  const [dark, setDark] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [currentName, setCurrentName] = useState("");
  const [currentPermissions, setCurrentPermissions] = useState<string[] | null>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    try {
      setDark(localStorage.getItem("bcs-theme") === "dark");
      setCollapsed(localStorage.getItem("bcs-sidebar-collapsed") === "1");
    } catch { /* Optional browser-only UI preferences. */ }
  }, []);
  useEffect(() => { document.body.dataset.theme = dark ? "dark" : "light"; }, [dark]);
  useEffect(() => {
    if (mode !== "authenticated" || typeof fetch !== "function") return;
    const controller = new AbortController();
    void fetch("/api/bcs/app/session", { cache:"no-store", credentials:"same-origin", signal:controller.signal })
      .then(async result => result.ok ? result.json() : null)
      .then(payload => {
        if (controller.signal.aborted) return;
        const name = payload?.data?.name;
        if (typeof name === "string" && name.trim()) setCurrentName(name.trim());
        if (Array.isArray(payload?.data?.permissions)) setCurrentPermissions(payload.data.permissions.filter((p:unknown):p is string => typeof p === "string"));
      })
      .catch(() => { /* Keep non-identifying fallback if optional header lookup fails. */ });
    return () => controller.abort();
  }, [mode]);
  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    try { localStorage.setItem("bcs-theme", next ? "dark" : "light"); } catch { /* In-memory appearance remains usable. */ }
  };
  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("bcs-sidebar-collapsed", next ? "1" : "0"); } catch { /* In-memory setting remains usable. */ }
  };
  useEffect(() => {
    if (!drawer) return;
    const menu = document.getElementById("navigation");
    const controls = Array.from(menu?.querySelectorAll<HTMLElement>("button:not(:disabled),a[href]") ?? []);
    controls[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setDrawer(false); }
      if (event.key === "Tab") {
        const first = controls[0]; const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); toggle.current?.focus(); };
  }, [drawer]);
  useEffect(() => {
    document.body.classList.toggle("mobile-nav-open", drawer);
    return () => document.body.classList.remove("mobile-nav-open");
  }, [drawer]);

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError("");
    try {
      const response = await fetch("/api/bcs/app/session", { method: "DELETE", credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw Error("Sign out could not be completed. Please retry.");
      window.location.assign("/login");
    } catch {
      setSignOutError("Sign out failed. Please try again.");
      setSigningOut(false);
    }
  };

  // Menu visibility improves discoverability; PostgreSQL RLS/API checks remain authoritative.
  const can = (...codes:string[]) => currentPermissions === null || codes.some(code => currentPermissions.includes(code));
  const primaryLinks = navigation.filter(item => {
    if (item.label === "Dashboard") return can("dashboard.view");
    if (item.label === "Communication") return can("recipients.view","recipients.select","recipients.export","recipients.import","templates.view","templates.manage","compose.draft","campaigns.send_test","campaigns.schedule","campaigns.send","campaigns.approve");
    if (item.label === "Scheduling") return can("scheduling.manage","queue.manage");
    if (item.label === "Reports") return can("reports.view","reports.export","suppression.manage");
    if (item.label === "Configuration") return can("portals.manage","mappings.manage","ses.manage");
    return true;
  });
  const adminLinks = administrationNavigation.filter(() => can("access.manage"));
  return <div className={`app-shell ${collapsed ? "bcs-sidebar-collapsed" : ""}`}>
    <a className="skip-link" href="#workspace">Skip to content</a>
    <aside className={`sidebar ${drawer ? "bcs-open" : ""}`} id="navigation" aria-label="BCS sidebar">
      <div className="logo bcs-sidebar-header">
        <div className="brandmark"><Icon name="send" /></div>
        <div className="bcs-brand-copy"><div className="brandname">UNIVERSAL NOTIFY</div><div className="brandsub">Communication Engine</div></div>
      </div>
      <button type="button" className="btn mobile-toggle bcs-mobile-close" onClick={() => { setDrawer(false); toggle.current?.focus(); }}>Close navigation</button>
      <div className="bcs-sidebar-sections" id="bcs-sidebar-sections">
        <div className="nav-label">MAIN WORKSPACE</div>
        <nav className="navlinks" aria-label="Main workspace">{primaryLinks.map((item, index) => <NavItem key={item.href} {...item} index={index} active={page === item.label} />)}</nav>
        {can("portals.manage","mappings.manage","ses.manage") && <><div className="nav-label">CONNECTED PORTAL</div>
        <nav className="navlinks" aria-label="Connected portal"><a href="/configuration" className="nav-link" title="SkillMonk Academy" aria-label="SkillMonk Academy"><Icon name="school" /><span className="bcs-nav-text">SkillMonk Academy</span><span className="bcs-nav-trailing"><Icon name="chevron" /></span></a></nav></>}
        {mode === "authenticated" && adminLinks.length > 0 && <><div className="nav-label">ADMINISTRATION</div><nav className="navlinks" aria-label="Administration">
          {adminLinks.map(item => <NavItem key={item.href} {...item} active={page === item.label} />)}
        </nav></>}
      </div>
      <div className="sidebar-bottom">
        <div className="side-note bcs-sidebar-note"><strong>{mode === "authenticated" ? "BCS development workspace" : "Synthetic UI foundation"}</strong><p>{mode === "authenticated" ? "PostgreSQL development data. Amazon SES sending is disabled." : "Fictional sample data. No external database, Amazon SES or live email connection."}</p></div>
        {mode === "authenticated"
          ? <button type="button" className="nav-link bcs-sidebar-signout" aria-label="Log Out" title="Log Out" onClick={() => void signOut()} disabled={signingOut}><Icon name="logout" /><span className="bcs-nav-text">{signingOut ? "Signing out…" : "Log Out"}</span></button>
          : <a className="nav-link bcs-sidebar-signout" href="/login" aria-label="Sign in" title="Sign in"><Icon name="lock" /><span className="bcs-nav-text">Sign in</span></a>}
        {signOutError && <p className="bcs-signout-error" role="alert">{signOutError}</p>}
        <div className="sidebar-mini"><span className="live-dot" /> <span className="bcs-nav-text">5 workspace pages · 2 admin pages</span></div>
      </div>
    </aside>
    {drawer && <button type="button" className="bcs-backdrop" aria-label="Close navigation" onClick={() => setDrawer(false)} />}
    <div className="main">
      <header className="topbar"><div className="top-start">
        <button type="button" className="round-icon mobile-toggle" ref={toggle} aria-label="Open navigation" aria-expanded={drawer} aria-controls="navigation" onClick={() => setDrawer(!drawer)}><Icon name="menu" /></button>
        <button type="button" className="round-icon bcs-desktop-collapse" onClick={toggleSidebar} aria-label={collapsed ? "Expand main menu" : "Minimize main menu"} aria-expanded={!collapsed} aria-controls="bcs-sidebar-sections" title={collapsed ? "Expand main menu" : "Minimize main menu"}><span className="bcs-collapse-chevron"><Icon name="chevron" /></span></button>
        <div className="breadcrumb">Workspace <Icon name="chevron" /><strong>{page}</strong></div>
      </div><div className="top-actions"><div className="demo-ribbon"><Icon name="spark" /> {mode === "authenticated" ? "DEVELOPMENT DATABASE" : "SYNTHETIC UI DEMO"}</div>
        <button type="button" className="round-icon" aria-label="Toggle appearance" aria-pressed={dark} onClick={toggleTheme}><Icon name="moon" /></button>
        <button type="button" className="round-icon" disabled aria-label="Notifications — preview only"><Icon name="bell" /></button>
        <div className="userbox"><div className="top-avatar">{mode === "authenticated" ? (currentName.split(/\s+/).map(word => word[0] ?? "").slice(0,2).join("").toUpperCase() || "BC") : "SM"}</div><div><strong>{mode === "authenticated" ? currentName || "BCS User" : "Portal Admin"}</strong><small>SkillMonk Academy</small></div></div>
      </div></header>
      <main className="content" id="workspace">{children}</main>
      <footer className="footer"><span>© 2026 Universal Notify · UI foundation</span><span>{mode === "authenticated" ? "BCS development · Live email sending disabled" : "Synthetic data · No actual messages sent"}</span></footer>
    </div>
  </div>;
}

export function DetailDialog({ title, children, onClose, fullScreen=false, closeDisabled=false }: { title: string; children: ReactNode; onClose(): void; fullScreen?: boolean; closeDisabled?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(()=>{if(!fullScreen)return;const previous=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.body.style.overflow=previous;};},[fullScreen]);
  useEffect(() => { const opener = document.activeElement as HTMLElement | null; const dialog = ref.current; dialog?.showModal(); return () => { dialog?.close(); queueMicrotask(() => opener?.focus()); }; }, []);
  return <dialog ref={ref} className={`dialog bcs-dialog ${fullScreen ? "bcs-dialog-fullscreen" : ""}`} aria-labelledby={id} onCancel={event => { event.preventDefault(); onClose(); }}><div className="dialog-head"><h2 id={id}>{title}</h2><ActionButton disabled={closeDisabled} onClick={onClose} aria-label="Close details">Close</ActionButton></div><div className="dialog-body">{children}</div></dialog>;
}
