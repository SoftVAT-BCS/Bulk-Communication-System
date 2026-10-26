import { response,sessionCookie } from '../../../../../src/server/app-service';
import { tenantOverview,tenantWrite } from '../../../../../src/server/tenant-administration';
export const runtime='nodejs';
export async function GET(request:Request){return response(()=>tenantOverview(request));}
export async function POST(request:Request){const r=await response(()=>tenantWrite(request));if(!r.ok)return r;const payload=await r.json();if(typeof payload.data?.token==='string'){return Response.json({data:{switched:true,home:payload.data.home}},{headers:{'Cache-Control':'no-store','Set-Cookie':`${sessionCookie}=${payload.data.token}; HttpOnly; SameSite=Strict; Path=/${new URL(request.url).protocol==='https:'?'; Secure':''}`}});}return Response.json(payload,{headers:{'Cache-Control':'no-store'}});}
