import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "Deprecated endpoint. Use NextAuth signIn('twitter') from the client.",
    },
    { status: 410 },
  );
}
