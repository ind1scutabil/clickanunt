/**
 * Shared gate for /api/admin/* routes — server-side only.
 * Role never comes from client body/query.
 */
import { NextRequest, NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";

export type AdminApiActor = {
  id: string;
  email: string;
  role: UserRole;
};

export async function requireAdminApiPermission(
  request: NextRequest,
  permission: Permission
): Promise<
  | { ok: true; user: AdminApiActor }
  | { ok: false; response: NextResponse }
> {
  const user = await getUserFromRequest(request);
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Neautentificat" }, { status: 401 }),
    };
  }
  if (!hasPermission(user.role as UserRole, permission)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Acces interzis" }, { status: 403 }),
    };
  }
  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
    },
  };
}
