import { NextResponse } from "next/server";

function parseHeaderUrl(value: string | null) {
  if (!value) return null;

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function getRequestOrigin(request: Request) {
  return new URL(request.url).origin;
}

export function enforceSameOrigin(request: Request) {
  const requestOrigin = getRequestOrigin(request);
  const originHeader = parseHeaderUrl(request.headers.get("origin"));

  if (originHeader) {
    if (originHeader.origin === requestOrigin) {
      return null;
    }

    return NextResponse.json({ ok: false, error: "Cross-site request blocked" }, { status: 403 });
  }

  const refererHeader = parseHeaderUrl(request.headers.get("referer"));
  if (refererHeader) {
    if (refererHeader.origin === requestOrigin) {
      return null;
    }

    return NextResponse.json({ ok: false, error: "Cross-site request blocked" }, { status: 403 });
  }

  return NextResponse.json({ ok: false, error: "Missing same-origin header" }, { status: 403 });
}
