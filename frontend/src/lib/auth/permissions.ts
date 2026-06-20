import { Role } from "./auth.config";

export const PERMISSIONS = {
  MANAGE_USERS:       ["super_admin", "admin"],
  MANAGE_ITEMS:       ["super_admin", "admin", "manager"],
  DELETE_ITEMS:       ["super_admin", "admin"],
  CREATE_GRN:         ["super_admin", "admin", "manager", "store_keeper"],
  APPROVE_GRN:        ["super_admin", "admin", "manager"],
  CREATE_PO:          ["super_admin", "admin", "manager", "procurement"],
  APPROVE_PO:         ["super_admin", "admin", "manager"],
  ISSUE_STOCK:        ["super_admin", "admin", "manager", "store_keeper"],
  STOCK_ADJUSTMENT:   ["super_admin", "admin", "manager"],
  VIEW_REPORTS:       ["super_admin", "admin", "manager", "procurement", "viewer"],
  EXPORT_DATA:        ["super_admin", "admin", "manager", "procurement"],
  MANAGE_SETTINGS:    ["super_admin", "admin"],
  MANAGE_VENDORS:     ["super_admin", "admin", "manager", "procurement"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}
