import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { hashPassword, signToken, verifyToken } from "../src/security.js";
import { config } from "../src/config.js";
import { pool } from "../src/db.js";
const id = "11111111-1111-4111-8111-111111111111";
const row = {
  id,
  email: "reader@example.com",
  username: "reader",
  display_name: "Reader",
  password_hash: hashPassword("correctpassword"),
  favorite_genres: [],
};
let offline = false,
  server,
  base;
const repository = {
  findUserByEmail: async (email) => {
    if (offline) throw new Error("SECRET DATABASE URL");
    return email === row.email ? row : null;
  },
  findUserById: async (userId) => {
    if (offline) throw new Error("SECRET DATABASE URL");
    return userId === id ? row : null;
  },
  mapUser: (r) => ({
    id: r.id,
    email: r.email,
    username: r.username,
    displayName: r.display_name,
  }),
  createUser: async (data) => ({
    id,
    email: data.email,
    username: data.username,
    displayName: data.displayName,
  }),
  findUserByUsername: async () => ({
    ...row,
    followers_count: 0,
    following_count: 0,
  }),
  listFollowing: async () => [],
  createFollow: async () => {},
  deleteFollow: async () => {},
  updateUserProfile: async (_id, data) => ({ id, ...data }),
};
before(async () => {
  server = createApp({
    repository,
    databaseHealth: async () => ({ status: offline ? "error" : "ok" }),
  }).listen(0, "127.0.0.1");
  await new Promise((r) => server.on("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise((r) => server.close(r));
  await pool.end();
});
async function request(path, { body, token, method } = {}) {
  const r = await fetch(base + path, {
    method: method ?? (body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, data: await r.json() };
}
test("valid credentials return an authenticated user and verifiable token", async () => {
  const r = await request("/api/auth/login", {
    body: { email: " READER@example.com ", password: "correctpassword" },
  });
  assert.equal(r.status, 200);
  assert.equal(verifyToken(r.data.token, config.jwtSecret).sub, id);
  assert.equal(r.data.user.id, id);
  assert.equal(r.data.user.password_hash, undefined);
});
test("wrong password and missing user have the same public error", async () => {
  for (const body of [
    { email: row.email, password: "incorrect" },
    { email: "nobody@example.com", password: "incorrect" },
  ]) {
    const r = await request("/api/auth/login", { body });
    assert.equal(r.status, 401);
    assert.equal(r.data.error, "Invalid email or password.");
  }
});
test("empty and invalid-type credentials return 400", async () => {
  for (const body of [
    {},
    { email: {}, password: 123 },
    { email: " ", password: "x" },
  ])
    assert.equal((await request("/api/auth/login", { body })).status, 400);
});
test("registration validates input without changing existing users", async () => {
  assert.equal(
    (
      await request("/api/auth/register", {
        body: {
          email: "bad",
          username: "r",
          password: "short",
          displayName: "R",
        },
      })
    ).status,
    400,
  );
  const r = await request("/api/auth/register", {
    body: {
      email: "new@example.com",
      username: "newreader",
      password: "longpassword",
      displayName: "New Reader",
    },
  });
  assert.equal(r.status, 201);
});
test("missing, malformed, expired and forged JWT return 401", async () => {
  for (const token of [
    undefined,
    "invalid",
    "a.b.c",
    signToken({ sub: id }, config.jwtSecret, -1),
    signToken({ sub: id }, "wrong-secret", 100),
  ])
    assert.equal((await request("/api/users/me", { token })).status, 401);
});
test("authenticated session returns private account, public profile excludes email", async () => {
  const token = signToken(
    { sub: id, username: "reader" },
    config.jwtSecret,
    60,
  );
  assert.equal((await request("/api/users/me", { token })).status, 200);
  const profile = await request("/api/users/reader");
  assert.equal(profile.status, 200);
  assert.equal(profile.data.profile.email, undefined);
});
test("database outage returns 503 instead of invalidating the token, with no secret leakage", async () => {
  offline = true;
  try {
    const token = signToken({ sub: id }, config.jwtSecret, 60);
    for (const r of [
      await request("/api/auth/login", {
        body: { email: row.email, password: "correctpassword" },
      }),
      await request("/api/users/me", { token }),
    ]) {
      assert.equal(r.status, 503);
      assert.doesNotMatch(JSON.stringify(r.data), /SECRET/);
    }
    assert.equal((await request("/health")).status, 503);
  } finally {
    offline = false;
  }
});
test("UUID input, self follow and profile changes are validated", async () => {
  const token = signToken({ sub: id }, config.jwtSecret, 60);
  assert.equal(
    (await request("/api/users/not-a-uuid/follow", { token, method: "POST" }))
      .status,
    400,
  );
  assert.equal(
    (await request(`/api/users/${id}/follow`, { token, method: "POST" }))
      .status,
    400,
  );
  assert.equal(
    (
      await request("/api/users/me", {
        token,
        method: "PATCH",
        body: { displayName: "New", bio: "Hello", favoriteGenres: ["Fiction"] },
      })
    ).status,
    200,
  );
});
test("JWT must have a subject and finite future expiration", () => {
  for (const token of [
    signToken({}, config.jwtSecret, 60),
    signToken({ sub: id }, config.jwtSecret, 0),
  ])
    assert.throws(() => verifyToken(token, config.jwtSecret));
});
