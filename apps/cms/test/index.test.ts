import { describe, expect, it } from "vitest";

import { getCmsMetadata } from "../src/index";

describe("getCmsMetadata", () => {
  it("identifies the foundation workspace", () => {
    expect(getCmsMetadata()).toEqual({
      workspace: "@life/cms",
      state: "foundation",
    });
  });
});
