/**
 * API Route: Admin - Feature Flags Management
 */

export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import { getAllFeatureFlags, setFeatureFlag, clearFeatureFlagCache } from "@/lib/featureFlags";
import type { UserRole } from "@prisma/client";

export async function GET(request: Request) {
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

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request as any);

    // Doar OWNER poate modifica feature flags
    if (user?.role !== 'owner') {
      return NextResponse.json(
        { error: "Doar OWNER poate modifica feature flags" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { key, enabled, description } = body;

    if (!key || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: "Key și enabled sunt necesare" },
        { status: 400 }
      );
    }

    await setFeatureFlag(key, enabled, description, user.userId);

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

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request as any);

    if (user?.role !== 'owner') {
      return NextResponse.json(
        { error: "Doar OWNER poate șterge cache-ul" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    clearFeatureFlagCache(key || undefined);

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
