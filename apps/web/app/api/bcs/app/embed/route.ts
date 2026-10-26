import { response } from '../../../../../src/server/app-service';
import { embedExchange } from '../../../../../src/server/embedding';
export const runtime='nodejs';
export async function POST(request:Request){return response(()=>embedExchange(request));}
