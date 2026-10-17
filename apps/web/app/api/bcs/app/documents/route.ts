import { response } from "../../../../../src/server/app-service";
import {listDocuments,saveDocument} from "../../../../../src/server/documents";
export const runtime="nodejs";
export async function GET(request:Request){return response(()=>listDocuments(request));}
export async function POST(request:Request){return response(()=>saveDocument(request));}
