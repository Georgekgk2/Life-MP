import { describe, expect, it } from "vitest";
import {
  FAQ_TOPICS,
  FAQ_KNOWLEDGE_VERSION,
} from "../src/data/faq-assistant-data";
import { categories, people } from "../src/fixtures";

describe("FAQ Assistant Knowledge Base Consistency", () => {
  it("defines explicit version string", () => {
    expect(FAQ_KNOWLEDGE_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.v\d+$/);
  });

  it("contains 5 valid topics with required fields and valid route links", () => {
    expect(FAQ_TOPICS).toHaveLength(5);
    for (const topic of FAQ_TOPICS) {
      expect(topic.id).toBeTruthy();
      expect(topic.question.endsWith("?")).toBe(true);
      expect(topic.answer.length).toBeGreaterThan(20);
      if (topic.link) {
        expect(topic.link.href.startsWith("/")).toBe(true);
        expect(topic.link.label).toBeTruthy();
      }
    }
  });

  it("dynamically stays in sync with categories fixture (zero drift)", () => {
    const catalogTopic = FAQ_TOPICS.find((t) => t.id === "catalog");
    expect(catalogTopic).toBeDefined();
    expect(catalogTopic?.answer).toContain(
      `представлено ${categories.length} тематичних напрямів`,
    );
    for (const cat of categories) {
      expect(catalogTopic?.answer).toContain(cat.name);
    }
  });

  it("dynamically stays in sync with people fixture (zero drift)", () => {
    const artisanTopic = FAQ_TOPICS.find((t) => t.id === "artisans");
    expect(artisanTopic).toBeDefined();
    for (const person of people) {
      expect(artisanTopic?.answer).toContain(person.name);
      if (person.region) {
        expect(artisanTopic?.answer).toContain(person.region);
      }
    }
  });
});
