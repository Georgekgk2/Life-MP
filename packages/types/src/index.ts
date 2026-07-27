export type FoundationPackageName =
  | "@life/storefront"
  | "@life/commerce"
  | "@life/cms"
  | "@life/types"
  | "@life/config";

export type FoundationPackageMetadata<Name extends FoundationPackageName> =
  Readonly<{
    name: Name;
    state: "foundation";
  }>;
export function defineFoundationPackageMetadata<
  Name extends FoundationPackageName,
>(name: Name): FoundationPackageMetadata<Name> {
  return {
    name,
    state: "foundation",
  };
}

export type DemoAvailability = "demo-only";

export type Category<Slug extends string = string> = Readonly<{
  id: string;
  slug: Slug;
  name: string;
  description: string;
}>;

export type Product<
  CategorySlug extends string = string,
  Slug extends string = string,
> = Readonly<{
  id: string;
  slug: Slug;
  categorySlug: CategorySlug;
  name: string;
  description: string;
  priceUah: number;
  availability: DemoAvailability;
}>;

export type Person<
  ProductSlug extends string = string,
  Slug extends string = string,
> = Readonly<{
  id: string;
  slug: Slug;
  name: string;
  role: string;
  description: string;
  featuredProductSlugs: readonly ProductSlug[];
}>;

export type Story<
  PersonSlug extends string = string,
  ProductSlug extends string = string,
  Slug extends string = string,
> = Readonly<{
  id: string;
  slug: Slug;
  title: string;
  summary: string;
  personSlug: PersonSlug;
  relatedProductSlugs: readonly ProductSlug[];
}>;

export type Event<
  PersonSlug extends string = string,
  Slug extends string = string,
> = Readonly<{
  id: string;
  slug: Slug;
  title: string;
  summary: string;
  dateLabel: string;
  location: string;
  personSlug: PersonSlug;
}>;

export type CharityProject<
  PersonSlug extends string = string,
  PartnerId extends string = string,
  ProductSlug extends string = string,
  Slug extends string = string,
> = Readonly<{
  id: string;
  slug: Slug;
  title: string;
  summary: string;
  beneficiaryPersonSlug: PersonSlug;
  partnerIds: readonly PartnerId[];
  relatedProductSlugs: readonly ProductSlug[];
  status: DemoAvailability;
}>;

export type Partner<Slug extends string = string> = Readonly<{
  id: string;
  slug: Slug;
  name: string;
  summary: string;
  websiteLabel: string;
}>;
