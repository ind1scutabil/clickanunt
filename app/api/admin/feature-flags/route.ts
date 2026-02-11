/**
 * API Route: Admin - Feature Flags Management
 */

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import { getAllFeatureFlags, setFeatureFlag, clearFeatureFlagCache } from "@/lib/featureFlags";
import { validateSecureRequest } from "@/lib/security/middleware";
import { z } from "zod";
import type { UserRole } from "@prisma/client";

const featureFlagSchema = z.object({
  key: z.string().min(1),
  enabled: z.boolean(),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request as any);

    if (!user || !hasPermission(user.role as UserRole, Permission.SETTINGS_VIEW)) {
      return NextResponse.json(
        { error: "Acces interzis" },
        { status: 403 }
      );
    }

    const flags = await getAllFeatureFlags();

    return NextResponse.json({
      success: true,
      flags,
    });
  } catch (error) {
    console.error('Get feature flags error:', error);
    return NextResponse.json(
      { error: "Eroare la obținerea feature flags" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request as any);

    // Doar OWNER poate modifica feature flags
    if (user?.role !== 'owner') {
      return NextResponse.json(
        { error: "Doar OWNER poate modifica feature flags" },
        { status: 403 }
      );
    }

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      schema: featureFlagSchema,
    });

    if (!security.success) {
      const status = security.csrfError ? 403 : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const { key, enabled, description } = security.data as {
      key: string;
      enabled: boolean;
      description?: string;
    };

    await setFeatureFlag(key, enabled, description, user.id);

    return NextResponse.json({
      success: true,
      message: "Feature flag actualizat cu succes",
    });
  } catch (error) {
    console.error('Set feature flag error:', error);
    return NextResponse.json(
      { error: "Eroare la actualizarea feature flag" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request as any);

    if (user?.role !== 'owner') {
      return NextResponse.json(
        { error: "Doar OWNER poate șterge feature flags" },
        { status: 403 }
      );
    }

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
    });

    if (!security.success) {
      const status = security.csrfError ? 403 : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    clearFeatureFlagCache();

    return NextResponse.json({
      success: true,
      message: key ? `Cache cleared pentru ${key}` : 'Cache-ul global a fost șters',
    });
  } catch (error) {
    console.error('Clear cache error:', error);
    return NextResponse.json(
      { error: "Eroare la ștergerea cache-ului" },
      { status: 500 }
    );
  }
}
