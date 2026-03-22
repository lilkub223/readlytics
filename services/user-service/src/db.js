import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { config } from "./config.js";

const { Pool } = pg;
const schemaPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../infra/docker/init.sql"
);

const connectionConfig = config.databaseUrl
  ? { connectionString: config.databaseUrl }
  : {
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
    };

export const pool = new Pool(connectionConfig);
let schemaInitialization;

export function query(text, params) {
  return pool.query(text, params);
}

export async function ensureDatabaseSchema() {
  if (!schemaInitialization) {
    schemaInitialization = (async () => {
      const schemaSql = await readFile(schemaPath, "utf8");
      await query(schemaSql);
    })().catch((error) => {
      schemaInitialization = undefined;
      throw error;
    });
  }

  return schemaInitialization;
}

export async function getDatabaseHealth() {
  const startedAt = Date.now();

  try {
    await query("SELECT 1");

    return {
      status: "ok",
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      status: "error",
      latencyMs: Date.now() - startedAt,
      message: error.message,
    };
  }
}
