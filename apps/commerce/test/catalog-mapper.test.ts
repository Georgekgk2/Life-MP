import { describe, expect, it } from "vitest";
import { mapPublicCatalog } from "../src/api/store/catalog/mapper";

describe("публічний мапер каталогу", () => {
  it("використовує ціну listing, а не недовірену ціну variant", () => {
    const snapshot = mapPublicCatalog(
      [
        {
          id: "listing-1",
          vendor_id: "vendor-1",
          title: "Чай Лісовий",
          description: "Демо-товар",
          synthetic: true,
          price_uah: 240,
          product: {
            id: "product-1",
            handle: "chai-lisovyi",
            title: "Чай Лісовий",
            categories: [
              { id: "category-1", handle: "maisterni", name: "Майстерні" },
            ],
            variants: [
              {
                prices: [{ amount: 99999, currency_code: "uah" }],
              },
            ],
          },
        },
      ],
      new Map([
        ["vendor-1", { handle: "polissia-craft", name: "Полісся Крафт" }],
      ]),
    );

    expect(snapshot.products).toHaveLength(1);
    expect(snapshot.products[0]?.priceUah).toBe(240);
  });

  it("не публікує listing без ціни UAH і не залишає порожню категорію", () => {
    const snapshot = mapPublicCatalog(
      [
        {
          id: "listing-without-price",
          vendor_id: "vendor-1",
          title: "Без ціни",
          synthetic: true,
          product: {
            id: "product-without-price",
            handle: "without-price",
            categories: [
              { id: "category-1", handle: "maisterni", name: "Майстерні" },
            ],
            variants: [{ prices: [] }],
          },
        },
      ],
      new Map([["vendor-1", { handle: "vendor", name: "Виробник" }]]),
    );

    expect(snapshot.products).toEqual([]);
    expect(snapshot.categories).toEqual([]);
  });

  it("шукає fallback-ціну UAH у всіх variants", () => {
    const snapshot = mapPublicCatalog(
      [
        {
          id: "listing-later-variant",
          vendor_id: "vendor-1",
          title: "Чай із fallback ціною",
          synthetic: true,
          product: {
            id: "product-later-variant",
            handle: "tea-later-variant",
            variants: [
              { prices: [{ amount: 99999, currency_code: "usd" }] },
              { prices: [{ amount: 65000, currency_code: "uah" }] },
            ],
          },
        },
      ],
      new Map([["vendor-1", { handle: "vendor", name: "Виробник" }]]),
    );

    expect(snapshot.products[0]?.priceUah).toBe(650);
  });

  it("віддає thumbnail перед gallery і нормалізує пробіли", () => {
    const snapshot = mapPublicCatalog(
      [
        {
          id: "listing-thumbnail",
          vendor_id: "vendor-1",
          price_uah: 120,
          product: {
            handle: "product-thumbnail",
            thumbnail: "  /images/products/thumbnail.webp  ",
            images: [{ url: "/images/products/gallery.webp" }],
          },
        },
      ],
      new Map([["vendor-1", { handle: "vendor", name: "Виробник" }]]),
    );

    expect(snapshot.products[0]?.imageSrc).toBe(
      "/images/products/thumbnail.webp",
    );
  });

  it("пропускає порожні gallery entries і бере перший валідний URL", () => {
    const snapshot = mapPublicCatalog(
      [
        {
          id: "listing-gallery",
          vendor_id: "vendor-1",
          price_uah: 120,
          product: {
            handle: "product-gallery",
            images: [
              { url: "   " },
              { alt: "без URL" },
              { url: "  https://cdn.example.test/product.webp " },
            ],
          },
        },
      ],
      new Map([["vendor-1", { handle: "vendor", name: "Виробник" }]]),
    );

    expect(snapshot.products[0]?.imageSrc).toBe(
      "https://cdn.example.test/product.webp",
    );
  });
});
