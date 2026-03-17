import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { getAdminSessionFromCookies } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024;

function toDataUrl(blob: Blob) {
  const mimeType = blob.type || "application/octet-stream";
  return blob.arrayBuffer().then((buffer) => `data:${mimeType};base64,${Buffer.from(buffer).toString("base64")}`);
}

function isReadOnlyStorageError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const code = "code" in error ? String((error as NodeJS.ErrnoException).code ?? "") : "";
  return code === "EROFS" || code === "EPERM" || code === "EACCES";
}

export async function POST(request: Request) {
  try {
    const admin = getAdminSessionFromCookies();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Unsupported image format", detail: "Use PNG, JPEG, WEBP, or GIF." }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image is too large (max 5 MB)" }, { status: 400 });
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "image/gif" ? "gif" : "jpg";
    const fileName = `contest-cover-${randomUUID()}.${ext}`;
    const relativePath = `/uploads/contests/${fileName}`;
    const outputDir = path.join(process.cwd(), "public", "uploads", "contests");

    try {
      await mkdir(outputDir, { recursive: true });
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(path.join(outputDir, fileName), buffer);
      return NextResponse.json({ url: relativePath });
    } catch (storageError) {
      if (isReadOnlyStorageError(storageError)) {
        const inlineDataUrl = await toDataUrl(file);
        return NextResponse.json({
          url: inlineDataUrl,
          warning: "Cover image uploaded using inline fallback storage (filesystem is read-only in this environment).",
        });
      }

      if (storageError instanceof Error) {
        return NextResponse.json({ error: "Image upload failed", detail: storageError.message }, { status: 500 });
      }

      return NextResponse.json({ error: "Image upload failed" }, { status: 500 });
    }
  } catch (error) {
    return handleApiError(error, "Image upload failed");
  }
}
