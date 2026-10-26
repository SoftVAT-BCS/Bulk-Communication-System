import {response} from '../../../../../src/server/app-service';
import {selections,selectionPage} from '../../../../../src/server/campaigns';
export const runtime='nodejs';
export const POST=(r:Request)=>response(()=>selections(r));

export const GET=(r:Request)=>response(()=>selectionPage(r));
