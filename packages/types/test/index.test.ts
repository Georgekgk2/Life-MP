import { describe, expect, it } from "vitest";

import { defineFoundationPackageMetadata } from "../src/index";

describe("defineFoundationPackageMetadata", () => {
  it("preserves a package name in its metadata", () => {
    expect(defineFoundationPackageMetadata("@life/types")).toEqual({
      name: "@life/types",
      state: "foundation",
    });
  });
});
