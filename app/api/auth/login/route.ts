import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

const schema = z.object({ username: z.string().trim().min(2).max(32) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return new NextResponse("Invalid username", { status: 400 });
  }

  const user = await prisma.user.upsert({
    where: { username: parsed.data.username },
    update: {},
    create: { username: parsed.data.username },
  });

  await createSession(user.id);
  return NextResponse.json({ ok: true, user: { id: user.id, username: user.username } });
}
