import { response } from '../../../../../src/server/app-service';
import { usersCapability, inviteCompanyUser } from '../../../../../src/server/user-onboarding';
export const runtime = 'nodejs';
export const GET = (request: Request) => response(() => usersCapability(request));
export const POST = (request: Request) => response(() => inviteCompanyUser(request));
