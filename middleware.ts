import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function getCanonicalOrigin() {
  const value = process.env.NEXT_PUBLIC_APP_URL;
  if (!value) return null;

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function getRequestHost(request: NextRequest) {
  return request.headers.get("x-forwarded-host") ?? request.nextUrl.host;
}

function isVercelPreviewDeployment(request: NextRequest) {
  if (process.env.VERCEL_ENV === "preview") {
    return true;
  }

  const deploymentHost = request.headers.get("x-vercel-deployment-url");
  return Boolean(deploymentHost && deploymentHost !== getCanonicalOrigin()?.host);
}

export function shouldEnforceCanonicalHost(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") return false;
  if (isVercelPreviewDeployment(request)) return false;

  const canonicalUrl = getCanonicalOrigin();
  if (!canonicalUrl) return false;

  const requestHost = getRequestHost(request);
  return Boolean(requestHost) && requestHost !== canonicalUrl.host;
}

function logCanonicalRedirect(request: NextRequest, destination: URL) {
  console.info(JSON.stringify({
    scope: "routing",
    event: "canonical_host_redirect",
    level: "info",
    timestamp: new Date().toISOString(),
    requestHost: getRequestHost(request),
    requestPath: request.nextUrl.pathname,
    canonicalHost: destination.host,
    destination: `${destination.pathname}${destination.search}`,
  }));
}

export function middleware(request: NextRequest) {
  if (!shouldEnforceCanonicalHost(request)) {
    return NextResponse.next();
  }

  const canonicalUrl = getCanonicalOrigin();
  if (!canonicalUrl) {
    return NextResponse.next();
  }

  const destination = new URL(request.nextUrl.pathname + request.nextUrl.search, canonicalUrl.origin);
  logCanonicalRedirect(request, destination);
  return NextResponse.redirect(destination, 308);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.[^/]+$).*)",
  ],
};
