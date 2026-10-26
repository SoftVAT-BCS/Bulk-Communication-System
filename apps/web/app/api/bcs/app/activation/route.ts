import { response } from '../../../../../src/server/app-service';
import { activateInvitedUser } from '../../../../../src/server/invitation-activation';

export const runtime = 'nodejs';
export const POST = (request: Request) => response(() => activateInvitedUser(request));
