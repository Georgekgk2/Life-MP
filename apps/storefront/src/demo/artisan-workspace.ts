import { z } from "zod";

import {
  vendorCategoryOptions,
  vendorProductSchema,
} from "@/schema/vendor-product";

export const artisanDemoDraftSchema = vendorProductSchema
  .pick({
    name: true,
    categorySlug: true,
    description: true,
    priceUah: true,
  })
  .strict();

export type ArtisanDemoDraftInput = z.infer<typeof artisanDemoDraftSchema>;
export type ArtisanDemoCategorySlug = ArtisanDemoDraftInput["categorySlug"];
export type ArtisanDemoListingStatus =
  "draft" | "in_review" | "changes_requested";

export type ArtisanDemoListing = ArtisanDemoDraftInput & {
  id: string;
  status: ArtisanDemoListingStatus;
};

export const artisanDemoProfile = {
  name: "Майстерня «Тепла оселя»",
  description: "Синтетичний профіль для демонстрації каталогу майстра.",
} as const;

export const artisanDemoListings = [
  {
    id: "demo-listing-draft",
    name: "Чашка «Тихий ранок»",
    categorySlug: "dim",
    description:
      "Керамічна чашка ручної роботи, зручна форма для щоденного чаювання.",
    priceUah: 480,
    status: "draft",
  },
  {
    id: "demo-listing-review",
    name: "Лляний шопер «Тиха неділя»",
    categorySlug: "odiah",
    description:
      "Містка тканинна торба з широкими ручками, приклад виробу для каталогу.",
    priceUah: 620,
    status: "in_review",
  },
  {
    id: "demo-listing-changes",
    name: "Набір свічок «Липневий сад»",
    categorySlug: "podarunky",
    description: "Демонстраційний набір із трьох свічок у матових склянках.",
    priceUah: 540,
    status: "changes_requested",
  },
] satisfies readonly ArtisanDemoListing[];

export const artisanDemoStatusLabels: Record<ArtisanDemoListingStatus, string> =
  {
    draft: "Чернетка",
    in_review: "На перевірці",
    changes_requested: "Потрібні зміни",
  };

export function isArtisanDemoCategorySlug(
  value: string,
): value is ArtisanDemoCategorySlug {
  return vendorCategoryOptions.some((option) => option.value === value);
}
