/**
 * Pagination guards for admin GET /api/users.
 */

const DEFAULT_LIMIT = 500;
const HARD_MAX = 2000;

export function resolveAdminUsersListLimit(requested: string | null): number {
  if (!requested?.trim()) {
    return DEFAULT_LIMIT;
  }
  const parsed = parseInt(requested, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_LIMIT;
  }
  return Math.min(parsed, HARD_MAX);
}

export function resolveAdminUsersOffset(requested: string | null): number {
  if (!requested?.trim()) {
    return 0;
  }
  const parsed = parseInt(requested, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}
