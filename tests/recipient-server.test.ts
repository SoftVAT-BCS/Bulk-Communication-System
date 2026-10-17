import { describe, expect, it, vi } from "vitest";
import { filters, localRequest } from "../apps/web/src/server/validation";
import { handleRead, type Reader } from "../apps/web/src/server/handler";
import { RecipientRepository } from "../apps/web/src/server/repository";
import { scopedRead, type Connection } from "../apps/web/src/server/transaction";
import { databaseConfig } from "../apps/web/src/server/config";
vi.mock("server-only", () => ({}));
const company = "11111111-1111-1111-1111-111111111111";
const portal = "22222222-2222-2222-2222-222222222222";
const scope = { company, portal };
function driver(answer: (sql: string, values?: unknown[]) => unknown[] = () => []) {
  const query = vi.fn(async (sql: string, values?: unknown[]) => ({ rows: answer(sql, values) }));
  const release = vi.fn();
  return { query, release, connection: { query, release } as unknown as Connection };
}
describe("read contract validation", () => {
  it("accepts empty filters and 10/20/50 bounded paging", () => {
    expect(filters(new URLSearchParams()).search).toBe("");
    for (const size of [10,20,50]) expect(filters(new URLSearchParams(`size=${size}&page=2`))).toMatchObject({ size, page: 2 });
  });
  it.each(["sort=name;DROP TABLE bcs.recipients", "sort=__proto__", "company_id=x", "portal_id=x", "size=11", "page=-1", "page=100001", "search=a&search=b", "descending=yes", "status=active", "groups=x", "search=" + "a".repeat(121)])("rejects unsafe or ambiguous params: %s", value => {
    expect(() => filters(new URLSearchParams(value))).toThrow();
  });
  it("keeps a SQL injection string as data and rejects production / cross-origin", () => {
    expect(filters(new URLSearchParams({ search: "' OR 1=1--" })).search).toBe("' OR 1=1--");
    expect(() => localRequest(new Request("http://127.0.0.1:3000/"), "production")).toThrow();
    expect(() => localRequest(new Request("http://127.0.0.1:3000/", { headers: { origin: "https://evil.example" } }), "development")).toThrow();
    expect(() => localRequest(new Request("http://external.example/"), "development")).toThrow();
    expect(() => localRequest(new Request("http://127.0.0.1:3000/", { headers: { "x-forwarded-for": "127.0.0.1" } }), "development")).not.toThrow();
    expect(() => localRequest(new Request("http://127.0.0.1:3000/", { headers: { "x-forwarded-for": "203.0.113.1" } }), "development")).toThrow();
  });
  it("fails configuration before any connection without approved identity/TLS", () => {
    expect(() => databaseConfig({ NODE_ENV: "development", BCS_DATA_MODE: "database" })).toThrow();
    expect(() => databaseConfig({ NODE_ENV: "development", BCS_DATA_MODE: "database", BCS_RUNTIME_ROLE_VERIFIED: "owner-reviewed-010", BCS_DATABASE_URL: "postgresql://postgres:fake@invalid.example/db" })).toThrow();
    expect(() => databaseConfig({ NODE_ENV: "production" })).toThrow();
  });
});
describe("isolated repository adapter (not PostgreSQL execution)", () => {
  it.each([10,20,50])("parameterizes searches and stable nonduplicate page offsets at size %s", async size => {
    const db = driver(sql => sql.includes("count(*)") ? [{ total: 240, eligible: 213 }] : []);
    const repository = new RecipientRepository(db.connection, scope);
    for (const page of [0,1]) {
      const result = await repository.page(filters(new URLSearchParams({ search: "' OR 1=1--", size: String(size), page: String(page), sort: "name" })));
      expect(result.meta).toMatchObject({ total: 240, eligible: 213, page });
    }
    const selects = db.query.mock.calls.filter(([sql]) => sql.includes("LIMIT $7"));
    expect(selects.map(([,v]) => v?.[7])).toEqual([0,size]);
    for (const [sql, values] of selects) {
      expect(sql).not.toContain("' OR 1=1--"); expect(sql).toContain("ORDER BY r.name ASC, r.id ASC");
      expect(sql).toContain("r.target_id"); expect(sql).toContain("r.email"); expect(sql).toContain("r.recipient_group");
      expect(values?.slice(0,4)).toEqual([company,portal,null,"' OR 1=1--"]);
    }
  });
  it("checks stored group/subgroup relationship and rejects foreign scope IDs", async () => {
    const db = driver(sql => sql.includes("SELECT id::text") ? [{ id: company, name: "Group" }] : [{ id: portal, groupId: company, name: "Subgroup" }]);
    const repository = new RecipientRepository(db.connection, scope);
    await expect(repository.page(filters(new URLSearchParams({ groups: portal, subgroups: portal })))).rejects.toThrow("INVALID_FILTER");
    expect(db.query.mock.calls.every(([sql]) => !sql.includes("FROM bcs.recipients"))).toBe(true);
  });
  it("clamps empty and out-of-range pages, filters status, and keeps details scoped", async () => {
    const db = driver(sql => sql.includes("count(*)") ? [{ total: 0, eligible: 0 }] : []);
    const repository = new RecipientRepository(db.connection, scope);
    const result = await repository.page(filters(new URLSearchParams("page=5&status=Bounced")));
    expect(result.meta.page).toBe(0); expect(result.rows).toEqual([]);
    expect(db.query.mock.calls[0][1]?.[2]).toBe("Bounced");
    await expect(repository.detail(company)).rejects.toThrow("RECIPIENT_NOT_FOUND");
    expect(db.query.mock.calls.at(-1)?.[1]).toEqual([company,portal,company]);
    expect(db.query.mock.calls.at(-1)?.[0]).not.toContain("SELECT *");
  });
});
describe("transaction lifecycle, mocked driver only", () => {
  it("rolls back and resets trusted scope on reused connections", async () => {
    const db = driver(sql => sql.includes("AS safe") ? [{ safe: true }] : sql.includes("SELECT c.id") ? [{ id: company }] : []);
    const connect = vi.fn(async () => db.connection);
    const read = vi.fn(async () => "ok");
    await scopedRead(connect, scope, read);
    await scopedRead(connect, { company: portal, portal: company }, read);
    const settings = db.query.mock.calls.filter(([sql]) => sql.includes("set_config"));
    expect(settings.map(([,values]) => values)).toEqual([[company,portal],[portal,company]]);
    expect(db.query.mock.calls.filter(([sql]) => sql === "ROLLBACK")).toHaveLength(2);
    expect(db.release).toHaveBeenCalledTimes(2);
    expect(db.query.mock.calls[0][0]).toContain("READ ONLY");
  });
  it("denies unsafe roles or missing scope before application reads", async () => {
    const db = driver(() => [{ safe: false }]); const read = vi.fn();
    await expect(scopedRead(async () => db.connection, scope, read)).rejects.toThrow("UNSAFE_RUNTIME_ROLE");
    expect(read).not.toHaveBeenCalled(); expect(db.release).toHaveBeenCalledWith(false);
    await expect(scopedRead(async () => db.connection, { company: "", portal }, read)).rejects.toThrow("INVALID_SCOPE");
  });
  it("releases after query failure and discards if rollback fails", async () => {
    const db = driver(sql => { if (sql === "ROLLBACK") throw new Error("failed"); return sql.includes("AS safe") ? [{ safe: true }] : [{ id: company }]; });
    await expect(scopedRead(async () => db.connection, scope, async () => { throw new Error("query failed"); })).rejects.toThrow("query failed");
    expect(db.release).toHaveBeenCalledWith(true);
  });
});
describe("HTTP boundary", () => {
  it("rejects arbitrary scope parameters without calling repository", async () => {
    const reader = vi.fn() as unknown as Reader;
    const response = await handleRead(new Request("http://127.0.0.1:3000/api?company_id=evil"), "page", reader, "development");
    expect(response.status).toBe(400); expect(reader).not.toHaveBeenCalled();
  });
  it("redacts SQL/connection failures and issues no-store request IDs", async () => {
    const reader: Reader = async () => { throw new Error("postgres://SECRET SQL text"); };
    const response = await handleRead(new Request("http://127.0.0.1:3000/api"), "page", reader, "development");
    expect(response.status).toBe(503); expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).not.toContain("SECRET"); expect(response.headers.get("x-request-id")).toBeTruthy();
  });
  it("returns only explicit repository DTO and blocks production", async () => {
    const db = driver(() => []); const repository = new RecipientRepository(db.connection, scope);
    const reader: Reader = callback => callback(repository);
    const response = await handleRead(new Request("http://localhost:3000/api"), "options", reader, "development");
    expect(await response.json()).toMatchObject({ mode: "database", data: { groups: [], subgroups: [] } });
    expect((await handleRead(new Request("http://localhost:3000/api"), "options", reader, "production")).status).toBe(403);
  });
});
