import { createHmac, randomBytes } from "node:crypto";

const REQUEST_TOKEN_URL = "https://api.x.com/oauth/request_token";
const AUTHENTICATE_URL = "https://api.x.com/oauth/authenticate";
const ACCESS_TOKEN_URL = "https://api.x.com/oauth/access_token";
const VERIFY_CREDENTIALS_URL = "https://api.x.com/1.1/account/verify_credentials.json";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function percentEncode(value: string) {
  return encodeURIComponent(value)
    .replace(/!/g, "%21")
    .replace(/\*/g, "%2A")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/'/g, "%27");
}

function generateNonce() {
  return randomBytes(16).toString("hex");
}

function timestamp() {
  return Math.floor(Date.now() / 1000).toString();
}

function normalizeParams(params: Record<string, string>) {
  return Object.entries(params)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${percentEncode(key)}=${percentEncode(value)}`)
    .join("&");
}

function signOAuth1Request(method: string, url: string, params: Record<string, string>, tokenSecret = "") {
  const consumerSecret = requireEnv("X_CONSUMER_SECRET");
  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(normalizeParams(params)),
  ].join("&");

  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;

  return createHmac("sha1", signingKey).update(baseString).digest("base64");
}

function buildOAuthAuthorizationHeader(params: Record<string, string>) {
  const value = Object.entries(params)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, val]) => `${percentEncode(key)}="${percentEncode(val)}"`)
    .join(", ");

  return `OAuth ${value}`;
}

function parseFormEncoded(body: string) {
  const params = new URLSearchParams(body);
  return Object.fromEntries(params.entries());
}

export async function getXRequestToken() {
  const consumerKey = requireEnv("X_CONSUMER_KEY");
  const callback = requireEnv("X_REDIRECT_URI");

  const oauthParams = {
    oauth_callback: callback,
    oauth_consumer_key: consumerKey,
    oauth_nonce: generateNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp(),
    oauth_version: "1.0",
  };

  const signature = signOAuth1Request("POST", REQUEST_TOKEN_URL, oauthParams);

  const authHeader = buildOAuthAuthorizationHeader({
    ...oauthParams,
    oauth_signature: signature,
  });

  const res = await fetch(REQUEST_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: authHeader,
    },
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`X request token failed (${res.status}): ${text}`);
  }

  const payload = parseFormEncoded(text);
  if (!payload.oauth_token || !payload.oauth_token_secret) {
    throw new Error(`X request token response missing token fields: ${text}`);
  }

  return {
    oauthToken: payload.oauth_token,
    oauthTokenSecret: payload.oauth_token_secret,
  };
}

export function buildXAuthenticateUrl(oauthToken: string) {
  return `${AUTHENTICATE_URL}?oauth_token=${encodeURIComponent(oauthToken)}`;
}

export async function exchangeXAccessToken(oauthToken: string, oauthVerifier: string, oauthTokenSecret: string) {
  const consumerKey = requireEnv("X_CONSUMER_KEY");

  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: generateNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp(),
    oauth_token: oauthToken,
    oauth_verifier: oauthVerifier,
    oauth_version: "1.0",
  };

  const signature = signOAuth1Request("POST", ACCESS_TOKEN_URL, oauthParams, oauthTokenSecret);

  const authHeader = buildOAuthAuthorizationHeader({
    ...oauthParams,
    oauth_signature: signature,
  });

  const res = await fetch(ACCESS_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: authHeader,
    },
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`X access token exchange failed (${res.status}): ${text}`);
  }

  const payload = parseFormEncoded(text);
  if (!payload.oauth_token || !payload.oauth_token_secret) {
    throw new Error(`X access token response missing token fields: ${text}`);
  }

  return {
    oauthToken: payload.oauth_token,
    oauthTokenSecret: payload.oauth_token_secret,
  };
}

export async function fetchXProfile(oauthToken: string, oauthTokenSecret: string) {
  const consumerKey = requireEnv("X_CONSUMER_KEY");

  const queryParams = {
    include_entities: "false",
    skip_status: "true",
  };

  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: generateNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp(),
    oauth_token: oauthToken,
    oauth_version: "1.0",
  };

  const signature = signOAuth1Request(
    "GET",
    VERIFY_CREDENTIALS_URL,
    { ...oauthParams, ...queryParams },
    oauthTokenSecret,
  );

  const authHeader = buildOAuthAuthorizationHeader({
    ...oauthParams,
    oauth_signature: signature,
  });

  const url = new URL(VERIFY_CREDENTIALS_URL);
  Object.entries(queryParams).forEach(([key, value]) => url.searchParams.set(key, value));

  const res = await fetch(url, {
    headers: {
      Authorization: authHeader,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`X profile fetch failed (${res.status}): ${text}`);
  }

  const payload = (await res.json()) as {
    id_str: string;
    screen_name: string;
    name: string;
    profile_image_url_https?: string;
    profile_image_url?: string;
  };

  return {
    id: payload.id_str,
    username: payload.screen_name,
    name: payload.name,
    profile_image_url: payload.profile_image_url_https ?? payload.profile_image_url,
  };
}
