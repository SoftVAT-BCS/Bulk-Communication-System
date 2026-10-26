import {response} from '../../../../../src/server/app-service';
import {csvImport} from '../../../../../src/server/csv-import';
export const runtime='nodejs';
export async function GET(request:Request){return response(()=>csvImport(request));}
export async function POST(request:Request){return response(()=>csvImport(request));}
