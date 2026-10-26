import { response } from '../../../../../src/server/app-service';
import { campaignReview } from '../../../../../src/server/campaign-review';
export const runtime='nodejs';
export async function GET(request:Request){return response(()=>campaignReview(request));}
export async function POST(request:Request){return response(()=>campaignReview(request));}
