import { NextResponse } from "next/server";
import { getPackOpeningOdds } from "@/lib/cards";

export async function GET() {
  return NextResponse.json({
    packModel: "base_v2_slots",
    odds: getPackOpeningOdds(),
  });
}
