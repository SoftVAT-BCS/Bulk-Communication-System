import 'server-only';
import { authorized } from './app-service';
import { ReadError } from './validation';
export function dashboardDays(params:URLSearchParams){if([...params.keys()].some(k=>k!=='days')||params.getAll('days').length>1)throw new ReadError(400,'INVALID_FILTER');const days=Number(params.get('days')??30);if(![7,30,90].includes(days))throw new ReadError(400,'INVALID_FILTER');return days;}
export async function dashboard(request:Request){const days=dashboardDays(new URL(request.url).searchParams);return authorized(request,'dashboard.view',async(c,s)=>{
 const result=await c.query(`SELECT jsonb_build_object(
 'scope',(SELECT jsonb_build_object('company',co.company_name,'portal',p.portal_name,'portalStatus',p.status) FROM bcs.companies co JOIN bcs.portals p ON p.company_id=co.id WHERE co.id=$1 AND p.id=$2),
 'recipients',(SELECT coalesce(jsonb_object_agg(status,n),'{}'::jsonb) FROM (SELECT status,count(id)::int n FROM bcs.recipients WHERE company_id=$1 AND portal_id=$2 GROUP BY status) r),
 'campaigns',(SELECT coalesce(jsonb_object_agg(state,n),'{}'::jsonb) FROM (SELECT state,count(id)::int n FROM bcs.campaigns WHERE company_id=$1 AND portal_id=$2 GROUP BY state) r),
 'messages',(SELECT coalesce(jsonb_object_agg(delivery_state,n),'{}'::jsonb) FROM (SELECT delivery_state,count(id)::int n FROM bcs.outbound_messages WHERE company_id=$1 AND portal_id=$2 GROUP BY delivery_state) r),
 'events',(SELECT coalesce(jsonb_object_agg(event_type,n),'{}'::jsonb) FROM (SELECT e.event_type,count(DISTINCT e.message_id)::int n FROM bcs.provider_events e JOIN bcs.outbound_messages m ON m.company_id=e.company_id AND m.id=e.message_id WHERE m.company_id=$1 AND m.portal_id=$2 AND e.signature_verified AND e.occurred_at>=now()-($3::int*interval '1 day') GROUP BY e.event_type) r),
 'drafts',(SELECT count(*)::int FROM bcs.email_drafts WHERE company_id=$1 AND portal_id=$2 AND owner_principal_id=$4 AND state='draft'),
 'suppressions',(SELECT count(id)::int FROM bcs.email_suppressions WHERE company_id=$1 AND is_active),
 'companyPolicyVisible',bcs.session_allows($1,NULL,'dashboard.view'),
 'providers',(SELECT coalesce(jsonb_agg(x),'[]'::jsonb) FROM (SELECT account_code,provider,aws_region,account_status,verified_max_send_rate,verified_max_24h,checked_at FROM bcs.provider_accounts WHERE company_id=$1 ORDER BY account_code LIMIT 20) x),
 'policies',(SELECT coalesce(jsonb_agg(x),'[]'::jsonb) FROM (SELECT policy_name,configured_rate_per_second,configured_daily_budget,is_enabled FROM bcs.sending_policies WHERE company_id=$1 AND (portal_id=$2 OR portal_id IS NULL) ORDER BY policy_name LIMIT 20) x),
 'recent',(SELECT coalesce(jsonb_agg(x),'[]'::jsonb) FROM (SELECT id,title,campaign_type,state,created_at FROM bcs.campaigns WHERE company_id=$1 AND portal_id=$2 ORDER BY created_at DESC LIMIT 10) x),
 'activity',(SELECT coalesce(jsonb_agg(x),'[]'::jsonb) FROM (SELECT id,action,entity_type,occurred_at FROM bcs.audit_events WHERE company_id=$1 AND portal_id=$2 ORDER BY occurred_at DESC LIMIT 10) x),
 'upcoming',(SELECT coalesce(jsonb_agg(x),'[]'::jsonb) FROM (SELECT DISTINCT ON(source_event_key) source_event_key,class_title,start_at,timezone,state FROM bcs.class_events WHERE company_id=$1 AND portal_id=$2 ORDER BY source_event_key,source_revision DESC) x WHERE start_at>=now() AND state<>'cancelled'),
 'trend',(SELECT jsonb_agg(jsonb_build_object('date',d.day::date,'delivered',(SELECT count(DISTINCT e.message_id)::int FROM bcs.provider_events e JOIN bcs.outbound_messages m ON m.company_id=e.company_id AND m.id=e.message_id WHERE m.company_id=$1 AND m.portal_id=$2 AND e.signature_verified AND e.event_type='delivery' AND e.occurred_at>=(d.day AT TIME ZONE 'UTC') AND e.occurred_at<((d.day+interval '1 day') AT TIME ZONE 'UTC')))) FROM generate_series(date_trunc('day',now() AT TIME ZONE 'UTC')-($3::int-1)*interval '1 day',date_trunc('day',now() AT TIME ZONE 'UTC'),interval '1 day') d(day)),
 'days',$3::int,'updatedAt',now()) AS dashboard`,[s.company_id,s.portal_id,days,s.principal_id]);return result.rows[0].dashboard;
 });}
