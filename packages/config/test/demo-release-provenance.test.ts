import { describe, expect, it } from "vitest";
import { assertDemoReleaseProvenance } from "../src/demo-release-provenance.js";

const digest = "a".repeat(64);
const commit = "b".repeat(40);
const image = `ghcr.io/georgekgk2/life-commerce@sha256:${digest}`;
function envelope(
  subjectDigest = digest,
  sourceCommit = commit,
  predicateType = "https://slsa.dev/provenance/v1",
) {
  return {
    payload: Buffer.from(
      JSON.stringify({
        predicateType,
        subject: [{ digest: { sha256: subjectDigest } }],
        predicate: {
          buildDefinition: {
            resolvedDependencies: [{ digest: { gitCommit: sourceCommit } }],
          },
        },
      }),
    ).toString("base64"),
  };
}

describe("verified demo provenance semantic binding", () => {
  it("rejects a correctly shaped attestation for a different image", () => {
    expect(() =>
      assertDemoReleaseProvenance(
        JSON.stringify([envelope("c".repeat(64))]),
        image,
        commit,
      ),
    ).toThrow();
  });
  it("rejects a correctly shaped attestation for a different source commit", () => {
    expect(() =>
      assertDemoReleaseProvenance(
        JSON.stringify([envelope(digest, "c".repeat(40))]),
        image,
        commit,
      ),
    ).toThrow();
  });
  it("rejects another predicate type even when image and commit match", () => {
    expect(() =>
      assertDemoReleaseProvenance(
        JSON.stringify([envelope(digest, commit, "https://example.com/other")]),
        image,
        commit,
      ),
    ).toThrow();
  });
  it.each(["array", "json-lines"])(
    "rejects a later mismatched envelope in %s output",
    (format) => {
      const envelopes = [envelope(), envelope(digest, "c".repeat(40))];
      const output =
        format === "array"
          ? JSON.stringify(envelopes)
          : envelopes.map((value) => JSON.stringify(value)).join("\n");
      expect(() =>
        assertDemoReleaseProvenance(output, image, commit),
      ).toThrow();
    },
  );
  it.each([
    "[]",
    "{}",
    JSON.stringify([{ payload: Buffer.from("not json").toString("base64") }]),
  ])("rejects absent or malformed statement evidence %#", (output) => {
    expect(() => assertDemoReleaseProvenance(output, image, commit)).toThrow();
  });
});
