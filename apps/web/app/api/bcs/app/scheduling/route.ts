import {response} from '../../../../../src/server/app-service';
import {listSchedule,saveSchedule} from '../../../../../src/server/scheduling';
export const runtime='nodejs';
export async function GET(r:Request){return response(()=>listSchedule(r));}
export async function POST(r:Request){return response(()=>saveSchedule(r));}
