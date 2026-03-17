import { config } from "./config.js";
import { findUserById, mapUser } from "./user-repository.js";
import { verifyToken } from "./security.js";

export async function requireAuth(req, res, next) {
  const header = req.header("authorization");

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Bearer token." });
  }

  try {
    const token = header.slice("Bearer ".length);
    const payload = verifyToken(token, config.jwtSecret);
    const userRow = await findUserById(payload.sub);

    if (!userRow) {
      return res.status(401).json({ error: "User not found for token." });
    }

    req.auth = {
      userId: payload.sub,
      username: payload.username,
      user: mapUser(userRow),
    };

    return next();
  } catch (error) {
    return res.status(401).json({ error: error.message });
  }
}

