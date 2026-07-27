import { describe, expect, it } from "vitest";

import { getToolingMetadata } from "../src/index";

describe("getToolingMetadata", () => {
  it("identifies the foundation workspace", () => {
    expect(getToolingMetadata()).toEqual({
      workspace: "@life/config",
      state: "foundation",
    });
  });
});
