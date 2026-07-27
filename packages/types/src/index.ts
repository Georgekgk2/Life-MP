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
