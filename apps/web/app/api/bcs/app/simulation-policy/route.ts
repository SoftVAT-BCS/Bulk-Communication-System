import { response } from '../../../../../src/server/app-service';
import { saveSimulationPolicy } from '../../../../../src/server/simulation-policy';
export const runtime = 'nodejs';
export async function POST(request: Request) { return response(() => saveSimulationPolicy(request)); }
