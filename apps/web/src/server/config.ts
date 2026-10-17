import "server-only";
import { readFileSync } from "node:fs";
import { ReadError, uuid } from "./validation";
export function databaseConfig(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV !== "development" || env.BCS_DATA_MODE !== "database" || env.BCS_RUNTIME_ROLE_VERIFIED !== "owner-reviewed-010") throw new ReadError(503, "DATABASE_NOT_CONFIGURED");
  try {
    const url = new URL(env.BCS_DATABASE_URL ?? "");
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !/^bcs_recipient_reader(?:\.[a-z0-9]+)?$/.test(decodeURIComponent(url.username)) || !url.password || url.pathname !== "/postgres" || url.hash || url.search || !env.BCS_DATABASE_CA_FILE || !uuid.test(env.BCS_DEMO_COMPANY_ID ?? "") || !uuid.test(env.BCS_DEMO_PORTAL_ID ?? "")) throw new Error();
    const ca = readFileSync(env.BCS_DATABASE_CA_FILE, "utf8");
    if (!ca.includes("-----BEGIN CERTIFICATE-----")) throw new Error();
    return { connectionString: url.toString(), ssl: { ca, rejectUnauthorized: true as const }, scope: { company: env.BCS_DEMO_COMPANY_ID ?? "", portal: env.BCS_DEMO_PORTAL_ID ?? "" } };
  } catch { throw new ReadError(503, "DATABASE_NOT_CONFIGURED"); }
}
