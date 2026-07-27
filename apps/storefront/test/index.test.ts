import { describe, expect, it } from "vitest";

import { getStorefrontMetadata } from "../src/index";

describe("getStorefrontMetadata", () => {
  it("identifies the foundation workspace", () => {
    expect(getStorefrontMetadata()).toEqual({
      workspace: "@life/storefront",
      state: "foundation",
    });
  });
});
