import {exportRecipients} from '../../../../../../src/server/recipient-export';
export const runtime='nodejs';
export async function GET(request:Request){return exportRecipients(request);}
