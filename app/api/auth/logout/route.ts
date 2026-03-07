import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "Deprecated endpoint. Use NextAuth signOut() from the client.",
    },
    { status: 410 },
  );
}
