import { model } from "@medusajs/framework/utils";

export const StaffRoleAssignment = model.define("staff_role_assignment", {
  id: model.id().primaryKey(),
  user_id: model.text().unique(),
  role: model.enum(["platform_admin", "compliance_reviewer"]),
});
