const PRODUCTION_SITE_URL = "https://memecardgame.com";
const LOCAL_SITE_URL = "http://localhost:3000";

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null") return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    url.pathname = url.pathname.replace(/\/$/, "");
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function getPreviewDeploymentUrl() {
  return process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL ?? null;
}

export function getProductionSiteUrl() {
  return new URL(PRODUCTION_SITE_URL);
}

export function getSiteUrl() {
  if (process.env.VERCEL_ENV === "production") {
    return getProductionSiteUrl();
  }

  if (process.env.VERCEL_ENV === "preview") {
    const previewUrl = getPreviewDeploymentUrl();
    if (previewUrl) {
      const normalizedPreview = normalizeUrl(previewUrl);
      if (normalizedPreview) return normalizedPreview;
    }
  }

  const configuredUrl = normalizeUrl(process.env.NEXT_PUBLIC_APP_URL ?? "");
  if (configuredUrl) {
    return configuredUrl;
  }

  if (process.env.NODE_ENV === "production") {
    return getProductionSiteUrl();
  }

  return new URL(LOCAL_SITE_URL);
}

export function getSiteOrigin() {
  return getSiteUrl().origin;
}

export function getCanonicalSiteUrl() {
  if (process.env.VERCEL_ENV === "preview") {
    return getSiteUrl();
  }

  if (process.env.NODE_ENV === "production") {
    return getProductionSiteUrl();
  }

  return getSiteUrl();
}

export function getCanonicalSiteOrigin() {
  return getCanonicalSiteUrl().origin;
}

export function getCanonicalHost() {
  return getCanonicalSiteUrl().host;
}
