import { NextResponse } from "next/server";

export async function POST() {
  return new NextResponse("PvE mode has been retired. Use /contests for active gameplay.", { status: 410 });
}
