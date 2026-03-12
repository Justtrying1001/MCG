import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    adminOpArtifact: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { getAdminArtifact } from "@/lib/admin-ops";

describe("admin artifact expiry behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null and deletes expired artifacts", async () => {
    prismaMock.adminOpArtifact.delete.mockResolvedValue({});
    prismaMock.adminOpArtifact.findUnique.mockResolvedValue({
      id: "a1",
      artifactType: "contest_scoring_import",
      expiresAt: new Date(Date.now() - 10_000),
    });

    const result = await getAdminArtifact("a1", "contest_scoring_import");
    expect(result).toBeNull();
    expect(prismaMock.adminOpArtifact.delete).toHaveBeenCalledWith({ where: { id: "a1" } });
  });
});
