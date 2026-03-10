import { NextResponse } from "next/server";

export async function POST() {
  return new NextResponse("Guest PvE mode has been retired. Use /contests with an authenticated account.", { status: 410 });
}
