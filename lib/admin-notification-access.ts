import type { UserRole } from "@prisma/client";
import { hasPermission, Permission } from "@/lib/rbac";

/** Staff roles that can open the admin notification APIs / UI */
export function canAccessAdminNotifications(role: UserRole | string): boolean {
  return (
    hasPermission(role, Permission.MODERATION_VIEW_QUEUE) ||
    hasPermission(role, Permission.REPORTS_VIEW) ||
    hasPermission(role, Permission.PAYMENTS_VIEW_ALL) ||
    hasPermission(role, Permission.SETTINGS_VIEW) ||
    hasPermission(role, Permission.AUDIT_LOGS_VIEW)
  );
}
