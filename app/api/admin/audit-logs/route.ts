/**
 * API Route: Admin - Audit Logs
 */

export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import { getAuditLogs, exportAuditLogsToCSV } from "@/lib/audit";
import type { UserRole } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request as any);

    if (!user || !hasPermission(user.role as UserRole, Permission.AUDIT_LOGS_VIEW)) {
      return NextResponse.json(
        { error: "Acces interzis" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const exportCsv = searchParams.get('export') === 'csv';

    // CSV export - doar OWNER și FINANCE
    if (exportCsv) {
      if (!hasPermission(user.role as UserRole, Permission.AUDIT_LOGS_EXPORT)) {
        return NextResponse.json(
          { error: "Nu ai permisiune să exporți audit logs" },
          { status: 403 }
        );
      }

      const filters: Record<string, unknown> = {};
      if (userId) filters.userId = userId;
      if (action) filters.action = action;
      if (entityType) filters.entityType = entityType;
      if (entityId) filters.entityId = entityId;
      if (from) filters.from = new Date(from);
      if (to) filters.to = new Date(to);

      const csv = await exportAuditLogsToCSV(filters as any);

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString()}.csv"`,
        },
      });
    }

    // Regular GET
    const filters: Record<string, unknown> = {};
    if (userId) filters.userId = userId;
    if (action) filters.action = action;
    if (entityType) filters.entityType = entityType;
    if (entityId) filters.entityId = entityId;
    if (from) filters.startDate = new Date(from);
    if (to) filters.endDate = new Date(to);
    filters.limit = limit;
    filters.offset = offset;

    const { logs, total } = await getAuditLogs(filters);

    return NextResponse.json({
      success: true,
      logs,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return NextResponse.json(
      { error: "Eroare la obținerea audit logs" },
      { status: 500 }
    );
  }
}
