'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ActionButton, DetailDialog, Panel, SmartSelect } from '@bcs/ui';

type RefRow = { id: string; portal_name?: string; role_name?: string; role_code?: string; is_builtin?: boolean; display_name?: string; status?: string };
type RightsData = { principals: RefRow[]; roles: RefRow[]; portals: RefRow[] };
type Capability = 'checking' | 'ready' | 'admin' | 'migration' | 'unauthorized' | 'unavailable';
type UserRecord = { id: string; display_name: string | null; email: string | null; status: string; role_ids: string[]; portal_ids: string[]; created_at: string; updated_at: string };
type HistoryEntry = { id: string; action: string; occurred_at: string; safe_metadata: Record<string,unknown> };
type AuthState = { confirmed: boolean; activated: boolean; invited: boolean; emailMatches: boolean };

const messages: Record<string,string> = {
  COMPANY_PRINCIPAL_ALREADY_EXISTS:'That address is already assigned in this company.',
  AUTH_INVITATION_NOT_ACCEPTED:'Supabase did not accept this invitation. Check whether the email already has an Auth account.',
  INVITATION_SENT_ONBOARDING_REQUIRES_RECONCILIATION:'Email may have been sent, but the BCS user record needs administrator reconciliation.',
  OLD_INVITATION_SUSPENDED_REPLACEMENT_FAILED:'The old BCS account is suspended, but the replacement invitation failed. Verify the address and retry with administrator assistance.',
  ONLY_PENDING_INVITES_CAN_BE_RESENT:'This user already activated their account. Use password recovery instead.',
  ACTIVE_EMAIL_REQUIRES_USER_VERIFICATION:'Activated users cannot have their email changed by an administrator without verified account ownership.',
  USER_ENROLLMENT_MIGRATION_REQUIRED:'Restricted onboarding migration 020 is missing.',
  MIGRATION_021_REQUIRED:'User Management migration 021 must be applied before profile edits.',
  CANNOT_MODIFY_SELF:'You cannot suspend or replace your own administrator account.',
  MANAGER_ACCOUNT_PROTECTED:'Users holding User Rights management are protected from suspension or replacement.',
  AUTH_PROVIDER_RATE_LIMITED:'Supabase has temporarily limited authentication emails. Wait before retrying.',
  AUTH_PROVIDER_OPERATION_REJECTED:'Supabase rejected this account operation; check the existing Auth record.',
  EMAIL_NOT_CHANGED:'Enter a different address for the replacement invitation.',
  COMPANY_EMAIL_EXISTS:'This corrected email already belongs to a BCS company user.',
  IDENTITY_EMAIL_MISMATCH:'BCS and Supabase email records differ; reconcile them before proceeding.',
  AUTH_REDIRECT_NOT_CONFIGURED:'The BCS activation redirect is not configured.',
};
const errorText = (code: string): string => messages[code] ?? `Operation unavailable (${code || 'UNKNOWN_ERROR'}). No success is assumed.`;

/** All management calls are company-authorized server endpoints.
 * BCS never stores a user's password or mutates Supabase auth tables directly.
 */
