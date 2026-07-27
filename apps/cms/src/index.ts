export type CmsFoundationMetadata = Readonly<{
  workspace: "@life/cms";
  state: "foundation";
}>;

const cmsMetadata: CmsFoundationMetadata = {
  workspace: "@life/cms",
  state: "foundation",
};

export function getCmsMetadata(): CmsFoundationMetadata {
  return cmsMetadata;
}
