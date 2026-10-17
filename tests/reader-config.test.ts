import { beforeEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { databaseConfig } from "../apps/web/src/server/config";
vi.mock("server-only", () => ({}));
vi.mock("node:fs", () => ({ readFileSync: vi.fn(() => "-----BEGIN CERTIFICATE-----\nmock-only\n-----END CERTIFICATE-----") }));
function env(): NodeJS.ProcessEnv {
  const url = new URL("postgresql://invalid.example/postgres");
  url.username = "bcs_recipient_reader"; url.password = "not-a-real-credential";
  return { NODE_ENV: "development", BCS_DATA_MODE: "database", BCS_RUNTIME_ROLE_VERIFIED: "owner-reviewed-010", BCS_DATABASE_URL: url.toString(), BCS_DATABASE_CA_FILE: "mock-ca.pem", BCS_DEMO_COMPANY_ID: "11111111-1111-1111-1111-111111111111", BCS_DEMO_PORTAL_ID: "22222222-2222-2222-2222-222222222222" };
}
beforeEach(() => { vi.mocked(readFileSync).mockClear(); });
it("loads server config non-interactively and requires verified TLS", () => {
  const config = databaseConfig(env());
  expect(config.ssl.rejectUnauthorized).toBe(true);
  expect(readFileSync).toHaveBeenCalledWith("mock-ca.pem", "utf8");
  expect(config.scope.company).toBe(env().BCS_DEMO_COMPANY_ID);
});
it.each(["postgres", "service_role", "other_reader"])("rejects forbidden runtime username %s before file or network access", username => {
  const settings = env(); const url = new URL(settings.BCS_DATABASE_URL ?? ""); url.username = username; settings.BCS_DATABASE_URL = url.toString();
  expect(() => databaseConfig(settings)).toThrow("DATABASE_NOT_CONFIGURED"); expect(readFileSync).not.toHaveBeenCalled();
});
it.each(["wrong_database", "tls_override", "fragment", "missing_credential"])("rejects malformed private configuration: %s", problem => {
  const settings = env(); const url = new URL(settings.BCS_DATABASE_URL ?? "");
  if (problem === "wrong_database") url.pathname = "/other";
  if (problem === "tls_override") url.search = "sslmode=disable";
  if (problem === "fragment") url.hash = "fragment";
  if (problem === "missing_credential") url.password = "";
  settings.BCS_DATABASE_URL = url.toString();
  expect(() => databaseConfig(settings)).toThrow("DATABASE_NOT_CONFIGURED"); expect(readFileSync).not.toHaveBeenCalled();
});
it("accepts the dedicated pooler role form without loosening TLS", () => {
  const settings = env(); const url = new URL(settings.BCS_DATABASE_URL ?? ""); url.username = "bcs_recipient_reader.syntheticref"; settings.BCS_DATABASE_URL = url.toString();
  expect(databaseConfig(settings).ssl.rejectUnauthorized).toBe(true);
});
it("redacts CA errors and rejects production", () => {
  vi.mocked(readFileSync).mockImplementationOnce(() => { throw new Error("private filesystem detail"); });
  expect(() => databaseConfig(env())).toThrow("DATABASE_NOT_CONFIGURED");
  expect(() => databaseConfig({ ...env(), NODE_ENV: "production" })).toThrow("DATABASE_NOT_CONFIGURED");
});
