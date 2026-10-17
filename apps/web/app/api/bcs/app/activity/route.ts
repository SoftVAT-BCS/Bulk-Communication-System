import {response} from '../../../../../src/server/app-service';
import {activityGet,activityWrite} from '../../../../../src/server/activity';
export const runtime='nodejs';
export async function GET(r:Request){return activityGet(r);}
export async function POST(r:Request){return response(()=>activityWrite(r));}