export function BcsUserCreation() {
  const [data, setData] = useState<RightsData | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [selfId, setSelfId] = useState('');
  const [managementEnabled, setManagementEnabled] = useState(false);
  const [capability, setCapability] = useState<Capability>('checking');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [portal, setPortal] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState(false);
  const [selected, setSelected] = useState<UserRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [correctRole, setCorrectRole] = useState<string | null>(null);
  const [correctPortal, setCorrectPortal] = useState<string | null>(null);
  const [replaceAcknowledged, setReplaceAcknowledged] = useState(false);
  const [identity, setIdentity] = useState<AuthState | null>(null);
  const [identityMessage, setIdentityMessage] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [detailError, setDetailError] = useState('');
  const [detailNotice, setDetailNotice] = useState('');
  const enabled = capability === 'ready';

  const loadDirectory = useCallback(async () => {
    const res = await fetch('/api/bcs/app/users?view=directory', { cache:'no-store', credentials:'same-origin' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw Error(errorText(String(body?.error?.code ?? 'DIRECTORY_UNAVAILABLE')));
    setUsers(Array.isArray(body.data?.users) ? body.data.users : []);
    setSelfId(String(body.data?.selfId ?? ''));
    setManagementEnabled(body.data?.managementEnabled === true);
  }, []);

  const reload = useCallback(async () => {
    const response = await fetch('/api/bcs/app/configuration?kind=rights', { cache:'no-store' });
    if (!response.ok) throw Error('Company-wide User Rights access is required.');
    const body = await response.json();
    setData(body.data as RightsData);
    await loadDirectory();
  }, [loadDirectory]);

  const checkCapability = useCallback(async () => {
    try {
      const res = await fetch('/api/bcs/app/users', { cache:'no-store' });
      if (res.status === 401 || res.status === 403) { setCapability('unauthorized'); return; }
      if (!res.ok) { setCapability('unavailable'); return; }
      const body = await res.json() as { data?: { invitationEnabled?: boolean; setupRequired?: string | null } };
      setCapability(body.data?.invitationEnabled === true ? 'ready' : body.data?.setupRequired === 'MIGRATION' ? 'migration' : 'admin');
    } catch { setCapability('unavailable'); }
  }, []);

  useEffect(() => {
    void reload().catch(err => setError(err instanceof Error ? err.message : 'Directory unavailable'));
    void checkCapability();
  }, [reload,checkCapability]);

  async function post(payload: Record<string,unknown>) {
    const res = await fetch('/api/bcs/app/users', {
      method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw Error(errorText(String(body?.error?.code ?? 'REQUEST_FAILED')));
    return body.data as Record<string,unknown>;
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || busy || !role || !portal) return;
    setBusy(true);setError('');setNotice('');
    try {
      await post({action:'invite',email:email.trim().toLowerCase(),displayName:name.trim(),portalId:portal,roleId:role});
      setNotice(`Invitation submitted for ${name.trim()} (${email.trim().toLowerCase()}). Activation must be completed by the recipient.`);
      setName('');setEmail('');setRole(null);setPortal(null);setPreview(false);
      await reload();
    } catch(err) { setError(err instanceof Error ? err.message : 'Unable to invite user'); }
    finally {setBusy(false);}
  }

  const openUser = (person:UserRecord) => {
    setSelected(person);setEditName(person.display_name??'');setNewEmail('');
    setCorrectRole(person.role_ids[0]??null);setCorrectPortal(person.portal_ids[0]??null);
    setReplaceAcknowledged(false);setIdentity(null);setIdentityMessage('Checking Supabase identity…');setHistory([]);setDetailError('');setDetailNotice('');
    const id=encodeURIComponent(person.id);
    void fetch(`/api/bcs/app/users?view=identity&principal=${id}`,{cache:'no-store'})
      .then(async r=>{const body=await r.json().catch(()=>({}));if(!r.ok)throw Error(errorText(String(body?.error?.code??'IDENTITY_UNAVAILABLE')));return body.data?.identity as AuthState;})
      .then(result=>{setIdentity(result);setIdentityMessage('');})
      .catch(err=>{setIdentityMessage(err instanceof Error?err.message:'Identity status unavailable');});
    void fetch(`/api/bcs/app/users?view=history&principal=${id}`,{cache:'no-store'})
      .then(async r=>{const body=await r.json().catch(()=>({}));if(!r.ok)throw Error();return body.data?.history as HistoryEntry[];})
      .then(rows=>setHistory(Array.isArray(rows)?rows:[]))
      .catch(()=>setHistory([]));
  };

  async function modify(action:string,extra:Record<string,unknown>={}) {
    if (!selected || busy) return;
    setBusy(true);setDetailError('');setDetailNotice('');
    try {
      const result=await post({action,principalId:selected.id,...extra});
      setDetailNotice(typeof result.message==='string'?result.message:'Changes saved.');
      await reload();
      if(action==='correct_pending_email') {setSelected(null);setNotice('The incorrect pending account was suspended and a new invitation was submitted.');return;}
      const updatedName=action==='edit_name'?String(extra.displayName):selected.display_name;
      const updatedStatus=action==='suspend'?'suspended':action==='restore'?'active':selected.status;
      setSelected({...selected,display_name:updatedName,status:updatedStatus});
      if(action==='suspend'||action==='restore')setIdentity(null);
    }catch(err){setDetailError(err instanceof Error?err.message:'Unable to save changes');}
    finally{setBusy(false);}
  }

  const principals=users.filter(person=>`${person.display_name??''} ${person.email??''} ${person.status}`.toLowerCase().includes(query.trim().toLowerCase()));
  const readiness:Record<Capability,string>={
    checking:'Checking invitation availability…',ready:'Invitation email sending enabled. The recipient creates their own password.',
    admin:'Configure the private Supabase Auth Admin key and approved activation redirect.',
    migration:'Apply the approved restricted onboarding migration 020.',
    unauthorized:'Company-wide User Rights permission is required.',
    unavailable:'Cannot contact the BCS invitation service.',
  };
  const roleOptions=(data?.roles??[]).map(item=>({value:item.id,label:item.role_name??item.role_code??item.id}));
  const portalOptions=(data?.portals??[]).map(item=>({value:item.id,label:item.portal_name??item.id}));
  const roleNames=(ids:string[])=>ids.map(id=>data?.roles.find(role=>role.id===id)?.role_name??id.slice(0,8)).join(', ')||'No role';
  const portalNames=(ids:string[])=>ids.map(id=>data?.portals.find(p=>p.id===id)?.portal_name??id.slice(0,8)).join(', ')||'No portal';
  const canEditSelected=!!selected && selected.status!=='retired' && managementEnabled && !busy;
  const canChangeOther=canEditSelected && selected?.id!==selfId;

  return <div className="bcs-admin-grid">
    <Panel title="Create & invite users" subtitle="Secure email invitation · company-scoped access">
      <form className="card-body bcs-admin-form" onSubmit={invite}>
        <div className={enabled?'bcs-form-good':'bcs-info'} role="status"><strong>{enabled?'Invitations ready.':'Invitations unavailable.'}</strong> {readiness[capability]} {!enabled&&capability!=='checking'&&<button type="button" className="bcs-status-refresh" onClick={()=>void checkCapability()}>Check again</button>}</div>
        <div className="form-grid">
          <div className="field"><label className="label" htmlFor="bcs-new-user-email">Email address *</label><input className="input" id="bcs-new-user-email" type="email" required maxLength={254} autoComplete="off" value={email} onChange={event=>setEmail(event.target.value)} placeholder="name@company.com"/></div>
          <div className="field"><label className="label" htmlFor="bcs-new-user-name">Full name *</label><input className="input" id="bcs-new-user-name" required maxLength={120} minLength={2} value={name} onChange={event=>setName(event.target.value)} placeholder="Recipient's full name"/></div>
          <SmartSelect label="Assign role *" options={roleOptions} value={role} onChange={setRole}/>
          <SmartSelect label="Assign portal *" options={portalOptions} value={portal} onChange={setPortal}/>
        </div>
        <p className="helper">Each invited user creates their own password. BCS grants only authorized company and portal access.</p>
        <div className="inline-actions"><button className="bcs-btn" type="button" aria-expanded={preview} onClick={()=>setPreview(value=>!value)}>{preview?'Hide email preview':'Preview invitation email'}</button></div>
        {preview&&<section className="bcs-invite-preview" aria-label="Invitation email design preview"><div className="bcs-invite-preview-heading">SOFTVAT BCS · ACCOUNT INVITATION</div><p>Dear</p><strong className="bcs-invite-preview-name">{name.trim()||'Recipient Name'}</strong><p>You are invited to access Universal Notify — SoftVAT BCS.</p><div className="bcs-invite-preview-button">Click Here to Activate Your Account</div><p className="helper">Design preview only. Supabase sends the actual template.</p></section>}
        {error&&<p role="alert" className="bcs-form-alert">{error}</p>}{notice&&<p role="status" className="bcs-form-good">{notice}</p>}
        <div className="inline-actions"><button type="submit" className="bcs-btn bcs-btn-primary" disabled={!data||!enabled||busy||!role||!portal}>{busy?'Sending invitation…':'Invite user →'}</button><a className="bcs-btn" href="/admin/rights">Manage user rights →</a></div>
      </form>
    </Panel>
    <Panel title="Company user directory" subtitle="Edit company users · authorized scope">
      <div className="card-body"><label className="label" htmlFor="bcs-user-search">Search users</label><input className="input" id="bcs-user-search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Name, email or status"/>
        {!managementEnabled&&<p className="bcs-info">Directory is available. Migration 021 is required before modifying names or account status.</p>}
        <ul className="bcs-directory">{principals.map(person=><li className="bcs-directory-row" key={person.id}><span className="bcs-avatar">{(person.display_name??'U').slice(0,2).toUpperCase()}</span><div><strong>{person.display_name??'Unnamed principal'}</strong><small>{person.email??'No email'} · {person.status}</small><small>{roleNames(person.role_ids)} · {portalNames(person.portal_ids)}</small></div><button type="button" className="bcs-btn bcs-btn-small" onClick={()=>openUser(person)}>Edit user</button></li>)}{!principals.length&&<li className="bcs-muted">No matching company users.</li>}</ul>
        <ActionButton onClick={()=>void reload().catch(err=>setError(err instanceof Error?err.message:'Refresh unsuccessful'))}>Refresh directory</ActionButton>
      </div>
    </Panel>
    {selected&&<DetailDialog title={`Manage user — ${selected.display_name??selected.email??'Account'}`} onClose={()=>{if(!busy)setSelected(null);}}>
      <div className="bcs-user-detail" data-testid="bcs-user-edit">
        <p className="bcs-muted">{selected.email??'No email'} · BCS status: <strong>{selected.status}</strong></p>
        <p className="bcs-muted">Roles: {roleNames(selected.role_ids)}. Portals: {portalNames(selected.portal_ids)}.</p>
        <div className="bcs-user-edit-group"><h3>Profile</h3><label className="label" htmlFor="bcs-edit-name">Full name</label><input className="input" id="bcs-edit-name" value={editName} maxLength={120} onChange={event=>setEditName(event.target.value)} disabled={!canEditSelected}/><button className="bcs-btn bcs-btn-primary" type="button" disabled={!canEditSelected||editName.trim().length<2||editName.trim()===selected.display_name} onClick={()=>void modify('edit_name',{displayName:editName.trim()})}>Save name</button></div>
        <div className="bcs-user-edit-group"><h3>Account access</h3><div className="bcs-chips"><span className="bcs-chip">Identity: {identityMessage||(!identity?'Not checked':identity.confirmed?'Email confirmed':'Invitation pending')}</span><span className="bcs-chip">BCS: {selected.status}</span></div>
          <div className="inline-actions"><a href={`/admin/rights?user=${encodeURIComponent(selected.id)}`} className="bcs-btn">Assign / revoke rights</a>{selected.status==='active'?<button type="button" className="bcs-btn bcs-user-danger" disabled={!canChangeOther} onClick={()=>void modify('suspend')}>Suspend account</button>:<button type="button" className="bcs-btn" disabled={!canChangeOther||selected.status==='retired'} onClick={()=>void modify('restore')}>Restore account</button>}</div>
          <p className="helper">Suspending revokes BCS sessions; it does not delete historical reports or Supabase identity records.</p>
        </div>
        <div className="bcs-user-edit-group"><h3>Invitation and password assistance</h3><div className="inline-actions"><button type="button" className="bcs-btn" disabled={!canChangeOther||!identity||identity.confirmed} onClick={()=>void modify('resend_invite')}>Resend pending invitation</button><button type="button" className="bcs-btn" disabled={!canChangeOther||!identity?.confirmed} onClick={()=>void modify('recover_password')}>Send password recovery</button></div><p className="helper">Recovery links use the Supabase Recovery email template; configure it for the BCS activation page before sending. Supabase may rate-limit repeated invitations.</p></div>
        <div className="bcs-user-edit-group"><h3>Incorrect email on an unactivated invitation</h3><p className="helper">An active user's email must be changed by a verified account-ownership process. For an unconfirmed invitation, BCS first suspends the incorrect principal and then sends a new invitation. The old Supabase identity remains for administrator review.</p>
          <label className="label" htmlFor="bcs-correct-email">Correct email address</label><input className="input" id="bcs-correct-email" type="email" value={newEmail} onChange={event=>setNewEmail(event.target.value)} disabled={!canChangeOther||identity?.confirmed!==false} placeholder="correct@company.com" />
          <div className="form-grid"><SmartSelect label="Replacement role" options={roleOptions} value={correctRole} onChange={setCorrectRole}/><SmartSelect label="Replacement portal" options={portalOptions} value={correctPortal} onChange={setCorrectPortal}/></div>
          <label className="bcs-user-confirm"><input type="checkbox" checked={replaceAcknowledged} disabled={!canChangeOther||identity?.confirmed!==false} onChange={event=>setReplaceAcknowledged(event.target.checked)} /> I understand the old BCS user will be suspended before sending a new invitation.</label>
          <button className="bcs-btn bcs-user-danger" type="button" disabled={!canChangeOther||identity?.confirmed!==false||!newEmail||!correctRole||!correctPortal||!replaceAcknowledged} onClick={()=>void modify('correct_pending_email',{newEmail,roleId:correctRole,portalId:correctPortal})}>Replace pending invitation</button>
        </div>
        <div className="bcs-user-edit-group"><h3>Change history</h3>{history.length?<ul className="bcs-user-history">{history.map(event=><li key={event.id}><strong>{event.action.replaceAll('_',' ')}</strong> <span>{new Date(event.occurred_at).toLocaleString()}</span></li>)}</ul>:<p className="bcs-muted">No history entries available.</p>}</div>
        {detailError&&<p role="alert" className="bcs-form-alert">{detailError}</p>}{detailNotice&&<p role="status" className="bcs-form-good">{detailNotice}</p>}
      </div>
    </DetailDialog>}
  </div>;
}
