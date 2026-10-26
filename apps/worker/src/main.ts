import { resolve } from 'node:path';
import { FixtureStore } from './fixture-store.ts';
import { syntheticFixture } from './fixture.ts';
import { controlCampaign, tick } from './simulation-engine.ts';

const [command, name = 'increment1', company, portal, campaign] = process.argv.slice(2);
if (!/^[a-zA-Z0-9_-]+$/.test(name)) throw Error('INVALID_FIXTURE_NAME');
if (!['init','once','run','status','pause','resume','cancel'].includes(command)) throw Error('Usage: main.ts init|once|run|status|pause|resume|cancel [fixture-name] [company portal campaign]. Synthetic fixtures only; PostgreSQL integration BLOCKED pending isolated acceptance.');
const store = new FixtureStore(resolve('.local','saas-simulation',`${name}.json`));
if (command === 'init') { store.initialize(syntheticFixture()); console.log('Created synthetic fixture. No database or email connection.'); }
else if (['pause','resume','cancel'].includes(command)) {
  if (!company || !portal || !campaign) throw Error('EXPLICIT_SYNTHETIC_SCOPE_REQUIRED');
  await store.transaction(s => controlCampaign(s,company,portal,campaign,command as 'pause'|'resume'|'cancel'));
  console.log('Synthetic fixture control recorded.');
} else if (command === 'status') {
  console.log(await store.transaction(s => ({mode:'simulation',jobs:s.dispatch_jobs.length,simulated:s.receipts.length,states:s.dispatch_jobs.reduce<Record<string,number>>((a,j)=>{a[j.state]=(a[j.state]??0)+1;return a;},{})})));
} else {
  let running = true;
  process.on('SIGINT',()=>{running=false;}); process.on('SIGTERM',()=>{running=false;});
  do {
    console.log(await tick(store));
    if (command === 'once') break;
    await new Promise(resolve => setTimeout(resolve,1000));
  } while (running);
}
