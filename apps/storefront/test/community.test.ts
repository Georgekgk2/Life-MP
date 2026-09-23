import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { events, partners, people, products, stories } from "../src/fixtures";
describe("Community Fixtures & Data Integrity", () => {
  it("verifies all stories have valid hosts and linked products", () => {
    expect(stories.length).toBeGreaterThan(0);
    for (const story of stories) {
      expect(story.slug).toBeDefined();
      expect(story.title).toBeDefined();
      const host = people.find((p) => p.slug === story.personSlug);
      expect(host).toBeDefined();
      expect(story.relatedProductSlugs.length).toBeGreaterThan(0);
    }
  });

  it("verifies all events have rich metadata including location and agenda", () => {
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(event.slug).toBeDefined();
      expect(event.title).toBeDefined();
      expect(event.location).toBeDefined();
      expect(event.dateLabel).toBeDefined();
      const host = people.find((p) => p.slug === event.personSlug);
      expect(host).toBeDefined();

      if (event.agenda) {
        expect(event.agenda.length).toBeGreaterThan(0);
        for (const item of event.agenda) {
          expect(item.time).toBeDefined();
          expect(item.title).toBeDefined();
        }
      }
    }
  });

  it("verifies organizations and centers have category labels, video titles, and valid products", () => {
    expect(partners.length).toBeGreaterThanOrEqual(5);

    for (const partner of partners) {
      expect(partner.id).toMatch(/^partner-/);
      expect(partner.slug).toBeTruthy();
      expect(partner.name).toBeTruthy();
      expect(partner.summary).toBeTruthy();
      expect(partner.categoryLabel).toBeTruthy();
      expect(partner.videoTitle).toBeTruthy();
      expect(partner.videoDuration).toBeTruthy();

      if (partner.relatedProductSlugs) {
        for (const productSlug of partner.relatedProductSlugs) {
          const found = products.find((p) => p.slug === productSlug);
          expect(found).toBeDefined();
        }
      }
    }
  });

  it("verifies certified food products have valid certificates on disk", () => {
    const certifiedProducts = products.filter(
      (
        p,
      ): p is typeof p & {
        certifiedProductBadge: string;
        certificateTitle: string;
        certificateImageSrc: string;
      } =>
        "certifiedProductBadge" in p &&
        Boolean(p.certifiedProductBadge) &&
        "certificateImageSrc" in p &&
        Boolean(p.certificateImageSrc),
    );

    expect(certifiedProducts.length).toBeGreaterThan(0);
    for (const p of certifiedProducts) {
      expect(p.certifiedProductBadge).toBeTruthy();
      expect(p.certificateTitle).toBeTruthy();
      expect(p.certificateImageSrc).toBeDefined();
      const certPath = resolve(
        process.cwd(),
        "public",
        (p.certificateImageSrc ?? "").replace(/^\//, ""),
      );
      expect(existsSync(certPath)).toBe(true);
    }
  });
});
