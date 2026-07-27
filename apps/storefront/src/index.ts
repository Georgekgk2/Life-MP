export type StorefrontFoundationMetadata = Readonly<{
  workspace: "@life/storefront";
  state: "foundation";
}>;

const storefrontMetadata: StorefrontFoundationMetadata = {
  workspace: "@life/storefront",
  state: "foundation",
};

export function getStorefrontMetadata(): StorefrontFoundationMetadata {
  return storefrontMetadata;
}
