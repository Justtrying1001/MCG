import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { executePveBattle } from "@/lib/pve/executeBattle";

const schema = z.object({
  selectedCardIds: z.array(z.string()),
  difficulty: z.enum(["easy", "normal", "hard"]),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return new NextResponse("Invalid PvE payload", { status: 400 });
  }

  const res = await executePveBattle(user.id, parsed.data.selectedCardIds, parsed.data.difficulty);
  if ("error" in res) return new NextResponse(res.error, { status: res.status });
  return NextResponse.json(res.payload, { status: res.status });
}
