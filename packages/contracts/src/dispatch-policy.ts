/** Server-validated policy. Simulation never authorizes a provider call. */
export const batchSizes = [1, 5, 10, 25, 50] as const;
export const intervals = [5, 10, 30, 60, 120, 300, 600] as const;
export interface DispatchPolicy {
  mode: 'simulation'; batchSize: number; intervalSeconds: number;
  ratePerSecond: number; dailyLimit: number; campaignLimit: number;
  subscriptionLimit: number; maxConcurrency: number; maxAttempts: number;
  backoffSeconds: number; maxBackoffSeconds: number;
  startAt: string; timezone: string;
}
export interface PolicyBounds { minIntervalSeconds: number; maxIntervalSeconds: number }
export const safeBounds: PolicyBounds = { minIntervalSeconds: 5, maxIntervalSeconds: 600 };
export class PolicyError extends Error {}
export function validatePolicy(value: unknown, bounds: PolicyBounds = safeBounds): DispatchPolicy {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new PolicyError('INVALID_POLICY');
  const p = value as DispatchPolicy;
  const keys = ['mode','batchSize','intervalSeconds','ratePerSecond','dailyLimit','campaignLimit','subscriptionLimit','maxConcurrency','maxAttempts','backoffSeconds','maxBackoffSeconds','startAt','timezone'];
  if (Object.keys(p).some(k => !keys.includes(k)) || p.mode !== 'simulation') throw new PolicyError('SIMULATION_ONLY');
  if (!(batchSizes as readonly number[]).includes(p.batchSize)) throw new PolicyError('INVALID_BATCH_SIZE');
  if (!Number.isSafeInteger(bounds.minIntervalSeconds) || !Number.isSafeInteger(bounds.maxIntervalSeconds) || bounds.minIntervalSeconds < 1 || bounds.maxIntervalSeconds > 86400 || bounds.minIntervalSeconds > bounds.maxIntervalSeconds) throw new PolicyError('INVALID_INTERVAL_BOUNDS');
  if (!Number.isSafeInteger(p.intervalSeconds) || p.intervalSeconds < bounds.minIntervalSeconds || p.intervalSeconds > bounds.maxIntervalSeconds) throw new PolicyError('INVALID_INTERVAL');
  for (const k of ['ratePerSecond','dailyLimit','campaignLimit','subscriptionLimit','maxConcurrency','maxAttempts','backoffSeconds','maxBackoffSeconds'] as const) {
    if (!Number.isSafeInteger(p[k]) || p[k] < 1 || p[k] > 1000000) throw new PolicyError(`INVALID_${k}`);
  }
  if (p.maxAttempts > 21 || p.maxConcurrency > 50 || p.maxBackoffSeconds > 86400 || p.backoffSeconds > p.maxBackoffSeconds) throw new PolicyError('INVALID_RETRY_OR_CONCURRENCY');
  if (typeof p.startAt !== 'string' || !/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(p.startAt) || !Number.isFinite(Date.parse(p.startAt))) throw new PolicyError('INVALID_START_INSTANT');
  try { new Intl.DateTimeFormat('en', { timeZone: p.timezone }).format(); } catch { throw new PolicyError('INVALID_TIMEZONE'); }
  if (!p.timezone) throw new PolicyError('INVALID_TIMEZONE');
  return { ...p, startAt: new Date(p.startAt).toISOString() };
}
export function estimateDuration(count: number, policy: DispatchPolicy) {
  if (!Number.isSafeInteger(count) || count < 0) throw new PolicyError('INVALID_COUNT');
  const effectiveBatch = Math.min(policy.batchSize, policy.maxConcurrency, policy.ratePerSecond);
  return Math.max(0, Math.ceil(count / effectiveBatch) - 1) * policy.intervalSeconds;
}
export interface SubscriptionPolicy { companyId: string; state: 'trial'|'active'|'suspended'|'expired'; limit: number; startsAt: number; endsAt: number }
export function effectiveLimit(company: string, subscription: SubscriptionPolicy, requested: number, now: number) {
  if (subscription.companyId !== company || !['active','trial'].includes(subscription.state) || now < subscription.startsAt || now >= subscription.endsAt || !Number.isSafeInteger(subscription.limit) || subscription.limit < 1) throw new PolicyError('SUBSCRIPTION_UNAVAILABLE');
  return Math.min(subscription.limit, requested);
}
