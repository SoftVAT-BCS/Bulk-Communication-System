import { response } from '../../../../../src/server/app-service';
import { connectorAction } from '../../../../../src/server/connector-service';
export const runtime='nodejs';
export async function POST(request:Request){return response(()=>connectorAction(request));}
