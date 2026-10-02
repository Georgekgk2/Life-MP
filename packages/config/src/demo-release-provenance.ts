import { z } from "zod";

const envelopeSchema = z
  .array(z.object({ payload: z.string().min(1) }).passthrough())
  .min(1);
const statementSchema = z
  .object({
    predicateType: z.literal("https://slsa.dev/provenance/v1"),
    subject: z
      .array(
        z.object({
          digest: z.object({ sha256: z.string().regex(/^[a-f0-9]{64}$/) }),
        }),
      )
      .min(1),
    predicate: z
      .object({
        buildDefinition: z
          .object({
            resolvedDependencies: z.array(
              z
                .object({
                  digest: z
                    .object({ gitCommit: z.string().optional() })
                    .passthrough(),
                })
                .passthrough(),
            ),
          })
          .passthrough(),
      })
      .passthrough(),
  })
  .passthrough();

/** Only call after successful Cosign signature/issuer/workflow verification. */
export function assertDemoReleaseProvenance(
  output: string,
  image: string,
  sourceCommit: string,
): void {
  let envelopes: unknown;
  try {
    const parsed: unknown = JSON.parse(output);
    envelopes = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    // Cosign versions emit either a JSON array or one envelope per line.
    envelopes = output
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
  const digest = image.match(/@sha256:([a-f0-9]{64})$/)?.[1];
  if (!digest) throw new Error("Expected an immutable image digest.");
  for (const envelope of envelopeSchema.parse(envelopes)) {
    const decoded = statementSchema.parse(
      JSON.parse(Buffer.from(envelope.payload, "base64").toString("utf8")),
    );
    if (
      !decoded.subject.some((subject) => subject.digest.sha256 === digest) ||
      !decoded.predicate.buildDefinition.resolvedDependencies.some(
        (dependency) => dependency.digest.gitCommit === sourceCommit,
      )
    ) {
      throw new Error(
        "Verified provenance does not bind the approved image and source commit.",
      );
    }
  }
}
