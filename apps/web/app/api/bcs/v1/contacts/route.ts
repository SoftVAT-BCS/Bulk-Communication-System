import {response} from '../../../../../src/server/app-service';
import {contactsApi} from '../../../../../src/server/contacts-api';
export const runtime='nodejs';
export const GET=(r:Request)=>response(()=>contactsApi(r));
export const POST=(r:Request)=>response(()=>contactsApi(r));
