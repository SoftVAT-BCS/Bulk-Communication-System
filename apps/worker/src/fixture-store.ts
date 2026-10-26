import { closeSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { validatePolicy } from '../../../packages/contracts/src/dispatch-policy.ts';
import type { SimulationState, Store } from './simulation-engine.ts';

export function validateFixture(s: SimulationState) {
  if (s.format !== 'bcs-synthetic-simulation-v1') throw Error('SYNTHETIC_FIXTURE_ONLY');
  const ids = new Set<string>(), keys = new Set<string>();
  for (const r of s.recipients) if (!/^[^@\s]+@[^@\s]+\.invalid$/.test(r.email)) throw Error('SYNTHETIC_ADDRESSES_REQUIRED');
  for (const j of s.dispatch_jobs) {
    validatePolicy(j.policy);
    const key = `${j.companyId}/${j.portalId}/${j.campaignId}/${j.recipientId}`;
    if (ids.has(j.id) || keys.has(key)) throw Error('DUPLICATE_JOB');
    ids.add(j.id); keys.add(key);
    if (!s.accounts.some(a => a.id === j.companyId && a.portals.includes(j.portalId))) throw Error('FOREIGN_PORTAL');
  }
  for (const a of s.accounts) for (const limit of [a.dailyLimit,a.ratePerSecond,a.maxConcurrency]) if (!Number.isSafeInteger(limit) || limit < 1) throw Error('INVALID_ACCOUNT_LIMIT');
}
/** Synthetic acceptance adapter only. Never loads .env or connects to a database. */
export class FixtureStore implements Store {
  readonly path: string;
  constructor(path: string) {
    const root = resolve('.local','saas-simulation');
    this.path = resolve(path);
    if (!this.path.startsWith(`${root}\\`) && !this.path.startsWith(`${root}/`)) throw Error('FIXTURE_PATH_REQUIRED');
  }
  private save(state: SimulationState) {
    validateFixture(state);
    const temp = `${this.path}.${randomUUID()}.tmp`;
    const fd = openSync(temp,'wx');
    try { writeFileSync(fd,JSON.stringify(state)); fsyncSync(fd); } finally { closeSync(fd); }
    renameSync(temp,this.path);
  }
  initialize(state: SimulationState) {
    validateFixture(state); mkdirSync(dirname(this.path),{recursive:true});
    const fd = openSync(this.path,'wx');
    try { writeFileSync(fd,JSON.stringify(state)); fsyncSync(fd); } finally { closeSync(fd); }
  }
  async transaction<T>(work: (state: SimulationState) => T): Promise<T> {
    const lock = `${this.path}.lock`, owner = `${lock}/owner.json`;
    let acquired = false;
    for (let n=0;n<100;n++) {
      try { mkdirSync(lock); acquired=true; break; }
      catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
        // A crash after mkdir but before owner creation fails closed; never steal an unknown lock.
        // A dead owner is not automatically evicted: doing so without OS locks can
        // race a new owner. Preserve the fixture and require manual lock inspection.
        await new Promise(resolve => setTimeout(resolve,10));
      }
    }
    if (!acquired) throw Error('FIXTURE_LOCK_BUSY');
    writeFileSync(owner,JSON.stringify({pid:process.pid}));
    try {
      const state = JSON.parse(readFileSync(this.path,'utf8')) as SimulationState;
      validateFixture(state); const result = work(state); this.save(state); return result;
    } finally { unlinkSync(owner); rmdirSync(lock); }
  }
}
