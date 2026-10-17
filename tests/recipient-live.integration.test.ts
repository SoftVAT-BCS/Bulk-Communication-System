// Uses the project test environment and actual node-postgres connections.
// Explicit opt-in: BCS_LIVE_TESTS=1. Only the ignored restricted-reader configuration is loaded.
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { databaseConfig } from "../apps/web/src/server/config";
import { scopedRead, requiredTables, type Scope } from "../apps/web/src/server/transaction";
import { RecipientRepository } from "../apps/web/src/server/repository";
import { filters } from "../apps/web/src/server/validation";
vi.mock("server-only", () => ({}));
const live = process.env.BCS_LIVE_TESTS === "1";
describe.skipIf(!live)("actual restricted bcs-dev reader (opt-in)", () => {
  let pool: Pool; let scope: Scope;
  beforeAll(() => {
    const config = databaseConfig({ ...parseEnv(readFileSync("apps/web/.env.local", "utf8")), NODE_ENV: "development" });
    scope = config.scope;
    pool = new Pool({ connectionString: config.connectionString, ssl: config.ssl, max: 1, connectionTimeoutMillis: 10000, query_timeout: 10000 });
    pool.on("error", () => {});
  });
  afterAll(async () => { await pool?.end(); });
  const read = <T,>(fn: (repo: RecipientRepository) => Promise<T>) => scopedRead(() => pool.connect(), scope, client => fn(new RecipientRepository(client, scope)));
  it("uses verified TLS and the actual restricted login", async () => {
    const c = await pool.connect();
    try {
      const result = await c.query("SELECT current_user='bcs_recipient_reader' AS reader");
      expect(result.rows[0].reader).toBe(true);
      const stream = (c as unknown as { connection: { stream: { encrypted: boolean; authorized: boolean } } }).connection.stream;
      expect(stream.encrypted && stream.authorized).toBe(true);
    } finally { c.release(); }
  });
  it("passes the real runtime guard and returns expected counts/options", async () => {
    const page = await read(r => r.page(filters(new URLSearchParams())));
    expect(page.total).toBe(240); expect(page.eligible).toBe(213);
    const options = await read(r => r.options());
    expect(options.groups).toHaveLength(4); expect(options.subgroups).toHaveLength(12);
    const memberships = await scopedRead(() => pool.connect(), scope, c => c.query("SELECT count(*)::int AS n FROM bcs.recipient_group_memberships"));
    expect(memberships.rows[0].n).toBe(240);
  }, 20000);
  it.each([["Active",213],["Inactive",12],["Bounced",7],["Unsubscribed",8]])("filters actual %s records", async (status, count) => {
    expect((await read(r => r.page(filters(new URLSearchParams({ status: String(status) }))))).total).toBe(count);
  });
  it("searches, pages, sorts, filters membership and reads enriched details", async () => {
    const first = await read(r => r.page(filters(new URLSearchParams("size=10&sort=id"))));
    const second = await read(r => r.page(filters(new URLSearchParams("size=10&sort=id&page=1"))));
    expect(new Set([...first.rows,...second.rows].map(r => r.id)).size).toBe(20);
    const found = await read(r => r.page(filters(new URLSearchParams({ search: first.rows[0].targetId ?? "" }))));
    expect(found.rows.some(r => r.id === first.rows[0].id)).toBe(true);
    const detail = await read(r => r.detail(first.rows[0].id));
    expect(detail.targetId).toBeTruthy(); expect(detail.city).toBeTruthy(); expect(detail.mobileNo).toBeTruthy();
    const opts = await read(r => r.options());
    const group = await read(r => r.page(filters(new URLSearchParams({ groups: opts.groups[0].id }))));
    expect(group.total).toBeGreaterThan(0); expect(group.total).toBeLessThan(240);
    expect((await read(r => r.page(filters(new URLSearchParams({ search: "' OR 1=1--" }))))).total).toBe(0);
  }, 20000);
  it("denies missing, empty, malformed and foreign GUC scopes on all six tables", async () => {
    const c = await pool.connect();
    const counts = requiredTables.map(t => `SELECT count(*)::int AS n FROM bcs.${t}`).join(" UNION ALL ");
    try {
      for (const pair of [null, ["", ""], ["invalid", "invalid"], ["00000000-0000-0000-0000-000000000001",scope.portal], [scope.company,"00000000-0000-0000-0000-000000000002"]]) {
        await c.query("BEGIN READ ONLY");
        if (pair) await c.query("SELECT set_config('bcs.company_id',$1,true),set_config('bcs.portal_id',$2,true)", pair);
        expect((await c.query(counts)).rows.every(r => r.n === 0)).toBe(true);
        await c.query("ROLLBACK");
      }
    } finally { await c.query("ROLLBACK"); c.release(); }
  }, 20000);
  it("rejects wrong trusted scope and clears scope on pooled reuse", async () => {
    await expect(scopedRead(() => pool.connect(), { ...scope, portal: "00000000-0000-0000-0000-000000000002" }, async () => true)).rejects.toThrow("INVALID_SCOPE");
    await scopedRead(() => pool.connect(), scope, async c => {
      const r = await c.query("SELECT current_setting('transaction_read_only') AS ro,current_setting('transaction_isolation') AS isolation");
      expect(r.rows[0]).toEqual({ ro: "on", isolation: "repeatable read" });
    });
    expect((await pool.query("SELECT count(*)::int AS n FROM bcs.recipients")).rows[0].n).toBe(0);
  }, 20000);
  it("denies writes, temporary DDL, other BCS reads and definer execution", async () => {
    const c = await pool.connect();
    try {
      await c.query("BEGIN READ WRITE");
      for (const sql of ["CREATE TEMP TABLE bcs_denied_probe(id integer)", "EXPLAIN UPDATE bcs.recipients SET name=name WHERE false", "SELECT 1 FROM bcs.schema_migrations LIMIT 0", "SELECT public.rls_auto_enable()"] ) {
        await c.query("SAVEPOINT deny_probe"); let code = "unexpected_success";
        try { await c.query(sql); } catch (e) { code = (e as { code: string }).code; }
        await c.query("ROLLBACK TO SAVEPOINT deny_probe");
        expect(code).toBe("42501");
      }
    } finally { await c.query("ROLLBACK"); c.release(); }
  }, 20000);
  it("monitoring view ACL does not grant schema access to the reader", async () => {
    expect((await pool.query("SELECT has_schema_privilege(current_user,'extensions','USAGE') AS usage")).rows[0].usage).toBe(false);
    for (const view of ["pg_stat_statements", "pg_stat_statements_info"]) {
      let code = "unexpected_success";
      try { await pool.query(`SELECT count(*) FROM extensions.${view}`); } catch (e) { code = (e as { code: string }).code; }
      expect(code).toBe("42501");
    }
  });
});
