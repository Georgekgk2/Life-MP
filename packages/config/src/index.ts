export type ToolingFoundationMetadata = Readonly<{
  workspace: "@life/config";
  state: "foundation";
}>;

const toolingMetadata: ToolingFoundationMetadata = {
  workspace: "@life/config",
  state: "foundation",
};

export function getToolingMetadata(): ToolingFoundationMetadata {
  return toolingMetadata;
}

export {
  scanDeploymentContainment,
  type DeploymentContainmentViolation,
  type DeploymentContainmentResult,
  type DeploymentPolicyFile,
} from "./deployment-containment.js";
