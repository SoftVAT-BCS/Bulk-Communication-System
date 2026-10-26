"use client";

import { useEffect, useState, type FormEvent } from "react";
import { safeWorkspacePage } from "./role-home";

/** Dedicated UI for the EXISTING /api/bcs/app/session server-side Supabase Auth flow.
 * Does not replace its verification, identity-to-principal mapping or secure cookie.
 */
export function BcsAdminLogin() {
  const [email, setEmail] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [chooseCompany, setChooseCompany] = useState(false);
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [home, setHome] = useState("/");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/bcs/app/session", { cache: "no-store", signal: controller.signal })
      .then(async (res) => { if (res.ok) { const payload = await res.json(); setHome(safeWorkspacePage(payload?.data?.home)); setAuthenticated(true); } })
      .catch(() => { /* Availability is reported on submit. */ })
      .finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/bcs/app/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username: email.trim().toLowerCase(), password, ...(chooseCompany ? { companyId } : {}) }),
      });
      setPassword("");
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        const code = String(result?.error?.code ?? "");
        if (code === "COMPANY_SELECTION_REQUIRED") { setChooseCompany(true); setMessage("This identity has multiple memberships. Enter the authorized company ID supplied by your administrator and sign in again."); return; }
        setMessage(code === "ACCOUNT_NOT_AUTHORIZED"
          ? "This account is not assigned to a BCS company and portal. Contact the workspace administrator."
          : code === "MFA_REQUIRED"
            ? "Multi-factor authentication is required, but this sign-in flow does not yet support it."
            : code === "AUTH_NOT_CONFIGURED"
              ? "Supabase authentication is not configured on the server."
              : "Unable to sign in. Check your account or try again later.");
        return;
      }
      const body = await response.json();
      window.location.assign(safeWorkspacePage(body?.data?.home));
    } catch {
      setMessage("Unable to contact the BCS application server. Try again later.");
    } finally { setPending(false); }
  }

  return <div className="bcs-auth-layout">
    <section className="bcs-auth-aside" aria-label="Universal Notify introduction">
      <div className="bcs-auth-logo"><span className="bcs-auth-mark">➤</span><div><strong>UNIVERSAL NOTIFY</strong><small>SoftVAT Bulk Communication System</small></div></div>
      <div><span className="bcs-auth-eyebrow">SECURE SAAS WORKSPACE</span><h1>One communication workspace.<br />Complete control.</h1><p>Manage recipients, reusable email templates, scheduling, delivery intelligence and connected portals in one place.</p></div>
      <div className="bcs-auth-assurance">Company-scoped access · Authenticated sessions · Permission-aware actions</div>
    </section>
    <main className="bcs-auth-main">
      <div className="bcs-auth-card">
        <div className="bcs-auth-kicker">WORKSPACE ACCESS</div>
        <h2>{authenticated ? "Welcome back" : "Sign in to SoftVAT BCS"}</h2>
        <p className="bcs-muted">{authenticated ? "Your session is active." : "Use your confirmed Supabase Auth account. Your BCS role and portal must be authorized."}</p>
        {checking ? <p role="status">Checking your session…</p> : authenticated ? <a href={home} className="bcs-btn bcs-btn-primary bcs-auth-full">Open workspace →</a> :
          <form onSubmit={submit} className="bcs-auth-form">
            <label htmlFor="bcs-login-email">Email address</label>
            <input id="bcs-login-email" type="email" required autoComplete="username" maxLength={254} value={email} placeholder="you@company.com" onChange={e => setEmail(e.target.value)} />
            <label htmlFor="bcs-login-password">Password</label>
            <div className="bcs-password-wrap"><input id="bcs-login-password" required minLength={1} maxLength={4096} type={visible ? "text" : "password"} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /><button type="button" onClick={() => setVisible(v => !v)} aria-label={visible ? "Hide password" : "Show password"}>{visible ? "Hide" : "Show"}</button></div>
            {chooseCompany && <><label htmlFor="bcs-login-company">Authorized company ID</label><input id="bcs-login-company" required value={companyId} maxLength={36} onChange={e=>setCompanyId(e.target.value)} /></>}
            {message && <div className="bcs-form-alert" role="alert">{message}</div>}
            <button type="submit" className="bcs-btn bcs-btn-primary bcs-auth-full" disabled={pending}>{pending ? "Signing in…" : "Sign in →"}</button>
          </form>}
        <div className="bcs-auth-note">Only authorized company/portal accounts can sign in. Authentication is verified by Supabase; passwords are never stored in this page.</div>
      </div>
      <div className="bcs-auth-foot">© 2026 SoftVAT BCS · Secure workspace</div>
    </main>
  </div>;
}
