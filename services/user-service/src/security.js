import crypto from "crypto";

const HASH_ALGORITHM = "sha512";
const HASH_ITERATIONS = 100000;
const HASH_KEY_LENGTH = 64;

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlEncodeJson(value) {
  return base64UrlEncode(JSON.stringify(value));
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEY_LENGTH, HASH_ALGORITHM).toString("hex");

  return `pbkdf2$${HASH_ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password, storedHash) {
  const [scheme, iterations, salt, hash] = storedHash.split("$");

  if (scheme !== "pbkdf2" || !iterations || !salt || !hash) {
    return false;
  }

  const computedHash = crypto
    .pbkdf2Sync(password, salt, Number.parseInt(iterations, 10), HASH_KEY_LENGTH, HASH_ALGORITHM)
    .toString("hex");

  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(computedHash, "hex"));
}

export function signToken(payload, secret, expiresInSeconds) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const encodedHeader = base64UrlEncodeJson({ alg: "HS256", typ: "JWT" });
  const encodedPayload = base64UrlEncodeJson({
    ...payload,
    iat: issuedAt,
    exp: issuedAt + expiresInSeconds,
  });
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac("sha256", secret).update(unsignedToken).digest("base64url");

  return `${unsignedToken}.${signature}`;
}

export function verifyToken(token, secret) {
  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new Error("Invalid token format.");
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto.createHmac("sha256", secret).update(unsignedToken).digest("base64url");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new Error("Invalid token signature.");
  }

  const header = JSON.parse(base64UrlDecode(encodedHeader));
  const payload = JSON.parse(base64UrlDecode(encodedPayload));

  if (header.alg !== "HS256" || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token is expired or unsupported.");
  }

  return payload;
}

