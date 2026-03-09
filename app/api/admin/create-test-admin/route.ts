/**
 * API Route: Admin - Create Test Admin User
 * Only for development/testing purposes
 */

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import type { UserRole } from "@prisma/client";
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    // Only allow in development or with proper permissions
    const user = await getUserFromRequest(request);

    // Allow if user is admin OR if we're in development mode
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const hasPermission = user && hasPermission(user.role as UserRole, Permission.USERS_CREATE);

    if (!isDevelopment && !hasPermission) {
      return NextResponse.json(
        { error: "Acces interzis" },
        { status: 403 }
      );
    }

    const adminEmail = 'admin@clickanunt.ro';
    const adminPassword = 'Admin@2026!';

    // Check if admin already exists
    const existing = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existing) {
      return NextResponse.json({
        success: false,
        message: 'Admin user already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        name: 'Administrator',
        emailVerified: true,
      }
    });

    console.log('[CREATE-TEST-ADMIN] Admin user created:', {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role
    });

    return NextResponse.json({
      success: true,
      message: 'Admin user created successfully',
      user: {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      }
    });

  } catch (error) {
    console.error('Create test admin error:', error);
    return NextResponse.json(
      { error: "Eroare la crearea utilizatorului admin" },
      { status: 500 }
    );
  }
}