import "server-only";
import { Pool } from "pg";
import { databaseConfig } from "./config";
import { scopedRead } from "./transaction";
import { RecipientRepository } from "./repository";
let pool: Pool | undefined;
export async function readRepository<T>(read: (repository: RecipientRepository) => Promise<T>) {
  const config = databaseConfig();
  if (!pool) {
    pool = new Pool({ connectionString: config.connectionString, ssl: config.ssl, max: 2, connectionTimeoutMillis: 4000, idleTimeoutMillis: 10000, query_timeout: 6000, application_name: "bcs-local-recipient-read" });
    pool.on("error", () => { /* Pool removes the failed idle client; never log driver errors containing connection data. */ });
  }
  const activePool = pool;
  return scopedRead(() => activePool.connect(), config.scope, client => read(new RecipientRepository(client, config.scope)));
}
