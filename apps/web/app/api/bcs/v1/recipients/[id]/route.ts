import { handleRead } from "../../../../../../src/server/handler";
import { readRepository } from "../../../../../../src/server/runtime";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) { return handleRead(request, "detail", readRepository, process.env.NODE_ENV, (await context.params).id); }
