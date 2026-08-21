import { describe, expect, it } from "vitest";
import {
  isPublicSyntheticListing,
  resolveUnitPriceUah,
} from "../src/api/store/customer/orders/route";

describe("захисні перевірки синтетичного замовлення", () => {
  it("дозволяє лише опубліковані публічні visibility стани", () => {
    expect(
      isPublicSyntheticListing({
        state: "published",
        visibility: "local_demo",
        synthetic: true,
      }),
    ).toBe(true);
    expect(
      isPublicSyntheticListing({
        state: "published",
        visibility: "synthetic",
        synthetic: false,
      }),
    ).toBe(true);
    expect(
      isPublicSyntheticListing({
        state: "published",
        visibility: "internal",
        synthetic: true,
      }),
    ).toBe(false);
    expect(
      isPublicSyntheticListing({
        state: "draft",
        visibility: "local_demo",
        synthetic: true,
      }),
    ).toBe(false);
  });

  it("використовує listing price як authority перед variant fallback", () => {
    expect(
      resolveUnitPriceUah({
        price_uah: 240,
        product: {
          variants: [{ prices: [{ amount: 99999, currency_code: "uah" }] }],
        },
      }),
    ).toBe(240);
  });

  it("використовує variant price з remote product snapshot", () => {
    const listing = { price_uah: null };
    const linkedProduct = {
      variants: [
        { prices: [{ amount: 99999, currency_code: "usd" }] },
        { prices: [{ amount: 65000, currency_code: "uah" }] },
      ],
    };

    expect(resolveUnitPriceUah({ ...listing, product: linkedProduct })).toBe(
      650,
    );
  });
});
