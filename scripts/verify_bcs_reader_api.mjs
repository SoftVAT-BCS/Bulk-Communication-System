// Local read-only API acceptance; no credentials loaded or printed.
import assert from 'node:assert/strict';
const base='http://127.0.0.1:3000/api/bcs/v1';let passed=0;
async function get(path,status=200,headers){const r=await fetch(base+path,{headers});assert.equal(r.status,status);assert.equal(r.headers.get('cache-control'),'no-store');const j=await r.json();if(status===200)assert.equal(j.mode,'database');passed++;return j.data;}
try {
 const opts=await get('/audience/options');assert.equal(opts.groups.length,4);assert.equal(opts.subgroups.length,12);
 const first=await get('/recipients?sort=id');assert.equal(first.total,240);assert.equal(first.eligible,213);
 const page2=await get('/recipients?sort=id&page=1');assert.equal(new Set([...first.rows,...page2.rows].map(r=>r.id)).size,20);
 for(const [status,n] of [['Active',213],['Inactive',12],['Bounced',7],['Unsubscribed',8]])assert.equal((await get('/recipients?status='+status)).total,n);
 for(const sort of ['id','name','email','group','subgroup','status','joined'])for(const descending of ['false','true'])assert.equal((await get(`/recipients?sort=${sort}&descending=${descending}`)).rows.length,10);
 for(const size of [10,20,50])assert.equal((await get('/recipients?size='+size)).rows.length,size);
 const detail=await get('/recipients/'+first.rows[0].id);assert.ok(detail.targetId&&detail.city&&detail.mobileNo);
 const search=await get('/recipients?search='+encodeURIComponent(detail.targetId));assert.ok(search.rows.some(r=>r.id===detail.id));
 const group=await get('/recipients?groups='+opts.groups[0].id);assert.ok(group.total>0&&group.total<240);
 const sub=opts.subgroups.find(s=>s.groupId===opts.groups[0].id);const subset=await get('/recipients?groups='+opts.groups[0].id+'&subgroups='+sub.id);assert.ok(subset.total>0&&subset.total<=group.total);
 assert.equal((await get('/recipients?search='+encodeURIComponent("' OR 1=1--"))).total,0);
 for(const q of ['company_id=','company_id=bad','portal_id=00000000-0000-0000-0000-000000000001','size=11','status=active','groups=00000000-0000-0000-0000-000000000001','search=a&search=b'])await get('/recipients?'+q,400);
 await get('/recipients/00000000-0000-0000-0000-000000000001',404);
 await get('/recipients/not-a-uuid',400);
 await get('/recipients',403,{origin:'https://untrusted.example'});
 assert.equal((await fetch(base+'/recipients',{method:'POST'})).status,405);passed++;
 console.log(JSON.stringify({liveApiChecksPassed:passed,source:'restricted PostgreSQL reader',total:240,eligible:213}));
} catch { console.log(JSON.stringify({success:false,checksCompleted:passed}));process.exitCode=1;}
