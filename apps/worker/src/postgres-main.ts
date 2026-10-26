import { PostgresSimulationStore } from './postgres-store.ts';
import { tick } from './simulation-engine.ts';
if(process.env.BCS_ISOLATED_ACCEPTANCE!=='I_CONFIRM_DISPOSABLE_LOCAL_DATABASE')throw Error('EXPLICIT_ISOLATED_ACCEPTANCE_REQUIRED');
const store=new PostgresSimulationStore(process.env.BCS_ISOLATED_WORKER_URL??'',process.env.BCS_SIMULATION_COMPANY??'');
let running=true;process.on('SIGINT',()=>{running=false;});process.on('SIGTERM',()=>{running=false;});
try{do{console.log(await tick(store));if(process.argv.includes('--once'))break;await new Promise(r=>setTimeout(r,1000));}while(running);}finally{await store.close();}
