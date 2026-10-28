import { config } from "./config.js";
import { findUserById, mapUser } from "./user-repository.js";
import { verifyToken } from "./security.js";
export function createRequireAuth(findUser = findUserById) {
  return async (req, res, next) => {
    const header = req.header("authorization");
    if (!header?.startsWith("Bearer "))
      return res.status(401).json({ error: "Missing Bearer token." });
    let payload;
    try {
      payload = verifyToken(header.slice(7), config.jwtSecret);
    } catch {
      return res
        .status(401)
        .json({
          error: "Your session is invalid or expired. Please sign in again.",
        });
    }
    try {
      const row = await findUser(payload.sub);
      if (!row)
        return res
          .status(401)
          .json({
            error: "Account no longer available. Please sign in again.",
          });
      req.auth = {
        userId: payload.sub,
        username: payload.username,
        user: mapUser(row),
      };
      return next();
    } catch {
      return res
        .status(503)
        .json({
          error:
            "The account service is temporarily unavailable. Please try again.",
        });
    }
  };
}
export const requireAuth = createRequireAuth();
