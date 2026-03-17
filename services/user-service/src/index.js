import express from "express";

import { requireAuth } from "./auth-middleware.js";
import { config } from "./config.js";
import { getDatabaseHealth } from "./db.js";
import { hashPassword, signToken, verifyPassword } from "./security.js";
import {
  createFollow,
  createUser,
  deleteFollow,
  findUserByEmail,
  findUserByUsername,
  listFollowing,
  mapUser,
} from "./user-repository.js";

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.CORS_ORIGIN ?? "http://localhost:3000");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

app.use(express.json());

function buildAuthResponse(user) {
  return {
    user,
    token: signToken(
      {
        sub: user.id,
        username: user.username,
      },
      config.jwtSecret,
      config.jwtExpiresInSeconds
    ),
  };
}

function validateRegisterInput({ email, username, password, displayName }) {
  if (!email || !username || !password || !displayName) {
    return "email, username, password, and displayName are required.";
  }

  if (password.length < 8) {
    return "password must be at least 8 characters.";
  }

  return null;
}

app.get("/health", async (_req, res) => {
  const database = await getDatabaseHealth();
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
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      return res.status(409).json({ error: "An account with that email already exists." });
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
      return res.status(409).json({ error: "Email or username already exists." });
    }

    return res.status(500).json({ error: "Failed to register user." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required." });
  }

  try {
    const userRow = await findUserByEmail(email.trim().toLowerCase());

    if (!userRow || !verifyPassword(password, userRow.password_hash)) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    return res.json(buildAuthResponse(mapUser(userRow)));
  } catch (_error) {
    return res.status(500).json({ error: "Failed to log in." });
  }
});

app.get("/api/users/me", requireAuth, (req, res) => {
  res.json({ user: req.auth.user });
});

app.get("/api/users/:username", async (req, res) => {
  try {
    const userRow = await findUserByUsername(req.params.username.toLowerCase());

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
  } catch (_error) {
    return res.status(500).json({ error: "Failed to follow user." });
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

app.listen(config.port, () => {
  console.log(`user-service listening on port ${config.port}`);
});
