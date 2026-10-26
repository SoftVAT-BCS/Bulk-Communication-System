import { randomUUID } from 'node:crypto';
import { effectiveLimit, validatePolicy, type DispatchPolicy, type SubscriptionPolicy } from '../../../packages/contracts/src/dispatch-policy.ts';

export interface Recipient { id: string; companyId: string; portalId: string; email: string; name: string; course: string; batch: string; status: string; subscribed: boolean; evidence: boolean; suppressed: boolean }
export interface SimulationJob {
  id: string; companyId: string; portalId: string; campaignId: string; recipientId: string;
  subject: string; html: string; policy: DispatchPolicy; availableAt: number;
  state: 'pending'|'leased'|'retry_wait'|'completed'|'cancelled'|'dead_letter'|'excluded';
  attempts: number; token?: string; leaseExpiresAt?: number; startedAt?: number;
  failure?: string; failuresBeforeSuccess?: number;
}
export interface Account { id: string; active: boolean; portals: string[]; dailyLimit: number; ratePerSecond: number; maxConcurrency: number; subscription: SubscriptionPolicy }
export interface Receipt { jobId: string; companyId: string; portalId: string; campaignId: string; at: number; outcome: 'simulated'; to: string; subject: string; html: string }
export interface Reservation { jobId: string; token: string; companyId: string; state: 'held'|'released'|'consumed'; at: number }
export interface SimulationState {
  format: 'bcs-synthetic-simulation-v1'; accounts: Account[]; recipients: Recipient[];
  dispatch_jobs: SimulationJob[]; receipts: Receipt[]; quota_reservations: Reservation[];
  nextBatchAt: Record<string, number>; controls: Record<string, 'running'|'paused'|'cancelled'>;
}
export interface Store { transaction<T>(work: (state: SimulationState) => T): Promise<T> }
function campaignKey(j: SimulationJob) { return `${j.companyId}/${j.portalId}/${j.campaignId}`; }
function eligible(s: SimulationState, j: SimulationJob) {
  const a = s.accounts.find(a => a.id === j.companyId);
  const r = s.recipients.find(r => r.companyId === j.companyId && r.portalId === j.portalId && r.id === j.recipientId);
  if (!a?.active || !a.portals.includes(j.portalId)) return null;
  return r && r.status === 'Active' && r.subscribed && r.evidence && !r.suppressed ? r : null;
}
function release(s: SimulationState, j: SimulationJob, consumed = false) {
  const r = s.quota_reservations.find(r => r.jobId === j.id && r.token === j.token && r.state === 'held');
  if (r) r.state = consumed ? 'consumed' : 'released';
  j.token = undefined; j.leaseExpiresAt = undefined;
}
function backoff(j: SimulationJob) { return Math.min(j.policy.maxBackoffSeconds, j.policy.backoffSeconds * 2 ** Math.min(20, j.attempts - 1)) * 1000; }
export function claim(s: SimulationState, now: number, leaseMs = 30000): SimulationJob[] {
  if (!Number.isFinite(now) || !Number.isSafeInteger(leaseMs) || leaseMs < 1000) throw Error('INVALID_CLOCK_OR_LEASE');
  for (const j of s.dispatch_jobs) {
    if (j.state === 'leased' && (j.leaseExpiresAt ?? 0) <= now) {
      release(s, j); j.state = j.attempts >= j.policy.maxAttempts ? 'dead_letter' : 'retry_wait';
      j.failure = 'LEASE_EXPIRED'; j.availableAt = now + backoff(j);
    }
  }
  const claimed: SimulationJob[] = [];
  for (const a of s.accounts) {
    if (!a.active || (s.nextBatchAt[a.id] ?? 0) > now) continue;
    const first = s.dispatch_jobs.find(j => j.companyId === a.id && ['pending','retry_wait'].includes(j.state) && j.availableAt <= now && Date.parse(j.policy.startAt) <= now && (s.controls[campaignKey(j)] ?? 'running') === 'running');
    if (!first) continue;
    const p = validatePolicy(first.policy);
    let subscriptionLimit: number;
    try { subscriptionLimit = effectiveLimit(a.id, a.subscription, p.subscriptionLimit, now); } catch { continue; }
    const dayStart = Math.floor(now / 86400000) * 86400000; // Quota day is explicitly UTC.
    const receipts = s.receipts.filter(r => r.companyId === a.id);
    const held = s.dispatch_jobs.filter(j => j.companyId === a.id && j.state === 'leased');
    const inPeriod = receipts.filter(r => r.at >= a.subscription.startsAt && r.at < a.subscription.endsAt).length;
    const dayUsed = receipts.filter(r => r.at >= dayStart).length;
    const campaignUsed = receipts.filter(r => r.campaignId === first.campaignId && r.portalId === first.portalId).length;
    const recent = s.dispatch_jobs.filter(j => j.companyId === a.id && j.startedAt !== undefined && j.startedAt > now - 1000).length;
    const capacity = Math.max(0, Math.min(p.batchSize, Math.min(p.maxConcurrency, a.maxConcurrency) - held.length,
      Math.min(p.ratePerSecond, a.ratePerSecond) - recent, Math.min(p.dailyLimit, a.dailyLimit) - dayUsed - held.length,
      subscriptionLimit - inPeriod - held.length, p.campaignLimit - campaignUsed - held.filter(j => j.campaignId === first.campaignId && j.portalId === first.portalId).length));
    let count = 0;
    for (const j of s.dispatch_jobs) {
      if (campaignKey(j) !== campaignKey(first) || !['pending','retry_wait'].includes(j.state) || j.availableAt > now || Date.parse(j.policy.startAt) > now) continue;
      if (!eligible(s, j)) { j.state = 'excluded'; j.failure = 'INELIGIBLE'; continue; }
      if (j.attempts >= p.maxAttempts) { j.state = 'dead_letter'; continue; }
      if (count >= capacity) break;
      j.state = 'leased'; j.attempts++; j.token = randomUUID(); j.leaseExpiresAt = now + leaseMs; j.startedAt = now;
      s.quota_reservations.push({ jobId: j.id, token: j.token, companyId: a.id, state: 'held', at: now });
      claimed.push(structuredClone(j)); count++;
    }
    if (count) s.nextBatchAt[a.id] = now + p.intervalSeconds * 1000;
  }
  return claimed;
}
function render(value: string, recipient: Recipient, html: boolean) {
  if (html && /<[^>]*\{\{/.test(value)) throw Error('UNSAFE_VARIABLE_CONTEXT');
  const values: Record<string,string> = { student_name: recipient.name, course_name: recipient.course, batch_name: recipient.batch };
  const result = value.replace(/\{\{([a-z_]+)\}\}/g, (_token, key: string) => {
    if (!values[key]) throw Error('MISSING_PERSONALIZATION_VALUE');
    return html ? values[key].replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c] ?? c)) : values[key];
  });
  if (result.includes('{{') || result.includes('}}')) throw Error('INVALID_VARIABLE');
  return html ? result : result.replace(/[\r\n]/g, ' ');
}
/** No fetch, SMTP, provider SDK or injectable live adapter. Completion and receipt are atomic. */
export function complete(s: SimulationState, lease: SimulationJob, now: number): boolean {
  const j = s.dispatch_jobs.find(j => j.id === lease.id && j.companyId === lease.companyId && j.portalId === lease.portalId);
  if (j?.state !== 'leased' || !j.token || j.token !== lease.token || (j.leaseExpiresAt ?? 0) <= now) return false;
  const control = s.controls[campaignKey(j)] ?? 'running';
  if (control !== 'running') { release(s,j); j.state = control === 'cancelled' ? 'cancelled' : 'pending'; return false; }
  const recipient = eligible(s, j);
  const account = s.accounts.find(a => a.id === j.companyId);
  try { if (!account) throw Error(); effectiveLimit(j.companyId,account.subscription,j.policy.subscriptionLimit,now); }
  catch { release(s,j); j.state = 'pending'; j.failure = 'SUBSCRIPTION_UNAVAILABLE'; return false; }
  if (!recipient) { release(s,j); j.state = 'excluded'; j.failure = 'INELIGIBLE'; return false; }
  if (j.attempts <= (j.failuresBeforeSuccess ?? 0)) {
    release(s,j); j.state = j.attempts >= j.policy.maxAttempts ? 'dead_letter' : 'retry_wait';
    j.availableAt = now + backoff(j); j.failure = 'SIMULATED_TRANSIENT_FAILURE'; return false;
  }
  try {
    const receipt: Receipt = { jobId:j.id, companyId:j.companyId, portalId:j.portalId, campaignId:j.campaignId, at:now,
      outcome:'simulated', to:recipient.email, subject:render(j.subject,recipient,false), html:render(j.html,recipient,true) };
    if (s.receipts.some(r => r.jobId === j.id)) throw Error('DUPLICATE_RECEIPT');
    s.receipts.push(receipt); release(s,j,true); j.state = 'completed'; j.failure = undefined; return true;
  } catch { release(s,j); j.state = 'dead_letter'; j.failure = 'INVALID_PERSONALIZATION'; return false; }
}
export async function tick(store: Store, now?: number) {
  const leases = await store.transaction(s => claim(s,now ?? Date.now()));
  let simulated = 0;
  for (const lease of leases) if (await store.transaction(s => complete(s,lease,now ?? Date.now()))) simulated++;
  return { claimed:leases.length, simulated, mode:'simulation' as const };
}
export function controlCampaign(s: SimulationState, companyId: string, portalId: string, campaignId: string, action: 'pause'|'resume'|'cancel') {
  const jobs = s.dispatch_jobs.filter(j => j.companyId === companyId && j.portalId === portalId && j.campaignId === campaignId);
  if (!jobs.length) throw Error('CAMPAIGN_NOT_FOUND');
  const key = `${companyId}/${portalId}/${campaignId}`;
  if (s.controls[key] === 'cancelled') throw Error('CAMPAIGN_CANCELLED');
  s.controls[key] = action === 'pause' ? 'paused' : action === 'cancel' ? 'cancelled' : 'running';
  for (const j of jobs) if (action !== 'resume' && ['pending','retry_wait','leased'].includes(j.state)) {
    release(s,j); j.state = action === 'cancel' ? 'cancelled' : 'pending';
  }
}
