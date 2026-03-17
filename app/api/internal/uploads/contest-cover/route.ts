import { NextResponse } from "next/server";

import { getAdminSessionFromCookies } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const admin = getAdminSessionFromCookies();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(
    {
      error: "File upload is no longer supported. Select a built-in /public image or provide a custom URL.",
    },
    { status: 410 },
  );
}
