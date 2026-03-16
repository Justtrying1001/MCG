import { describe, expect, it } from "vitest";

import fs from "node:fs";
import path from "node:path";

describe("rewards ui messages", () => {
  it("does not include deprecated auto-validation info message", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "app/rewards/page.tsx"), "utf8");
    expect(source).not.toContain("Action detected. Auto-validation runs in 60 seconds.");
  });
});
