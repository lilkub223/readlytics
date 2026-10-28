import { createApp } from "./app.js";
import { config } from "./config.js";
import { ensureDatabaseSchema } from "./db.js";
if (
  process.env.NODE_ENV === "production" &&
  (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
)
  throw new Error(
    "A persistent JWT_SECRET of at least 32 characters is required.",
  );
ensureDatabaseSchema()
  .then(() => {
    createApp().listen(config.port, () =>
      console.log(`user-service listening on port ${config.port}`),
    );
  })
  .catch(() => {
    console.error(
      "Unable to initialize user-service database. Check database connectivity and schema access.",
    );
    process.exit(1);
  });
