import {response} from '../../../../../src/server/app-service';
import {campaignList,campaignWrite} from '../../../../../src/server/campaigns';
export const runtime='nodejs';
export const GET=(r:Request)=>response(()=>campaignList(r));
export const POST=(r:Request)=>response(()=>campaignWrite(r));
