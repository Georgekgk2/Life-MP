import { describe, expect, it } from "vitest";
import { events, people, stories } from "../src/fixtures";

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
});
