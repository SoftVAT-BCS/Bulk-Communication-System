import {response} from '../../../../../src/server/app-service';
import {dashboard} from '../../../../../src/server/dashboard';
export const runtime='nodejs';
export async function GET(r:Request){return response(()=>dashboard(r,'reports.view'));}
