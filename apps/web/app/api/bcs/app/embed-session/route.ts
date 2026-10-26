import { response } from '../../../../../src/server/app-service';
import { embeddedData } from '../../../../../src/server/embedding';
export const runtime='nodejs';
export async function POST(request:Request){return response(()=>embeddedData(request));}
export async function DELETE(request:Request){return response(()=>embeddedData(request));}
