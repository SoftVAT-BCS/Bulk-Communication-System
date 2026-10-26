'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

type InviteToken = { tokenHash?: string; accessToken?: string; type: 'invite' | 'recovery' };

/** The same branded shell as Login, with a one-time invitation credential.
 * Never persists a token or password to localStorage, cookies, or a URL.
 * A Supabase token hash is consumed only after the user submits a valid form.
 */
export function BcsActivateAccount() {
  const [token, setToken] = useState<InviteToken | null>(null);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [completedRecovery, setCompletedRecovery] = useState(false);
  // React Strict Mode replays mount effects in development. Keep the first
  // captured invitation: the fragment is deliberately removed immediately.
  const invitationParsed = useRef(false);

  useEffect(() => {
    if (invitationParsed.current) return;
    invitationParsed.current = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const tokenHash = hash.get('token_hash') ?? query.get('token_hash');
    const inviteType = hash.get('type') ?? query.get('type');
    const legacyAccessToken = hash.get('access_token');
    const allowedType = inviteType === 'recovery' ? 'recovery' : inviteType === 'invite' || !inviteType ? 'invite' : null;
    const credential: InviteToken | null = tokenHash && allowedType
      ? { tokenHash, type: allowedType }
      : legacyAccessToken && allowedType
        ? { accessToken: legacyAccessToken, type: allowedType }
        : null;
    // Remove secrets from the browser address bar, history, and copied URLs.
    window.history.replaceState(window.history.state, '', window.location.pathname);
    setToken(credential);
    if (!credential) setError('Invitation link is missing or invalid. Please request a new invitation.');
    setChecking(false);
  }, []);

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !token) return;
    if (password.length < 12 || password.length > 128) {
      setError('Choose a password between 12 and 128 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please enter them again.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/bcs/app/activation', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...token, password, confirmPassword }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = String(result?.error?.code ?? '');
        setError(code === 'INVITATION_EXPIRED_OR_INVALID' || code === 'INVALID_INVITATION_TOKEN'
          ? 'The activation link has expired or has been used. Ask your administrator for a new invitation.'
          : code === 'PASSWORD_REQUIREMENTS_NOT_MET' || code === 'PASSWORD_UPDATE_REJECTED'
            ? 'The password does not meet Supabase security requirements. Try a stronger password, or request a fresh link if already used.'
            : code === 'ACTIVATION_RATE_LIMITED'
              ? 'Too many attempts. Please try again later.'
              : 'Account activation could not be completed. Contact your administrator if the issue continues.');
        return;
      }
      if (result?.data?.activated !== true) throw Error('Invalid response');
      setPassword('');
      setConfirmPassword('');
      setCompletedRecovery(token.type === 'recovery');
      setToken(null);
      setSuccess(true);
    } catch {
      setError('Unable to contact the activation service. Please try again later.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="bcs-auth-layout">
    <section className="bcs-auth-aside" aria-label="Universal Notify introduction">
      <div className="bcs-auth-logo"><span className="bcs-auth-mark">➤</span><div><strong>UNIVERSAL NOTIFY</strong><small>SoftVAT Bulk Communication System</small></div></div>
      <div><span className="bcs-auth-eyebrow">SECURE ACCOUNT ACTIVATION</span><h1>One communication workspace.<br />Complete control.</h1><p>Your BCS access begins with a secure invitation and your own private password.</p></div>
      <div className="bcs-auth-assurance">Verified email · Secure password · Company-scoped permissions</div>
    </section>
    <main className="bcs-auth-main">
      <div className="bcs-auth-card">
        <div className="bcs-auth-kicker">WELCOME TO SOFTVAT BCS</div>
        <h2>{success ? (completedRecovery ? 'Password updated!' : 'Your account is activated!') : (token?.type === 'recovery' ? 'Reset your password' : 'Create your password')}</h2>
        {success ? <>
          <p className="bcs-muted" role="status">Your password is now stored securely with Supabase Authentication. You can sign in with your account email address.</p>
          <a href="/login" className="bcs-btn bcs-btn-primary bcs-auth-full">Go to Login →</a>
        </> : <>
          <p className="bcs-muted">Set your own secure password to activate or recover your account. Your administrator cannot see your password.</p>
          {checking ? <p role="status">Checking invitation link…</p> : token ? <form className="bcs-auth-form" onSubmit={activate}>
            <label htmlFor="bcs-create-password">Create password *</label>
            <div className="bcs-password-wrap">
              <input id="bcs-create-password" name="new-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} />
              <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide new password' : 'Show new password'} aria-pressed={showPassword}>{showPassword ? 'Hide' : 'Show'}</button>
            </div>
            <label htmlFor="bcs-confirm-password">Confirm password *</label>
            <div className="bcs-password-wrap">
              <input id="bcs-confirm-password" name="confirm-password" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" required minLength={12} maxLength={128} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />
              <button type="button" onClick={() => setShowConfirm(value => !value)} aria-label={showConfirm ? 'Hide confirmation password' : 'Show confirmation password'} aria-pressed={showConfirm}>{showConfirm ? 'Hide' : 'Show'}</button>
            </div>
            <p className="bcs-password-hint">Use a unique password of at least 12 characters. A password manager is recommended.</p>
            {confirmPassword && password !== confirmPassword && <p className="bcs-password-mismatch" role="status">Passwords do not match yet.</p>}
            <button className="bcs-btn bcs-btn-primary bcs-auth-full" type="submit" disabled={busy || password.length < 12 || password !== confirmPassword}>{busy ? 'Saving password…' : token?.type === 'recovery' ? 'Update My Password →' : 'Activate My Account →'}</button>
          </form> : <a href="/login" className="bcs-btn bcs-auth-full">Return to Login →</a>}
          {error && <p role="alert" className="bcs-form-alert">{error}</p>}
        </>}
        <div className="bcs-auth-note">Secure email links can be used only once. Passwords are verified and stored by Supabase Authentication, not in the BCS database or this browser.</div>
      </div>
      <div className="bcs-auth-foot">© 2026 SoftVAT BCS · Secure workspace</div>
    </main>
  </div>;
}
