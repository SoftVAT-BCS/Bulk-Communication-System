import {response} from '../../../../../src/server/app-service';
import {configuration,configurationWrite} from '../../../../../src/server/configuration-service';
export const runtime='nodejs';
export const GET=(r:Request)=>response(()=>configuration(r));
export const POST=(r:Request)=>response(()=>configurationWrite(r));
