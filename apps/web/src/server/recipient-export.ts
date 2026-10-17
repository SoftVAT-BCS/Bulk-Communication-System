import 'server-only';
import type {Recipient} from '@bcs/contracts';
import { authorized,response } from './app-service';
import {readRepository} from './runtime';
import {filters,ReadError} from './validation';
import {recipientCsv} from '../recipient-csv';
export async function exportRecipients(request:Request){let csv:string|undefined;const gate=await response(()=>authorized(request,'recipients.export',async(_c,s)=>{if(s.company_id!==process.env.BCS_DEMO_COMPANY_ID||s.portal_id!==process.env.BCS_DEMO_PORTAL_ID)throw new ReadError(403,'READER_SCOPE_UNAVAILABLE');const filter=filters(new URL(request.url).searchParams);csv=await readRepository(async repo=>{const first=await repo.page({...filter,page:0,size:50});if(first.total>1000)throw new ReadError(422,'EXPORT_LIMIT_1000');const rows:Recipient[]=[...first.rows];for(let page=1;page<Math.ceil(first.total/50);page++){rows.push(...(await repo.page({...filter,page,size:50})).rows);}return recipientCsv(rows);});return null;}));return csv===undefined?gate:new Response(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="BCS_Recipients.csv"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
