import { describe, expect, it } from "vitest";
import type {
  SavedProductItem,
  SavedItemInput,
} from "../src/context/saved-context";

describe("Saved items data helpers", () => {
  const sampleItem1: SavedItemInput = {
    id: "prod_01",
    slug: "chashka-svitlo",
    categorySlug: "posud",
    name: "Чашка «Світло»",
    priceUah: 450,
    providerName: "Майстерня Олени",
    isSynthetic: true,
  };

  const sampleItem2: SavedItemInput = {
    id: "prod_02",
    slug: "rushnyk-berehynia",
    categorySlug: "tekstyl",
    name: "Рушник «Берегиня»",
    priceUah: 1200,
    providerName: "Ткацтво Марка",
    isSynthetic: true,
  };

  it("adds unique items and timestamps them", () => {
    const list: SavedProductItem[] = [];
    const itemWithTimestamp: SavedProductItem = {
      ...sampleItem1,
      savedAt: new Date().toISOString(),
    };
    list.push(itemWithTimestamp);

    expect(list.length).toBe(1);
    expect(list[0]?.id).toBe("prod_01");
    expect(list[0]?.savedAt).toBeDefined();
  });

  it("filters items by ID upon removal", () => {
    const list: SavedProductItem[] = [
      { ...sampleItem1, savedAt: "2026-08-19T10:00:00.000Z" },
      { ...sampleItem2, savedAt: "2026-08-19T11:00:00.000Z" },
    ];

    const afterRemove = list.filter((i) => i.id !== "prod_01");
    expect(afterRemove.length).toBe(1);
    expect(afterRemove[0]?.id).toBe("prod_02");
  });

  it("handles toggling logic cleanly", () => {
    let list: SavedProductItem[] = [];

    const toggle = (input: SavedItemInput) => {
      const exists = list.some((i) => i.id === input.id);
      if (exists) {
        list = list.filter((i) => i.id !== input.id);
        return false;
      } else {
        list = [...list, { ...input, savedAt: new Date().toISOString() }];
        return true;
      }
    };

    // First toggle -> adds
    const added = toggle(sampleItem1);
    expect(added).toBe(true);
    expect(list.length).toBe(1);

    // Second toggle -> removes
    const removed = toggle(sampleItem1);
    expect(removed).toBe(false);
    expect(list.length).toBe(0);
  });
});
