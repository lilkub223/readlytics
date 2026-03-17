export const config = {
  port: Number.parseInt(process.env.PORT ?? "4001", 10),
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  jwtExpiresInSeconds: Number.parseInt(process.env.JWT_EXPIRES_IN_SECONDS ?? "604800", 10),
  databaseUrl: process.env.DATABASE_URL,
  db: {
    host: process.env.PGHOST ?? "localhost",
    port: Number.parseInt(process.env.PGPORT ?? "5432", 10),
    user: process.env.PGUSER ?? "postgres",
    password: process.env.PGPASSWORD ?? "postgres",
    database: process.env.PGDATABASE ?? "book_platform",
  },
};

