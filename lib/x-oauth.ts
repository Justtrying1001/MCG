import { createHash, randomBytes } from "node:crypto";

const AUTH_URL = "https://x.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.x.com/2/oauth2/token";
const USER_ME_URL = "https://api.x.com/2/users/me?user.fields=profile_image_url,name,username";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function base64Url(input: Buffer) {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function buildXAuthRequest() {
  const clientId = requireEnv("X_CLIENT_ID");
  const redirectUri = requireEnv("X_REDIRECT_URI");

  const state = base64Url(randomBytes(24));
  const codeVerifier = base64Url(randomBytes(48));
  const codeChallenge = base64Url(createHash("sha256").update(codeVerifier).digest());

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "tweet.read users.read",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return {
    state,
    codeVerifier,
    url: `${AUTH_URL}?${params.toString()}`,
  };
}

export async function exchangeXCodeForToken(code: string, codeVerifier: string) {
  const clientId = requireEnv("X_CLIENT_ID");
  const clientSecret = requireEnv("X_CLIENT_SECRET");
  const redirectUri = requireEnv("X_REDIRECT_URI");

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`X token exchange failed (${res.status}): ${text}`);
  }

  return (await res.json()) as { access_token: string };
}

export async function fetchXProfile(accessToken: string) {
  const res = await fetch(USER_ME_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`X profile fetch failed (${res.status}): ${text}`);
  }

  const payload = (await res.json()) as {
    data: { id: string; username: string; name: string; profile_image_url?: string };
  };

  return payload.data;
}
