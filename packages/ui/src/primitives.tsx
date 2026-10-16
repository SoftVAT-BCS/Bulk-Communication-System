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
export const navigation = [{ label: "Dashboard", href: "/", icon: "dashboard" }, { label: "Communication", href: "/communication", icon: "mail" }, { label: "Scheduling", href: "/scheduling", icon: "calendar" }, { label: "Reports", href: "/reports", icon: "reports" }, { label: "Configuration", href: "/configuration", icon: "settings" }];
export function NavItem({ label, href, icon, active, index }: typeof navigation[number] & { active: boolean; index: number }) { return <a className={`nav-link ${active ? "active" : ""}`} href={href} aria-current={active ? "page" : undefined}><Icon name={icon} /><span>{label}</span><span className="nav-key">0{index + 1}</span></a>; }
export function AppShell({ page, children }: { page: string; children: ReactNode }) {
  const [dark, setDark] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => { try { setDark(localStorage.getItem("bcs-theme") === "dark"); } catch { /* Preferences are optional. */ } }, []);
  useEffect(() => { document.body.dataset.theme = dark ? "dark" : "light"; }, [dark]);
  const toggleTheme = () => { const next = !dark; setDark(next); try { localStorage.setItem("bcs-theme", next ? "dark" : "light"); } catch { /* In-memory appearance remains usable. */ } };
  useEffect(() => {
    if (!drawer) return;
    const menu = document.getElementById("navigation");
    const controls = Array.from(menu?.querySelectorAll<HTMLElement>("button,a[href]") ?? []);
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
  useEffect(() => { document.body.classList.toggle("mobile-nav-open", drawer); return () => document.body.classList.remove("mobile-nav-open"); }, [drawer]);
  return <div className="app-shell"><a className="skip-link" href="#workspace">Skip to content</a><aside className={`sidebar ${drawer ? "bcs-open" : ""}`} id="navigation"><div className="logo"><div className="brandmark"><Icon name="send" /></div><div><div className="brandname">UNIVERSAL NOTIFY</div><div className="brandsub">Communication Engine</div></div></div><button type="button" className="btn mobile-toggle" onClick={() => { setDrawer(false); toggle.current?.focus(); }}>Close navigation</button><div className="nav-label">MAIN WORKSPACE</div><nav className="navlinks" aria-label="Main workspace">{navigation.map((item, index) => <NavItem key={item.href} {...item} index={index} active={page === item.label} />)}</nav><div className="nav-label">CONNECTED PORTAL</div><div className="navlinks"><a href="/configuration" className="nav-link"><Icon name="school" /> SkillMonk Academy <Icon name="chevron" /></a></div><div className="sidebar-bottom"><div className="side-note"><strong>Synthetic UI foundation</strong><p>Fictional sample data. No external database, Amazon SES or live email connection.</p></div><div className="sidebar-mini"><span className="live-dot" /> Step 3A · 5 reusable pages</div></div></aside>{drawer && <button type="button" className="bcs-backdrop" aria-label="Close navigation" onClick={() => setDrawer(false)} />}<div className="main"><header className="topbar"><div className="top-start"><button type="button" className="round-icon mobile-toggle" ref={toggle} aria-label="Open navigation" aria-expanded={drawer} aria-controls="navigation" onClick={() => setDrawer(!drawer)}><Icon name="menu" /></button><div className="breadcrumb">Workspace <Icon name="chevron" /><strong>{page}</strong></div></div><div className="top-actions"><div className="demo-ribbon"><Icon name="spark" /> SYNTHETIC UI DEMO</div><button type="button" className="round-icon" aria-label="Toggle appearance" aria-pressed={dark} onClick={toggleTheme}><Icon name="moon" /></button><button type="button" className="round-icon" disabled aria-label="Notifications — preview only"><Icon name="bell" /></button><div className="userbox"><div className="top-avatar">SM</div><div><strong>Portal Admin</strong><small>SkillMonk Academy</small></div></div></div></header><main className="content" id="workspace">{children}</main><footer className="footer"><span>© 2026 Universal Notify · UI foundation</span><span>Synthetic data · No actual messages sent</span></footer></div></div>;
}
export function DetailDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose(): void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => { const opener = document.activeElement as HTMLElement | null; const dialog = ref.current; dialog?.showModal(); return () => { dialog?.close(); queueMicrotask(() => opener?.focus()); }; }, []);
  return <dialog ref={ref} className="dialog bcs-dialog" aria-labelledby={id} onCancel={event => { event.preventDefault(); onClose(); }}><div className="dialog-head"><h2 id={id}>{title}</h2><ActionButton onClick={onClose} aria-label="Close details">Close</ActionButton></div><div className="dialog-body">{children}</div></dialog>;
}
