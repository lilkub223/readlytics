// Disposable embedded PostgreSQL, only for development/QA. Never used by production.
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
const db = await PGlite.create({ extensions: { pgcrypto } });
const server = new PGLiteSocketServer({
  db,
  port: 55432,
  host: "127.0.0.1",
  maxConnections: 20,
});
await server.start();
console.log(
  "Isolated QA PostgreSQL ready on 127.0.0.1:55432; no production connections.",
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    await server.stop();
    await db.close();
    process.exit(0);
  });
