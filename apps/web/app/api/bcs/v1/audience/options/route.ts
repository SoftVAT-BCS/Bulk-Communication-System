import { protectRecipientRead } from "../../../../../../src/server/recipient-access";
import { handleRead } from "../../../../../../src/server/handler";
import { readRepository } from "../../../../../../src/server/runtime";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { return protectRecipientRead(request, () => handleRead(request, "options", readRepository, process.env.NODE_ENV)); }
