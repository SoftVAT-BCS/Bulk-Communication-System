import type { RecipientFilter, RecipientStatus, SortKey } from "@bcs/contracts";
export class ReadError extends Error {
  constructor(public readonly status: number, public readonly code: string) { super(code); }
}
export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const sortColumns: Record<SortKey, string> = { id: 'r.target_id', name: 'r.name', email: 'r.email', group: 'r.recipient_group', subgroup: 'r.category', status: 'r.status', joined: 'r.created_at' };
export function filters(params: URLSearchParams): RecipientFilter {
  const keys = ["search", "groups", "subgroups", "status", "sort", "descending", "page", "size"];
  for (const key of params.keys()) if (!keys.includes(key) || params.getAll(key).length !== 1) throw new ReadError(400, "INVALID_FILTER");
  const integer = (key: string, fallback: number, max: number) => { const value = params.get(key); if (value === null) return fallback; if (!/^\d+$/.test(value) || Number(value) > max) throw new ReadError(400, "INVALID_FILTER"); return Number(value); };
  const ids = (key: string) => { const value = params.get(key); const values = value ? value.split(",") : []; if (values.length > 20 || values.some(id => !uuid.test(id)) || new Set(values).size !== values.length) throw new ReadError(400, "INVALID_FILTER"); return values; };
  const search = (params.get("search") ?? "").trim();
  const status = params.get("status") ?? "All statuses";
  const sort = params.get("sort") ?? "name";
  const direction = params.get("descending") ?? "false";
  const size = integer("size", 10, 50);
  if (search.length > 120 || Array.from(search).some(character => character.charCodeAt(0) < 32) || !["Active", "Inactive", "Bounced", "Unsubscribed", "All statuses"].includes(status) || !Object.hasOwn(sortColumns, sort) || !["true", "false"].includes(direction) || ![10,20,50].includes(size)) throw new ReadError(400, "INVALID_FILTER");
  return { search, groups: ids("groups"), subgroups: ids("subgroups"), status: status as RecipientStatus | "All statuses", sort: sort as SortKey, descending: direction === "true", page: integer("page", 0, 100000), size: size as 10 | 20 | 50 };
}
export function localRequest(request: Request, environment: string | undefined) {
  const url = new URL(request.url);
  if (environment !== "development" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || request.headers.has("forwarded") || (request.headers.has("x-forwarded-for") && !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(request.headers.get("x-forwarded-for") ?? "")) || (request.headers.get("origin") && request.headers.get("origin") !== url.origin) || (request.headers.get("sec-fetch-site") && !["same-origin", "none"].includes(request.headers.get("sec-fetch-site") ?? ""))) throw new ReadError(403, "LOCAL_DEMO_ONLY");
}
