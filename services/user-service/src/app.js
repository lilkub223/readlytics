import express from "express";

import { createRequireAuth } from "./auth-middleware.js";
import { config } from "./config.js";
import { ensureDatabaseSchema, getDatabaseHealth } from "./db.js";
import { hashPassword, signToken, verifyPassword } from "./security.js";
import * as defaultRepository from "./user-repository.js";

export function createApp({
  repository = defaultRepository,
  databaseHealth = getDatabaseHealth,
} = {}) {
  const {
    createFollow,
    createUser,
    deleteFollow,
    findUserByEmail,
    findUserByUsername,
    listFollowing,
    mapUser,
    updateUserProfile,
  } = repository;
  const requireAuth = createRequireAuth(repository.findUserById);
  const app = express();
  const dummyPasswordHash = hashPassword("dummy-account-timing-only");

  app.use((req, res, next) => {
    const requestOrigin = req.headers.origin;
    const allowAllOrigins = config.corsOrigins.includes("*");
    const allowedOrigin = allowAllOrigins
      ? "*"
      : config.corsOrigins.includes(requestOrigin)
        ? requestOrigin
        : null;

    if (allowedOrigin) {
      res.header("Access-Control-Allow-Origin", allowedOrigin);
    }

    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, DELETE, OPTIONS",
    );
    res.header("Vary", "Origin");

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    return next();
  });

  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb" }));
  app.use((_req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Cache-Control", "no-store");
    next();
  });
  // Per-account/address rate limits avoid grouping all readers behind one hosting proxy.
  // This is a process-local guard; multi-instance deployments need a shared limiter.
  const attempts = new Map();
  app.use("/api/auth", (req, res, next) => {
    if (req.method !== "POST") return next();
    const now = Date.now(),
      ip = `${req.socket.remoteAddress}:${String(req.body?.email ?? "")
        .trim()
        .toLowerCase()}`;
    for (const [key, value] of attempts)
      if (value.until <= now) attempts.delete(key);
    const bucket = attempts.get(ip) ?? { count: 0, until: now + 60000 };
    bucket.count++;
    attempts.set(ip, bucket);
    if (bucket.count > 30) {
      res.set("Retry-After", "60");
      return res
        .status(429)
        .json({ error: "Too many sign-in attempts. Please wait a minute." });
    }
    next();
  });

  function buildAuthResponse(user) {
    return {
      user,
      token: signToken(
        {
          sub: user.id,
          username: user.username,
        },
        config.jwtSecret,
        config.jwtExpiresInSeconds,
      ),
    };
  }

  function validateRegisterInput({
    email,
    username,
    password,
    displayName,
  } = {}) {
    if (
      ![email, username, password, displayName].every(
        (v) => typeof v === "string" && v.trim(),
      )
    )
      return "Email, username, password, and display name are required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 254)
      return "Enter a valid email address.";
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username.trim()))
      return "Username must be 3–30 letters, numbers, or underscores.";
    if (password.length < 8 || password.length > 256)
      return "Password must be between 8 and 256 characters.";
    if (displayName.trim().length > 100) return "Display name is too long.";
    return null;
  }
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  app.param("userId", (req, res, next, value) =>
    uuid.test(value)
      ? next()
      : res.status(400).json({ error: "Invalid reader identifier." }),
  );

  app.get("/health", async (_req, res) => {
    const database = await databaseHealth();
    const statusCode = database.status === "ok" ? 200 : 503;

    res.status(statusCode).json({
      service: "user-service",
      status: database.status === "ok" ? "ok" : "degraded",
      database,
    });
  });

  app.post("/api/auth/register", async (req, res) => {
    const validationError = validateRegisterInput(req.body);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const { email, username, password, displayName } = req.body;

    try {
      const existingUser = await findUserByEmail(email.trim().toLowerCase());

      if (existingUser) {
        return res
          .status(409)
          .json({ error: "An account with that email already exists." });
      }

      const user = await createUser({
        email: email.trim().toLowerCase(),
        username: username.trim().toLowerCase(),
        passwordHash: hashPassword(password),
        displayName: displayName.trim(),
      });

      return res.status(201).json(buildAuthResponse(user));
    } catch (error) {
      if (error.code === "23505") {
        return res
          .status(409)
          .json({ error: "Email or username already exists." });
      }

      return res
        .status(503)
        .json({
          error:
            "The account service is temporarily unavailable. Please try again.",
        });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password ||
      email.length > 254 ||
      password.length > 256
    ) {
      return res
        .status(400)
        .json({ error: "email and password are required." });
    }

    try {
      const userRow = await findUserByEmail(email.trim().toLowerCase());

      const passwordMatches = verifyPassword(
        password,
        userRow?.password_hash ?? dummyPasswordHash,
      );
      if (!userRow || !passwordMatches) {
        return res.status(401).json({ error: "Invalid email or password." });
      }

      return res.json(buildAuthResponse(mapUser(userRow)));
    } catch (_error) {
      return res
        .status(503)
        .json({
          error:
            "The account service is temporarily unavailable. Please try again.",
        });
    }
  });

  app.get("/api/users/me", requireAuth, (req, res) => {
    res.json({ user: req.auth.user });
  });

  app.patch("/api/users/me", requireAuth, async (req, res) => {
    const { displayName, bio = "", favoriteGenres = [] } = req.body;
    if (
      typeof displayName !== "string" ||
      !displayName.trim() ||
      displayName.length > 100 ||
      typeof bio !== "string" ||
      bio.length > 1000 ||
      !Array.isArray(favoriteGenres) ||
      favoriteGenres.length > 10 ||
      favoriteGenres.some((g) => typeof g !== "string" || g.length > 60)
    )
      return res
        .status(400)
        .json({
          error:
            "Check your name, bio (max 1000 characters), and genres (max 10).",
        });
    try {
      return res.json({
        user: await updateUserProfile(req.auth.userId, {
          displayName: displayName.trim(),
          bio: bio.trim(),
          favoriteGenres: [
            ...new Set(favoriteGenres.map((g) => g.trim()).filter(Boolean)),
          ],
        }),
      });
    } catch {
      return res
        .status(503)
        .json({ error: "Unable to save your profile. Please try again." });
    }
  });

  app.get("/api/users/:username", async (req, res) => {
    try {
      const userRow = await findUserByUsername(
        req.params.username.toLowerCase(),
      );

      if (!userRow) {
        return res.status(404).json({ error: "User not found." });
      }

      return res.json({
        profile: {
          id: userRow.id,
          username: userRow.username,
          displayName: userRow.display_name,
          bio: userRow.bio,
          favoriteGenres: userRow.favorite_genres,
          followersCount: Number(userRow.followers_count),
          followingCount: Number(userRow.following_count),
        },
      });
    } catch (_error) {
      return res.status(500).json({ error: "Failed to load user profile." });
    }
  });

  app.post("/api/users/:userId/follow", requireAuth, async (req, res) => {
    const followedId = req.params.userId;

    if (req.auth.userId === followedId) {
      return res.status(400).json({ error: "Users cannot follow themselves." });
    }

    try {
      await createFollow(req.auth.userId, followedId);
      return res.status(201).json({ message: `Now following ${followedId}.` });
    } catch (error) {
      if (error.code === "23503")
        return res.status(404).json({ error: "Reader not found." });
      return res
        .status(503)
        .json({ error: "Unable to follow this reader. Please try again." });
    }
  });

  app.delete("/api/users/:userId/follow", requireAuth, async (req, res) => {
    try {
      await deleteFollow(req.auth.userId, req.params.userId);
      return res.json({ message: `Unfollowed ${req.params.userId}.` });
    } catch (_error) {
      return res.status(500).json({ error: "Failed to unfollow user." });
    }
  });

  app.get("/api/users/:userId/following", async (req, res) => {
    try {
      const following = await listFollowing(req.params.userId);
      return res.json({ userId: req.params.userId, following });
    } catch (_error) {
      return res.status(500).json({ error: "Failed to load following list." });
    }
  });

  app.use((error, _req, res, _next) => {
    res
      .status(
        error.type === "entity.parse.failed"
          ? 400
          : error.status === 413
            ? 413
            : 500,
      )
      .json({
        error:
          error.type === "entity.parse.failed"
            ? "Invalid JSON request."
            : "Unable to process this request.",
      });
  });
  return app;
}
