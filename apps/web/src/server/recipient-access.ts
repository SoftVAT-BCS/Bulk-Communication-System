import { authorized, response } from "./app-service";
import { ReadError } from "./validation";
export async function protectRecipientRead(request:Request,read:()=>Promise<Response>):Promise<Response>{
 if(process.env.BCS_APPLICATION_MODE!=="authenticated")return read();
 let result:Response|undefined;
 const gate=await response(()=>authorized(request,"recipients.view",async(_c,s)=>{
 if(s.company_id!==process.env.BCS_DEMO_COMPANY_ID || s.portal_id!==process.env.BCS_DEMO_PORTAL_ID)throw new ReadError(403,"READER_SCOPE_UNAVAILABLE");
 result=await read();return null;
 }));return result??gate;
}
