import pg from "pg";

import { config } from "./config.js";

const { Pool } = pg;

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

export function query(text, params) {
  return pool.query(text, params);
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

