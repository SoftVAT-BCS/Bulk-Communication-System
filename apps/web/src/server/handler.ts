import { randomUUID } from "node:crypto";
import type { RecipientRepository } from "./repository";
import { filters, localRequest, ReadError, uuid } from "./validation";
export type Reader = <T>(read: (repository: RecipientRepository) => Promise<T>) => Promise<T>;
export async function handleRead(request: Request, kind: "options" | "page" | "detail", read: Reader, environment: string | undefined, id?: string) {
  const requestId = randomUUID();
  const headers = { "Cache-Control": "no-store", "X-Request-ID": requestId, "Vary": "Origin" };
  try {
    localRequest(request, environment);
    const params = new URL(request.url).searchParams;
    if (kind !== "page" && params.size) throw new ReadError(400, "INVALID_FILTER");
    if (kind === "detail" && (!id || !uuid.test(id))) throw new ReadError(400, "INVALID_ID");
    let data: unknown;
    if (kind === "options") data = await read(repository => repository.options());
    else if (kind === "detail") { const recipientId = id ?? ""; data = await read(repository => repository.detail(recipientId)); }
    else { const filter = filters(params); data = await read(repository => repository.page(filter)); }
    return Response.json({ data, requestId, mode: "database" }, { headers });
  } catch (error) {
    const known = error instanceof ReadError;
    return Response.json({ error: { code: known ? error.code : "DATABASE_UNAVAILABLE", message: known && error.status === 400 ? "Check the recipient filters." : "Recipient data is unavailable. Check the server setup or request scope.", requestId } }, { status: known ? error.status : 503, headers });
  }
}
