import 'server-only';
import { authorized,jsonBody } from './app-service';
import { uuid,ReadError } from './validation';
export function campaignReview(request:Request){return authorized(request,'campaigns.approve',async(c,s)=>{
  if(request.method==='GET')return {campaigns:(await c.query("SELECT id,title,state,revision,subject_snapshot,html_snapshot,created_by,approved_revision FROM bcs.campaigns WHERE company_id=$1 AND portal_id=$2 AND state='review' ORDER BY created_at LIMIT 100",[s.company_id,s.portal_id])).rows,reviewer:s.principal_id};
  const b=await jsonBody(request);if(!uuid.test(String(b.id))||!Number.isSafeInteger(b.revision)||!['approve','reject'].includes(String(b.action))||typeof b.reason!=='string'||b.reason.length>500)throw new ReadError(400,'INVALID_REVIEW');
  return {revision:(await c.query('SELECT bcs.review_campaign($1,$2,$3,$4) revision',[b.id,b.revision,b.action,b.reason])).rows[0].revision,saved:true};
});}
