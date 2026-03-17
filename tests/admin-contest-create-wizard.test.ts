import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateContestCodeFromTitle } from "@/app/admin/(protected)/contests/create/_hooks/useContestWizard";

const mkdirMock = vi.fn();
const writeFileMock = vi.fn();
const adminSessionMock = vi.fn();

vi.mock("node:fs/promises", () => ({
  mkdir: mkdirMock,
  writeFile: writeFileMock,
}));

vi.mock("@/lib/admin-auth", () => ({
  getAdminSessionFromCookies: adminSessionMock,
}));

describe("contest create wizard identity", () => {
  it("generates stable uppercase admin-friendly contest codes", () => {
    expect(generateContestCodeFromTitle("Weekly Genesis Clash")).toBe("WEEKLY-GENESIS-CLASH");
    expect(generateContestCodeFromTitle(" Weekly   Genesis Clash #1 ")).toBe("WEEKLY-GENESIS-CLASH-1");
    expect(generateContestCodeFromTitle("--___")).toBe("");
  });
});

describe("contest cover upload route", () => {
  beforeEach(() => {
    vi.resetModules();
    mkdirMock.mockReset();
    writeFileMock.mockReset();
    adminSessionMock.mockReset();
    adminSessionMock.mockReturnValue({ username: "admin" });
  });

  it("returns a relative uploaded URL when filesystem write works", async () => {
    const { POST } = await import("@/app/api/internal/uploads/contest-cover/route");
    const formData = new FormData();
    formData.append("file", new File(["abc"], "cover.png", { type: "image/png" }));

    const response = await POST(new Request("http://localhost/api/internal/uploads/contest-cover", { method: "POST", body: formData }));
    const body = (await response.json()) as { url?: string };

    expect(response.status).toBe(200);
    expect(body.url).toMatch(/^\/uploads\/contests\/contest-cover-/);
    expect(mkdirMock).toHaveBeenCalledTimes(1);
    expect(writeFileMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to inline data URL when filesystem is read-only", async () => {
    writeFileMock.mockRejectedValue(Object.assign(new Error("read-only"), { code: "EROFS" }));
    const { POST } = await import("@/app/api/internal/uploads/contest-cover/route");
    const formData = new FormData();
    formData.append("file", new File(["abc"], "cover.png", { type: "image/png" }));

    const response = await POST(new Request("http://localhost/api/internal/uploads/contest-cover", { method: "POST", body: formData }));
    const body = (await response.json()) as { url?: string; warning?: string };

    expect(response.status).toBe(200);
    expect(body.url?.startsWith("data:image/png;base64,")).toBe(true);
    expect(body.warning).toContain("inline fallback storage");
  });
});
