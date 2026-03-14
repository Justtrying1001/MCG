import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

// __Host- prefix forces the browser to enforce: Secure=true, Path=/, no Domain.
// This prevents subdomain-based cookie injection attacks.
// Modern browsers honour __Host- on localhost without HTTPS, so dev is unaffected.
const ADMIN_SESSION_COOKIE = "__Host-mcg_admin_session";
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8;

type AdminSessionPayload = {
  username: string;
  exp: number;
};

type PasswordHashParams = {
  iterations: number;
  salt: string;
  digest: string;
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
}

function base64UrlEncode(value: string | Buffer) {
  const input = typeof value === "string" ? Buffer.from(value, "utf8") : value;
  return input.toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payloadB64: string) {
  const secret = requireEnv("ADMIN_SESSION_SECRET");
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

function parseAdminPasswordHash(value: string): PasswordHashParams {
  const parts = value.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2_sha256") {
    throw new Error("Invalid ADMIN_PASSWORD_HASH format. Expected pbkdf2_sha256$<iterations>$<salt>$<digest>");
  }

  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations <= 0) {
    throw new Error("Invalid ADMIN_PASSWORD_HASH iterations");
  }

  return {
    iterations,
    salt: parts[2],
    digest: parts[3],
  };
}

function deriveDigest(password: string, params: PasswordHashParams) {
  return pbkdf2Sync(password, params.salt, params.iterations, 32, "sha256").toString("hex");
}

export function verifyAdminCredentials(username: string, password: string) {
  const expectedUsername = requireEnv("ADMIN_USERNAME");
  const hashConfig = parseAdminPasswordHash(requireEnv("ADMIN_PASSWORD_HASH"));

  // Always derive the digest regardless of username correctness so that
  // response time is constant — prevents username enumeration via timing.
  const actualDigest = deriveDigest(password, hashConfig);
  const expectedDigest = hashConfig.digest;

  const actualBuffer = Buffer.from(actualDigest, "hex");
  const expectedBuffer = Buffer.from(expectedDigest, "hex");
  const passwordOk = actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);

  // Pad both to the same length before comparing so length differences
  // don't leak timing information.
  const maxLen = Math.max(username.length, expectedUsername.length, 1);
  const usernameOk = timingSafeEqual(
    Buffer.from(username.padEnd(maxLen)),
    Buffer.from(expectedUsername.padEnd(maxLen)),
  );

  return passwordOk && usernameOk;
}

export function createAdminPasswordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const iterations = 210000;
  const digest = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$${iterations}$${salt}$${digest}`;
}

export function createAdminSessionToken(username: string) {
  const payload: AdminSessionPayload = {
    username,
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS,
  };

  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(payloadB64);
  return `${payloadB64}.${signature}`;
}

function verifyAdminSessionToken(token: string): AdminSessionPayload | null {
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  const expectedSignature = signPayload(payloadB64);
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  if (actualBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  let payload: AdminSessionPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64)) as AdminSessionPayload;
  } catch {
    return null;
  }

  if (!payload?.username || typeof payload.exp !== "number") return null;
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null;

  const expectedUsername = process.env.ADMIN_USERNAME;
  if (!expectedUsername || payload.username !== expectedUsername) return null;

  return payload;
}

export function getAdminSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminSessionToken(token);
}

export function getAdminSessionFromCookies() {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminSessionToken(token);
}

export function getAdminSessionCookieName() {
  return ADMIN_SESSION_COOKIE;
}

export function getAdminSessionMaxAgeSeconds() {
  return ADMIN_SESSION_TTL_SECONDS;
}
