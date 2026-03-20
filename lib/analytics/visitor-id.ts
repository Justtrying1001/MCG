const VISITOR_ID_STORAGE_KEY = "mcg_visitor_id";
const VISITOR_ID_HEADER = "x-visitor-id";

function generateVisitorId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `visitor_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

export function getOrCreateVisitorId() {
  if (typeof window === "undefined") return null;

  const existing = window.localStorage.getItem(VISITOR_ID_STORAGE_KEY)?.trim();
  if (existing) return existing;

  const visitorId = generateVisitorId();
  window.localStorage.setItem(VISITOR_ID_STORAGE_KEY, visitorId);
  return visitorId;
}

export function getAnalyticsRequestHeaders(headers?: HeadersInit) {
  const visitorId = getOrCreateVisitorId();
  const nextHeaders = new Headers(headers);

  if (visitorId) {
    nextHeaders.set(VISITOR_ID_HEADER, visitorId);
  }

  return nextHeaders;
}

export function readVisitorIdFromRequest(request: Request) {
  const visitorId = request.headers.get(VISITOR_ID_HEADER)?.trim();
  return visitorId || null;
}

export { VISITOR_ID_HEADER, VISITOR_ID_STORAGE_KEY };
