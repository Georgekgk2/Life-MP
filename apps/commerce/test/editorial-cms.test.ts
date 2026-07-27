import { describe, it, expect } from "vitest";
import { EditorialCmsService } from "../src/services/editorial-cms";

describe("EditorialCmsService", () => {
  const service = new EditorialCmsService();

  it("returns stories referencing published fixture products", async () => {
    const stories = await service.getStories();
    expect(stories.length).toBeGreaterThan(0);
    expect(stories[0]).toHaveProperty("slug");
    expect(stories[0]).toHaveProperty("relatedProductSlugs");
  });

  it("returns guides, events, charity projects and partners", async () => {
    const guides = await service.getGuides();
    const events = await service.getEvents();
    const charity = await service.getCharityProjects();
    const partners = await service.getPartners();

    expect(guides.length).toBeGreaterThan(0);
    expect(events.length).toBeGreaterThan(0);
    expect(charity.length).toBeGreaterThan(0);
    expect(partners.length).toBeGreaterThan(0);
  });
});
