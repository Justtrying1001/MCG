import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

const DB_INIT_MESSAGE =
  "Database is not initialized yet (missing tables). Run: npx prisma db push (or use npm run vercel-build on Vercel).";

export function handleApiError(error: unknown, fallbackMessage: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2021" || error.code === "P2022") {
      return NextResponse.json({ ok: false, error: DB_INIT_MESSAGE }, { status: 503 });
    }
  }

  console.error("API error:", error);
  return NextResponse.json({ ok: false, error: fallbackMessage }, { status: 500 });
}
