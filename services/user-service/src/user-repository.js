import { query } from "./db.js";

export function mapUser(row) {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    favoriteGenres: row.favorite_genres,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createUser({ email, username, passwordHash, displayName }) {
  const result = await query(
    `
      INSERT INTO user_service.users (email, username, password_hash, display_name)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, username, display_name, bio, favorite_genres, created_at, updated_at
    `,
    [email, username, passwordHash, displayName]
  );

  return mapUser(result.rows[0]);
}

export async function findUserByEmail(email) {
  const result = await query(
    `
      SELECT id, email, username, password_hash, display_name, bio, favorite_genres, created_at, updated_at
      FROM user_service.users
      WHERE email = $1
    `,
    [email]
  );

  return result.rows[0] ?? null;
}

export async function findUserByUsername(username) {
  const result = await query(
    `
      SELECT
        u.id,
        u.email,
        u.username,
        u.display_name,
        u.bio,
        u.favorite_genres,
        u.created_at,
        u.updated_at,
        COALESCE(followers.followers_count, 0) AS followers_count,
        COALESCE(following.following_count, 0) AS following_count
      FROM user_service.users u
      LEFT JOIN (
        SELECT followed_id, COUNT(*) AS followers_count
        FROM user_service.follows
        GROUP BY followed_id
      ) followers ON followers.followed_id = u.id
      LEFT JOIN (
        SELECT follower_id, COUNT(*) AS following_count
        FROM user_service.follows
        GROUP BY follower_id
      ) following ON following.follower_id = u.id
      WHERE u.username = $1
    `,
    [username]
  );

  return result.rows[0] ?? null;
}

export async function findUserById(id) {
  const result = await query(
    `
      SELECT id, email, username, display_name, bio, favorite_genres, created_at, updated_at
      FROM user_service.users
      WHERE id = $1
    `,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function createFollow(followerId, followedId) {
  await query(
    `
      INSERT INTO user_service.follows (follower_id, followed_id)
      VALUES ($1, $2)
      ON CONFLICT (follower_id, followed_id) DO NOTHING
    `,
    [followerId, followedId]
  );
}

export async function deleteFollow(followerId, followedId) {
  await query(
    `
      DELETE FROM user_service.follows
      WHERE follower_id = $1 AND followed_id = $2
    `,
    [followerId, followedId]
  );
}

export async function listFollowing(userId) {
  const result = await query(
    `
      SELECT u.id, u.username, u.display_name, u.bio
      FROM user_service.follows f
      JOIN user_service.users u ON u.id = f.followed_id
      WHERE f.follower_id = $1
      ORDER BY u.username
    `,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
  }));
}

