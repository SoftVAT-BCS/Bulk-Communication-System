import {response} from '../../../../../src/server/app-service';
import {dashboard} from '../../../../../src/server/dashboard';
export const runtime='nodejs';
export async function GET(request:Request){return response(()=>dashboard(request));}
